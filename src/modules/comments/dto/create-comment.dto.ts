import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 42, description: 'ID de la reserva.' })
  @IsInt()
  @IsNotEmpty()
  reserva: number;

  @ApiProperty({ format: 'uuid', description: 'UUID del deporte.' })
  @IsString() // Cambiar a @IsUUID() si ajustas la base de datos
  @IsNotEmpty()
  id_deporte: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1, { message: 'La calificación mínima es 1' })
  @Max(5, { message: 'La calificación máxima es 5' })
  @IsNotEmpty()
  calificacion: number;

  @ApiProperty({ example: 'Excelente experiencia en la cancha.' })
  @IsString()
  @MinLength(20, { message: 'Minimo 20 caracteres' })
  @MaxLength(200, { message: 'Maximo 200 caracteres' })
  @IsNotEmpty()
  comentario: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'Todo nuevo comentario se crea inactivo (false) hasta ser activado por un administrador.',
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
