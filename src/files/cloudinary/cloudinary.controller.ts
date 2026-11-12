import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CloudinaryService } from './cloudinary.service.js';

@ApiTags('Almacenamiento en Cloudinary')
@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}
}
