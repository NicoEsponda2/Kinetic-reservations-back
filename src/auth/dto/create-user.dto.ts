import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { GeneroUsuario } from '../entities/user.entity.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Ana', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ example: 'Pérez', maxLength: 150 })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  apellido?: string;

  @ApiProperty({ example: 'ana@example.com', format: 'email' })
  @IsString()
  @IsEmail()
  @MaxLength(150)
  email: string;

  @ApiProperty({ example: 'ClaveSegura1!', minLength: 6, maxLength: 50, writeOnly: true })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'The password must have a Uppercase, lowercase letter and a number',
  })
  password: string;

  @ApiPropertyOptional({ example: '+56912345678' })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ enum: GeneroUsuario, example: GeneroUsuario.NO_ESPECIFICA })
  @IsEnum(GeneroUsuario)
  @IsOptional()
  genero?: GeneroUsuario;

  @ApiPropertyOptional({ format: 'date', example: '1998-05-20' })
  @IsDateString()
  @IsOptional()
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ format: 'uri', description: 'URL de foto de perfil.' })
  @ValidateIf((_, val) => val !== '' && val !== null && val !== undefined)
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  imagen?: string;
}
