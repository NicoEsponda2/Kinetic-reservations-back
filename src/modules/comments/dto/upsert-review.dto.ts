import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertReviewDto {
  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_reserva?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  id_servicio?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  id_deporte?: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'La calificación mínima es 1' })
  @Max(5, { message: 'La calificación máxima es 5' })
  @IsNotEmpty()
  calificacion: number;

  @ApiProperty({ example: 'Excelente experiencia en las canchas.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'El comentario debe tener al menos 3 caracteres' })
  @MaxLength(500, { message: 'El comentario no puede superar los 500 caracteres' })
  comentario: string;
}
