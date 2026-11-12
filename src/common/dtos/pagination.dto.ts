import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Cantidad máxima de registros a retornar en la consulta',
    example: 10,
    minimum: 1,
    maximum: 100,
    type: Number,
  })
  @IsOptional()
  @IsPositive()
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Cantidad de registros a omitir desde el inicio para paginación',
    example: 0,
    minimum: 0,
    default: 0,
    type: Number,
  })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}
