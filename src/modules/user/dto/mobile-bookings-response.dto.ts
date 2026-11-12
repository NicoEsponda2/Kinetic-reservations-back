import { ApiProperty } from '@nestjs/swagger';

export class MobileBookingDto {
  @ApiProperty({ example: 42 })
  idReserva: number;

  @ApiProperty({ format: 'uuid' })
  idServicio: string;

  @ApiProperty({ example: 'Tenis' })
  servicio: string;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/example/image/upload/tenis.webp',
    nullable: true,
    description: 'Imagen principal configurada para el servicio deportivo.',
  })
  imagenPrincipal: string | null;

  @ApiProperty({ example: 'Cancha 1' })
  pista: string;

  @ApiProperty({ example: 'Pagada' })
  estado: string;

  @ApiProperty({ example: '2026-11-06', format: 'date' })
  fecha: string;

  @ApiProperty({ example: '18:00:00' })
  horaInicio: string;

  @ApiProperty({ example: '19:00:00' })
  horaTermino: string;

  @ApiProperty({ example: 15000, description: 'Precio cobrado en CLP.' })
  precioCobrado: number;

  @ApiProperty({ example: false })
  tieneResena: boolean;
}

export class MobileBookingsDataDto {
  @ApiProperty({
    type: [MobileBookingDto],
    description:
      'Reservas futuras activas, ordenadas desde la más próxima.',
  })
  upcoming: MobileBookingDto[];

  @ApiProperty({
    type: [MobileBookingDto],
    description:
      'Reservas pasadas o canceladas, ordenadas desde la más reciente.',
  })
  history: MobileBookingDto[];
}

export class MobileBookingsResponseDto {
  @ApiProperty({ example: true })
  ok: true;

  @ApiProperty({ example: 'mobile', enum: ['mobile'] })
  client: 'mobile';

  @ApiProperty({ type: MobileBookingsDataDto })
  data: MobileBookingsDataDto;
}
