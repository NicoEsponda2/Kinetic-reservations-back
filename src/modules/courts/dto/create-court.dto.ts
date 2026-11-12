import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCourtDto {
  @IsUUID()
  @IsNotEmpty()
  id_servicio: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  nombre: string;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  precio_hora: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
