import { BadRequestException } from '@nestjs/common';

/**
 * Valida que el archivo recibido corresponda a un formato de imagen permitido (`jpeg`, `jpg`, `png`, `gif` o `webp`).
 *
 * @param req Objeto de la petición HTTP entrante de Express.
 * @param file Archivo interceptado por Multer cuya extensión será evaluada.
 * @param callback Función de retorno de Multer que indica si el archivo es aceptado o rechazado.
 * @returns Ejecución del callback indicando con un booleano si el archivo cumple el filtro.
 */
export const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  callback: Function,
) => {
  if (!file) return callback(new Error('No file provided'), false);

  const fileExtension = file.mimetype.split('/')[1]?.toLowerCase();

  const validExtensions = ['jpeg', 'jpg', 'png', 'gif', 'webp'];

  if (fileExtension && validExtensions.includes(fileExtension)) {
    return callback(null, true);
  }

  callback(null, false);
};

/**
 * Verifica que los primeros bytes del archivo (magic bytes) correspondan a una imagen real (JPEG, PNG, GIF o WEBP).
 */
export function assertValidImageMagicBytes(buffer?: Buffer): void {
  if (!buffer || buffer.length < 12) {
    throw new BadRequestException('El archivo de imagen está vacío o corrupto');
  }

  const isJpeg =
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  const isGif =
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38;
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (!isJpeg && !isPng && !isGif && !isWebp) {
    throw new BadRequestException(
      'El contenido binario del archivo no corresponde a una imagen válida (JPEG, PNG, GIF o WEBP)',
    );
  }
}
