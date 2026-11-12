import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MobileCommentDto {
  @ApiProperty({ example: 12 })
  idComentario: number;

  @ApiProperty({ example: 42 })
  idReserva: number;

  @ApiProperty({ format: 'uuid' })
  idServicio: string;

  @ApiProperty({ example: 'Tenis' })
  servicio: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/example/image/upload/tenis.webp',
    nullable: true,
  })
  imagenServicio: string | null;

  @ApiProperty({ example: 'Cancha 1' })
  pista: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  calificacion: number;

  @ApiProperty({ example: 'Excelente cancha y muy buena atención.' })
  comentario: string;

  @ApiProperty({ example: '2026-11-05', format: 'date' })
  fechaReserva: string;

  @ApiProperty({ example: '18:00:00' })
  horaInicio: string;

  @ApiProperty({ example: '19:00:00' })
  horaTermino: string;

  @ApiProperty({ example: '2026-11-05T22:15:00.000Z', format: 'date-time' })
  createdAt: string;

  @ApiProperty({ example: '2026-11-05T22:15:00.000Z', format: 'date-time' })
  updatedAt: string;
}

export class MobileCommentsDataDto {
  @ApiProperty({
    type: [MobileCommentDto],
    description:
      'Reseñas del usuario (activas e inactivas), ordenadas desde la más reciente.',
  })
  comments: MobileCommentDto[];
}

export class MobileCommentsResponseDto {
  @ApiProperty({ example: true })
  ok: true;

  @ApiProperty({ example: 'mobile', enum: ['mobile'] })
  client: 'mobile';

  @ApiProperty({ type: MobileCommentsDataDto })
  data: MobileCommentsDataDto;
}
