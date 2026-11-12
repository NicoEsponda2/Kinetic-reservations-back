import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    // Configuramos Cloudinary utilizando ConfigService para leer el .env de forma profesional
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Sube un archivo recibido en memoria por Multer hacia el almacenamiento en Cloudinary.
   *
   * @param file Archivo recibido por Multer con su contenido en memoria (`buffer`).
   * @param folder Carpeta de destino en Cloudinary donde se almacenará el archivo.
   * @returns Promesa con la respuesta de subida o error devuelta por Cloudinary.
   */
  uploadFile(
    file: Express.Multer.File,
    folder: string = 'KINETIC-RESERVATIONS/servicios',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    // --- DEPURACIÓN (Útil para verificar que el buffer viaja correctamente) ---
    console.log('📦 Archivo recibido en CloudinaryService:', {
      fieldname: file?.fieldname,
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
      hasBuffer: !!file?.buffer,
    });
    // --------------------------------------------------------------------------

    return new Promise((resolve, reject) => {
      if (!file || !file.buffer) {
        return reject(
          new BadRequestException(
            'El archivo no contiene un buffer válido para subir a Cloudinary',
          ),
        );
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto', // Detecta automáticamente si es imagen, video, etc.
        },
        (error, result) => {
          if (error) {
            console.error('❌ Error interno de Cloudinary:', error);
            return reject(error);
          }
          resolve(result!);
        },
      );

      // Convierte el buffer en memoria a un flujo de lectura y lo transmite a Cloudinary
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}