import { ApiProperty } from '@nestjs/swagger';

export class MobileUpcomingBookingDto {
  @ApiProperty({ example: 'Tenis' })
  servicio: string;

  @ApiProperty({ example: 'Cancha 1' })
  pista: string;

  @ApiProperty({ example: '2026-11-06', format: 'date' })
  fecha: string;

  @ApiProperty({ example: '18:00:00' })
  horaInicio: string;
}

export class MobileActivityMetricsDto {
  @ApiProperty({ example: 2 })
  reservasRealizadas: number;

  @ApiProperty({ example: 100 })
  crecimientoPorcentual: number;

  @ApiProperty({ example: 1 })
  deportesPracticados: number;

  @ApiProperty({ example: 30000 })
  dineroTotalGastado: number;

  @ApiProperty({ example: 15000 })
  promedioPorReserva: number;
}

export class MobileDashboardDataDto {
  @ApiProperty({
    type: [MobileUpcomingBookingDto],
    nullable: true,
    description: 'Máximo dos reservas futuras, ordenadas por fecha y hora.',
  })
  proximoPartido: MobileUpcomingBookingDto[] | null;

  @ApiProperty({ type: MobileActivityMetricsDto })
  metricas: MobileActivityMetricsDto;
}

export class MobileDashboardResponseDto {
  @ApiProperty({ example: true })
  ok: true;

  @ApiProperty({ example: 'mobile', enum: ['mobile'] })
  client: 'mobile';

  @ApiProperty({ type: MobileDashboardDataDto })
  data: MobileDashboardDataDto;
}
