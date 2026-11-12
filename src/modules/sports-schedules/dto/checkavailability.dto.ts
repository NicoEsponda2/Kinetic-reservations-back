import { IsInt, IsNotEmpty, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CheckAvailabilityDto {
  @ApiProperty({ type: String, format: 'uuid', example: '2a5288c7-26f9-4416-83da-b0b1b21fbcf4' })
  @IsNotEmpty({ message: 'id_servicio es requerido' })
  id_servicio: string | number; // Soporta UUID o INT según tu configuración

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'id_pista debe ser un número entero' })
  @IsNotEmpty({ message: 'id_pista es requerido' })
  id_pista: number;

  @ApiProperty({ format: 'date', example: '2026-11-06' })
  @IsString()
  @IsNotEmpty({ message: 'La fecha es requerida' })
  fecha: string;
}
