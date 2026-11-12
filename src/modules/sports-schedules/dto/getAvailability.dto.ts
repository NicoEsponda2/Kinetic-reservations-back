import { IsInt, IsNotEmpty, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetAvailabilityDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'id_pista debe ser un número entero' })
  @Min(1)
  id_pista: number;

  @ApiProperty({ type: String, format: 'uuid', example: '2a5288c7-26f9-4416-83da-b0b1b21fbcf4' })
  @IsNotEmpty({ message: 'id_servicio es requerido' })
  id_servicio: number | string;

  @ApiProperty({ format: 'date', example: '2026-11-06' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener el formato estricto YYYY-MM-DD',
  })
  fecha: string;
}
