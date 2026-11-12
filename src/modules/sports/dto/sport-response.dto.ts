import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SportEntity } from '../entities/sport.entity.js';

export class HttpErrorResponseDto {
  @ApiProperty({
    example: 400,
    description: 'Código de estado HTTP del error',
  })
  statusCode: number;

  @ApiProperty({
    example: 'El formato del campo horarios no es un JSON válido.',
    description: 'Detalle descriptivo del error o lista de validaciones fallidas',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message: string | string[];

  @ApiPropertyOptional({
    example: 'Bad Request',
    description: 'Nombre estándar del error HTTP',
  })
  error?: string;
}

export class SportCourtSummaryDto {
  @ApiProperty({ example: 1, description: 'Identificador único de la cancha' })
  id_pista: number;

  @ApiProperty({
    example: 'Cancha 1 - Arcilla',
    description: 'Nombre de la cancha o instalación',
  })
  nombre: string;

  @ApiProperty({
    example: 15000,
    description: 'Precio por hora en pesos chilenos (CLP)',
  })
  precio_hora: number;

  @ApiProperty({
    example: true,
    description: 'Indica si la cancha está activa',
  })
  is_active: boolean;
}

export class SportScheduleSummaryDto {
  @ApiProperty({
    example: 1,
    description: 'Identificador único del bloque horario',
  })
  id_horario: number;

  @ApiProperty({
    example: 1,
    description: 'Día de la semana (0 = Domingo, 1 = Lunes ... 6 = Sábado)',
  })
  dia_semana: number;

  @ApiProperty({
    example: '09:00:00',
    description: 'Hora de inicio del bloque',
  })
  hora_inicio: string;

  @ApiProperty({
    example: '22:00:00',
    description: 'Hora de término del bloque',
  })
  hora_termino: string;

  @ApiProperty({
    example: true,
    description: 'Indica si el bloque horario se encuentra habilitado',
  })
  is_active: boolean;
}

export class SportMutationResponseDto {
  @ApiProperty({
    example: 'Servicio creado correctamente',
    description: 'Mensaje de confirmación de la operación realizada',
  })
  msg: string;

  @ApiProperty({
    type: () => SportEntity,
    description:
      'Entidad completa del servicio deportivo con sus canchas, horarios e imágenes actualizadas',
  })
  sport: SportEntity;
}

export class SportSummaryItemDto {
  @ApiProperty({
    example: '2a5288c7-26f9-4416-83da-b0b1b21fbcf4',
    format: 'uuid',
    description: 'UUID del servicio deportivo',
  })
  id_deporte: string;

  @ApiProperty({
    example: 'Tenis',
    description: 'Nombre del servicio deportivo',
  })
  nombre: string;

  @ApiPropertyOptional({
    example:
      'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1791386286/KINETIC-RESERVATIONS/Static/faujurn3xy5ypgdmno6e.jpg',
    nullable: true,
    description: 'URL de la imagen de portada principal',
  })
  imagen_principal?: string;

  @ApiProperty({
    example:
      'Canchas profesionales de arcilla y superficie rápida con iluminación LED de alta eficiencia.',
    description: 'Descripción del servicio deportivo',
  })
  descripcion: string;

  @ApiProperty({
    example: true,
    description: 'Indica si el servicio deportivo se encuentra activo',
  })
  is_active: boolean;
}

export class SportListDataDto {
  @ApiProperty({
    type: () => [SportSummaryItemDto],
    description: 'Listado paginado de servicios deportivos',
  })
  servicios: SportSummaryItemDto[];
}

export class SportListResponseDto {
  @ApiProperty({
    type: () => SportListDataDto,
    description: 'Contenedor de datos de la respuesta',
  })
  data: SportListDataDto;
}

export class SportHomeItemDto {
  @ApiProperty({
    example: '2a5288c7-26f9-4416-83da-b0b1b21fbcf4',
    format: 'uuid',
    description: 'UUID del servicio deportivo',
  })
  id_deporte: string;

  @ApiProperty({ example: 'Tenis', description: 'Nombre del deporte' })
  nombre: string;

  @ApiProperty({
    example:
      'Canchas profesionales de arcilla y superficie rápida con iluminación LED de alta eficiencia.',
    description: 'Descripción comercial mostrada en la página principal',
  })
  descripcion: string;

  @ApiPropertyOptional({
    example:
      'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1791386286/KINETIC-RESERVATIONS/Static/faujurn3xy5ypgdmno6e.jpg',
    nullable: true,
    description: 'URL de la imagen de portada',
  })
  imagen_principal?: string;

  @ApiPropertyOptional({
    type: Number,
    example: 15000,
    nullable: true,
    description:
      'Tarifa mínima por hora entre las canchas activas del deporte (CLP)',
  })
  precio_desde: number | null;

  @ApiPropertyOptional({
    type: Number,
    example: 4.8,
    nullable: true,
    description:
      'Promedio de calificación (1 a 5 estrellas) basado en reseñas activas',
  })
  calificacion: number | null;

  @ApiProperty({
    example: 12,
    description: 'Cantidad total de reseñas activas registradas para el deporte',
  })
  total_comentarios: number;

  @ApiProperty({
    type: () => [SportCourtSummaryDto],
    description: 'Canchas activas disponibles para este deporte',
  })
  pistas: SportCourtSummaryDto[];
}

export class SportHomeDataDto {
  @ApiProperty({
    type: () => [SportHomeItemDto],
    description: 'Catálogo enriquecido de deportes activos para la página de inicio',
  })
  servicios: SportHomeItemDto[];
}

export class SportHomeResponseDto {
  @ApiProperty({
    type: () => SportHomeDataDto,
    description: 'Contenedor principal de datos de la página de inicio',
  })
  data: SportHomeDataDto;
}

export class SportNameCourtItemDto {
  @ApiProperty({ example: 1, description: 'Identificador de la cancha' })
  id_pista: number;

  @ApiProperty({
    example: 'Cancha 1 - Arcilla',
    description: 'Nombre de la cancha',
  })
  nombre: string;

  @ApiProperty({
    example: 15000,
    description: 'Precio por hora de la cancha (CLP)',
  })
  precio_hora: number;
}

export class SportNameItemDto {
  @ApiProperty({
    example: '2a5288c7-26f9-4416-83da-b0b1b21fbcf4',
    format: 'uuid',
    description: 'UUID del servicio deportivo',
  })
  id_servicio: string;

  @ApiProperty({ example: 'Tenis', description: 'Nombre del deporte' })
  nombre: string;

  @ApiProperty({
    type: () => [SportNameCourtItemDto],
    description: 'Listado ligero de canchas activas asociadas al deporte',
  })
  pistas: SportNameCourtItemDto[];
}

export class SportNamesResponseDto {
  @ApiProperty({
    example: true,
    description: 'Indicador booleano de éxito de la consulta',
  })
  ok: boolean;

  @ApiProperty({
    type: () => [SportNameItemDto],
    description:
      'Listado de deportes activos con sus canchas para selectores y filtros',
  })
  servicios: SportNameItemDto[];
}

export class SportDetailPlainResponseDto {
  @ApiProperty({
    example: '2a5288c7-26f9-4416-83da-b0b1b21fbcf4',
    format: 'uuid',
    description: 'UUID del servicio deportivo',
  })
  id_deporte: string;

  @ApiProperty({ example: 'Tenis', description: 'Nombre del deporte' })
  nombre: string;

  @ApiProperty({
    example:
      'Canchas profesionales de arcilla y superficie rápida con iluminación LED de alta eficiencia.',
    description: 'Descripción del servicio deportivo',
  })
  descripcion: string;

  @ApiPropertyOptional({
    example:
      'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1791386286/KINETIC-RESERVATIONS/Static/faujurn3xy5ypgdmno6e.jpg',
    nullable: true,
    description: 'URL de la imagen principal',
  })
  imagen_principal?: string;

  @ApiProperty({
    example: true,
    description: 'Estado activo/inactivo del deporte',
  })
  is_active: boolean;

  @ApiProperty({
    type: [String],
    example: [
      'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1791386286/KINETIC-RESERVATIONS/Static/tenis-1.jpg',
      'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1791386286/KINETIC-RESERVATIONS/Static/tenis-2.jpg',
    ],
    description: 'Arreglo plano con las URLs de las imágenes de la galería',
  })
  imagenes: string[];

  @ApiProperty({
    type: () => [SportCourtSummaryDto],
    description: 'Canchas asociadas ordenadas ascendentemente por id_pista',
  })
  pistas: SportCourtSummaryDto[];

  @ApiProperty({
    type: () => [SportScheduleSummaryDto],
    description:
      'Bloques horarios asociados ordenados por día de la semana (Lunes a Domingo) y hora de inicio',
  })
  horarios: SportScheduleSummaryDto[];
}
