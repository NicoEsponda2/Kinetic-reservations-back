import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { GeneroUsuario } from '../../../auth/entities/user.entity.js';

export class UpdateMobileProfileDto {
  @ApiPropertyOptional({ example: 'Nicolás' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/\S/, { message: 'El nombre no puede contener solo espacios' })
  nombre?: string;

  @ApiPropertyOptional({ example: 'Esponda', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(150)
  apellido?: string | null;

  @ApiPropertyOptional({ example: 'usuario@ejemplo.cl', format: 'email' })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ example: '+56912345678', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @Matches(/^\+569\d{8}$/, {
    message: 'El teléfono debe utilizar el formato chileno +569XXXXXXXX',
  })
  telefono?: string | null;

  @ApiPropertyOptional({ enum: GeneroUsuario, nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(GeneroUsuario)
  genero?: GeneroUsuario | null;

  @ApiPropertyOptional({ example: '1995-08-24', format: 'date', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString({ strict: true })
  fechaNacimiento?: string | null;
}
