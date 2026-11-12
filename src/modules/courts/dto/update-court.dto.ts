import { PartialType } from '@nestjs/mapped-types';
import { CreateCourtDto } from './create-court.dto.js';

export class UpdateCourtDto extends PartialType(CreateCourtDto) {}
