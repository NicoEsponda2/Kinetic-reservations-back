import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { assertValidImageMagicBytes, fileFilter } from './filter.js';

describe('File Upload Security Helpers (filter.ts)', () => {
  describe('fileFilter', () => {
    it('debe rechazar cuando no se proporciona ningún archivo', () => {
      const callback = vi.fn();
      fileFilter({} as any, undefined as any, callback);

      expect(callback).toHaveBeenCalledWith(expect.any(Error), false);
    });

    it.each([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ])('debe aceptar archivos con mimetype permitido (%s)', (mimetype) => {
      const callback = vi.fn();
      const mockFile = { mimetype } as Express.Multer.File;

      fileFilter({} as any, mockFile, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it.each([
      'application/x-msdownload',
      'text/html',
      'application/javascript',
      'image/svg+xml',
      'application/pdf',
    ])('debe rechazar archivos con mimetype no permitido (%s)', (mimetype) => {
      const callback = vi.fn();
      const mockFile = { mimetype } as Express.Multer.File;

      fileFilter({} as any, mockFile, callback);

      expect(callback).toHaveBeenCalledWith(null, false);
    });
  });

  describe('assertValidImageMagicBytes', () => {
    it('debe lanzar BadRequestException si el buffer es nulo o menor a 12 bytes', () => {
      expect(() => assertValidImageMagicBytes(undefined)).toThrow(
        BadRequestException,
      );
      expect(() => assertValidImageMagicBytes(Buffer.from([0xff, 0xd8]))).toThrow(
        BadRequestException,
      );
    });

    it('debe aceptar un buffer con firma binaria JPEG válida (FF D8 FF)', () => {
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      expect(() => assertValidImageMagicBytes(jpegBuffer)).not.toThrow();
    });

    it('debe aceptar un buffer con firma binaria PNG válida (89 50 4E 47)', () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      expect(() => assertValidImageMagicBytes(pngBuffer)).not.toThrow();
    });

    it('debe aceptar un buffer con firma binaria GIF válida (47 49 46 38)', () => {
      const gifBuffer = Buffer.from('GIF89a000000', 'ascii');
      expect(() => assertValidImageMagicBytes(gifBuffer)).not.toThrow();
    });

    it('debe aceptar un buffer con firma binaria WEBP válida (RIFF....WEBP)', () => {
      const webpBuffer = Buffer.from('RIFF\x00\x00\x00\x00WEBP', 'binary');
      expect(() => assertValidImageMagicBytes(webpBuffer)).not.toThrow();
    });

    it('debe rechazar un ejecutable o script camuflado como imagen', () => {
      const fakePngBuffer = Buffer.from(
        '#!/bin/bash\nrm -rf /\n',
        'utf-8',
      );
      expect(() => assertValidImageMagicBytes(fakePngBuffer)).toThrow(
        BadRequestException,
      );
    });
  });
});
