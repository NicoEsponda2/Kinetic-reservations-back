import {
  IsInt,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Matches,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateSportsScheduleDto {
  @ApiProperty({ format: 'uuid', description: 'UUID del deporte.' })
  @IsString()
  @IsNotEmpty()
  id_deporte: string;

  @ApiProperty({ minimum: 1, maximum: 7, description: 'Día de la semana según esta ruta.' })
  @IsInt()
  @Min(1)
  @Max(7)
  @IsNotEmpty()
  dia_semana: number;

  @ApiProperty({ example: '09:00:00' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
    message: 'hora_inicio debe tener el formato HH:mm:ss',
  })
  @IsNotEmpty()
  hora_inicio: string;

  @ApiProperty({ example: '20:00:00' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
    message: 'hora_termino debe tener el formato HH:mm:ss',
  })
  @IsNotEmpty()
  hora_termino: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
