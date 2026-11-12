import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class SportCourtInputDto {
  @ApiPropertyOptional({
    type: Number,
    example: 1,
    description:
      'ID de la cancha existente (solo requerido al editar una cancha ya registrada)',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  id_pista?: number | null;

  @ApiProperty({
    example: 'Cancha 1 - Arcilla',
    description: 'Nombre identificador de la cancha o pista',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    example: 15000,
    description: 'Valor de arriendo por hora en pesos chilenos (CLP)',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  precio_hora: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Indica si la cancha se encuentra habilitada para reservas',
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class SportScheduleInputDto {
  @ApiProperty({
    example: 1,
    description:
      'Día de la semana (0 = Domingo, 1 = Lunes, 2 = Martes, ..., 6 = Sábado)',
    minimum: 0,
    maximum: 6,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dia_semana: number;

  @ApiProperty({
    example: '09:00:00',
    description: 'Hora de apertura del bloque horario en formato HH:mm:ss',
  })
  @IsString()
  @IsNotEmpty()
  hora_inicio: string;

  @ApiProperty({
    example: '22:00:00',
    description: 'Hora de cierre del bloque horario en formato HH:mm:ss',
  })
  @IsString()
  @IsNotEmpty()
  hora_termino: string;

  @ApiPropertyOptional({
    type: Boolean,
    example: true,
    default: true,
    description: 'Indica si el bloque horario se encuentra activo',
  })
  @IsOptional()
  bloque_activo?: boolean | number | string;
}

export class CreateSportDto {
  @ApiProperty({
    example: 'Tenis',
    description: 'Nombre oficial del servicio deportivo',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    example:
      'Canchas profesionales de arcilla y superficie rápida con iluminación LED de alta eficiencia.',
    description:
      'Descripción detallada del servicio deportivo y sus instalaciones',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  @IsNotEmpty()
  descripcion: string;

  @ApiPropertyOptional({
    type: Boolean,
    example: true,
    default: true,
    description:
      'Estado de disponibilidad del servicio deportivo (acepta un valor booleano o una cadena "true"/"false" en multipart/form-data)',
  })
  @IsOptional()
  @IsIn([true, false, 'true', 'false', 1, 0, '1', '0'])
  is_active?: boolean | string | number;

  @ApiPropertyOptional({
    type: String,
    example:
      '[{"nombre":"Cancha 1 - Arcilla","precio_hora":15000,"is_active":true}]',
    description:
      'Arreglo de canchas (SportCourtInputDto[]) serializado como cadena JSON en multipart/form-data o como arreglo JSON',
  })
  @IsOptional()
  pistas?: SportCourtInputDto[] | string;

  @ApiPropertyOptional({
    type: String,
    example:
      '[{"dia_semana":1,"hora_inicio":"09:00:00","hora_termino":"22:00:00","bloque_activo":true}]',
    description:
      'Arreglo de bloques horarios (SportScheduleInputDto[]) serializado como cadena JSON en multipart/form-data o como arreglo JSON',
  })
  @IsOptional()
  horarios?: SportScheduleInputDto[] | string;

  @ApiPropertyOptional({
    example:
      'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1791386286/KINETIC-RESERVATIONS/Static/tenis.jpg',
    description:
      'URL existente de la imagen principal cuando no se adjunta un nuevo archivo binario',
  })
  @ValidateIf((_, val) => val !== '' && val !== null && val !== undefined)
  @IsOptional()
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  imagen_principal_url?: string;

  @ApiPropertyOptional({
    type: String,
    example: '[]',
    description:
      'Cadena JSON que representa un arreglo de URLs de galería que se conservan sin cambios',
  })
  @IsOptional()
  imagenes_existentes?: string[] | string;

  @ApiPropertyOptional({
    type: String,
    example: '[]',
    description:
      'Cadena JSON que representa un arreglo de URLs de galería marcadas para eliminación',
  })
  @IsOptional()
  imagenes_eliminadas?: string[] | string;

  @IsOptional()
  imagen_principal?: unknown;

  @IsOptional()
  imagenes?: unknown;
}

export class CreateSportMultipartDto extends CreateSportDto {
  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description:
      'Archivo de imagen de portada principal del deporte (JPG, PNG, WEBP - máx. 1 archivo)',
  })
  declare imagen_principal?: Express.Multer.File;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description:
      'Archivos de imágenes adicionales para la galería del deporte (máx. 10 archivos)',
  })
  declare imagenes?: Express.Multer.File[];
}
