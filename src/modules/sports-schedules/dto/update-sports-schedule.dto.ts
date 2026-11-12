import { PartialType } from '@nestjs/mapped-types';
import { CreateSportsScheduleDto } from './create-sports-schedule.dto.js';

export class UpdateSportsScheduleDto extends PartialType(CreateSportsScheduleDto) {}
