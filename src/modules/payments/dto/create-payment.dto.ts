import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitPaymentDto {
  @ApiProperty({ type: Number, example: 42 })
  @IsNotEmpty()
  id_reserva: number | string;

  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  id_usuario: string;

  @ApiPropertyOptional({ type: String, example: '2' })
  @IsOptional()
  role?: string | number | string[];

  @ApiProperty({ example: 15000 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  monto: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_pista?: number;

  @ApiPropertyOptional({ format: 'date', example: '2026-11-06' })
  @IsOptional()
  @IsString()
  fecha?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  hora_inicio?: string;

  @ApiPropertyOptional({ example: '19:00' })
  @IsOptional()
  @IsString()
  hora_termino?: string;
}

export class DatosReservaDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  idUsuario?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  idPista?: number;

  @ApiPropertyOptional({ format: 'date', example: '2026-11-06' })
  @IsOptional()
  @IsString()
  fecha?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  horaInicio?: string;

  @ApiPropertyOptional({ example: '19:00' })
  @IsOptional()
  @IsString()
  horaTermino?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comentario?: string;

  @ApiPropertyOptional({ format: 'email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Ana Pérez' })
  @IsOptional()
  @IsString()
  nombreUsuario?: string;

  @ApiPropertyOptional({ example: 'Cancha 1' })
  @IsOptional()
  @IsString()
  nombreCancha?: string;
}

export class CommitPaymentDto {
  @ApiProperty({ description: 'Token de Webpay retornado en token_ws.', writeOnly: true })
  @IsString()
  @IsNotEmpty({ message: 'Falta el token de confirmacion' })
  tokenWs: string;

  @ApiPropertyOptional({ type: () => DatosReservaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DatosReservaDto)
  datosReserva?: DatosReservaDto;
}
