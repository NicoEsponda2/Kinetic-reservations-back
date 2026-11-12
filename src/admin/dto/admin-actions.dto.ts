import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AdminUpdateCourtDto {
  @ApiProperty({ example: 'Cancha 1' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: 15000, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  precio_hora: number;
}

export class AdminUpdateCommentStatusDto {
  @ApiProperty({ example: true })
  @IsNotEmpty()
  @IsIn([true, false, 1, 0, '1', '0', 'true', 'false'])
  is_active: number | boolean;
}

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ type: [String], example: ['user'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
