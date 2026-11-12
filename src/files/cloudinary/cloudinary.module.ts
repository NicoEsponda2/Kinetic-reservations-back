import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service.js';
import { CloudinaryController } from './cloudinary.controller.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [CloudinaryController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // <-- Esto hace que ConfigService esté disponible en todo el proyecto
      envFilePath: '.env',
    }),
    // ... tus otros módulos (SportsModule, etc.)
  ],
})
export class CloudinaryModule {}
