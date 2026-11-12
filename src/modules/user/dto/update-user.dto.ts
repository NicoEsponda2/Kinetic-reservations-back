import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { GeneroUsuario } from '../../../auth/entities/user.entity.js';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ana' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ example: 'Pérez', nullable: true })
  @ValidateIf((_, val) => val !== '' && val !== null && val !== undefined)
  @IsString()
  @MaxLength(150)
  apellido?: string | null;

  @ApiPropertyOptional({ example: '+56912345678', nullable: true })
  @ValidateIf((_, val) => val !== '' && val !== null && val !== undefined)
  @IsString()
  @MaxLength(20)
  telefono?: string | null;

  @ApiPropertyOptional({ enum: GeneroUsuario, nullable: true })
  @ValidateIf((_, val) => val !== '' && val !== null && val !== undefined)
  @IsEnum(GeneroUsuario)
  genero?: GeneroUsuario | null;

  @ApiPropertyOptional({ format: 'email' })
  @ValidateIf((_, val) => val !== '' && val !== null && val !== undefined)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  @ValidateIf((_, val) => val !== '' && val !== null && val !== undefined)
  @IsString()
  fecha_nacimiento?: string | null;
}
