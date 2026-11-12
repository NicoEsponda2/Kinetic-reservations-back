import { PartialType } from '@nestjs/swagger';
import {
  CreateSportDto,
  CreateSportMultipartDto,
} from './create-sport.dto.js';

export class UpdateSportDto extends PartialType(CreateSportDto) {}

export class UpdateSportMultipartDto extends PartialType(
  CreateSportMultipartDto,
) {}
