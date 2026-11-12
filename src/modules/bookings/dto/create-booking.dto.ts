import { 
  IsDateString, 
  IsInt, 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  IsUUID, 
  Matches 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ format: 'uuid', description: 'UUID del usuario propietario de la reserva.' })
  // Nota: En producción, es más seguro obtener el id_usuario desde el token JWT 
  // en el backend en lugar de enviarlo en el body, pero lo incluimos para el tipado.
  @IsUUID('4', { message: 'El id_usuario debe ser un UUID válido' })
  @IsNotEmpty()
  id_usuario: string;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'El id_pista debe ser un número entero' })
  @IsNotEmpty()
  id_pista: number;

  @ApiProperty({ format: 'date', example: '2026-11-06' })
  @IsDateString({}, { message: 'La fecha debe tener un formato válido (YYYY-MM-DD)' })
  @IsNotEmpty()
  fecha: string;

  @ApiProperty({ example: '18:00' })
  // Usamos una expresión regular para validar estrictamente que la hora 
  // venga en formato HH:mm o HH:mm:ss
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'La hora_inicio debe tener el formato HH:mm o HH:mm:ss',
  })
  hora_inicio: string;

  @ApiProperty({ example: '19:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'La hora_termino debe tener el formato HH:mm o HH:mm:ss',
  })
  hora_termino: string;

  @ApiPropertyOptional({ example: 'Pendiente' })
  // Los siguientes campos son opcionales en el DTO de creación
  @IsString()
  @IsOptional()
  estado?: string;

  @ApiPropertyOptional({ example: 'Prefiero cancha techada' })
  @IsString()
  @IsOptional()
  comentario?: string;

  @ApiPropertyOptional({ example: 15000, description: 'Precio en CLP.' })
  // Lo dejamos opcional porque tu backend debería idealmente calcular
  // este precio buscando la Pista en la BD, en lugar de confiar en el frontend.
  @IsInt()
  @IsOptional()
  precio_cobrado?: number;
}
