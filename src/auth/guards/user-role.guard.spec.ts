import { describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRoleGuard } from './user-role.guard.js';
import { SeedService } from '../../seed/seed.service.js';
import { ServerCacheService } from '../../common/cache/server-cache.service.js';

describe('UserRoleGuard, SeedService y ServerCacheService - Control de Acceso y Aislamiento', () => {
  describe('UserRoleGuard (RBAC)', () => {
    const createRoleContext = (user: unknown) =>
      ({
        getHandler: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      }) as unknown as ExecutionContext;

    it('debe rechazar con ForbiddenException (403) a un usuario con rol "user" en una ruta exclusiva de "admin"', () => {
      const reflector = {
        get: vi.fn().mockReturnValue(['admin']),
      } as unknown as Reflector;
      const guard = new UserRoleGuard(reflector);

      const ctx = createRoleContext({
        id_usuario: 'user-1',
        nombre: 'Juan',
        roles: ['user'],
      });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('debe lanzar BadRequestException si la petición llega sin entidad de usuario autenticada', () => {
      const reflector = {
        get: vi.fn().mockReturnValue(['admin']),
      } as unknown as Reflector;
      const guard = new UserRoleGuard(reflector);

      const ctx = createRoleContext(undefined);

      expect(() => guard.canActivate(ctx)).toThrow(BadRequestException);
    });

    it('debe permitir el acceso cuando el usuario posee el rol requerido ("admin")', () => {
      const reflector = {
        get: vi.fn().mockReturnValue(['admin']),
      } as unknown as Reflector;
      const guard = new UserRoleGuard(reflector);

      const ctx = createRoleContext({
        id_usuario: 'admin-1',
        nombre: 'Admin',
        roles: ['user', 'admin'],
      });

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('SeedService (Protección de Entorno Productivo)', () => {
    it('debe bloquear la ejecución destructiva de runSeed() cuando NODE_ENV === "production"', async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const seedService = new SeedService(
          {} as any,
          {} as any,
          {} as any,
          {} as any,
          {} as any,
        );
        await expect(seedService.runSeed()).rejects.toThrow(ForbiddenException);
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });
  });

  describe('ServerCacheService (Aislamiento de Sesión SHA-256)', () => {
    it('debe generar claves de caché aisladas con hash SHA-256 de 64 caracteres hexadecimales por token', () => {
      const cache = new ServerCacheService();
      const keyUserA = cache.buildKey(
        '/api/admin/dashboard',
        'Bearer token-usuario-a',
        false,
      );
      const keyUserB = cache.buildKey(
        '/api/admin/dashboard',
        'Bearer token-usuario-b',
        false,
      );

      expect(keyUserA).not.toBe(keyUserB);
      expect(keyUserA).toMatch(/^usr:[a-f0-9]{64}\|\/api\/admin\/dashboard$/);
    });
  });
});
