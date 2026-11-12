import { Controller } from '@nestjs/common';
import { CourtsService } from './courts.service.js';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Canchas')
@Controller('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}
}
