import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MobileDashboardDataDto } from '../../modules/user/dto/mobile-dashboard-response.dto.js';

export class PublicUserDto {
  @ApiProperty({ format: 'uuid' }) id_usuario: string;
  @ApiProperty({ example: 'Ana' }) nombre: string;
  @ApiProperty({ example: 'Pérez' }) apellido: string;
  @ApiProperty({ example: 'ana@example.com' }) email: string;
  @ApiProperty({ type: [String], example: ['user'] }) roles: string[];
  @ApiProperty({ example: true }) is_active: boolean;
  @ApiPropertyOptional({ nullable: true }) telefono?: string;
  @ApiPropertyOptional({ nullable: true, enum: ['M', 'F', 'O', 'N'] })
  genero?: string;
  @ApiPropertyOptional({ nullable: true, format: 'date' })
  fecha_nacimiento?: string;
  @ApiPropertyOptional({ nullable: true }) imagen?: string;
}

export class AuthSessionResponseDto {
  @ApiProperty({ type: () => PublicUserDto }) usuario: PublicUserDto;
  @ApiProperty({ description: 'JWT de tipo Bearer de la sesión.' }) token: string;
}

export class GoogleAuthSessionResponseDto extends AuthSessionResponseDto {
  @ApiProperty({ description: 'Indica si se creó la cuenta al autenticar.' })
  isNewUser: boolean;
}

export class GoogleConfigResponseDto {
  @ApiProperty({ description: 'ID público del cliente OAuth de Google.' })
  clientId: string;
}

export class BookingHistoryItemDto {
  @ApiProperty() id_reserva: number;
  @ApiProperty({ format: 'uuid' }) id_servicio: string;
  @ApiProperty() servicio: string;
  @ApiPropertyOptional({ nullable: true }) imagen_principal?: string | null;
  @ApiProperty() pista: string;
  @ApiProperty({ example: 'Pagada' }) estado: string;
  @ApiProperty({ format: 'date', example: '2026-11-06' }) fecha: string;
  @ApiProperty({ example: '18:00:00' }) horaInicio: string;
  @ApiProperty() tieneResena: boolean;
}

export class BookingHistoryResponseDto {
  @ApiProperty() ok: boolean;
  @ApiProperty({ type: () => [BookingHistoryItemDto] })
  data: BookingHistoryItemDto[];
}

export class BookingRecordDto {
  @ApiProperty() id_reserva: number;
  @ApiProperty({ format: 'uuid' }) id_usuario: string;
  @ApiProperty() id_pista: number;
  @ApiProperty({ format: 'date', example: '2026-11-06' }) fecha: string;
  @ApiProperty({ example: '18:00:00' }) hora_inicio: string;
  @ApiProperty({ example: '19:00:00' }) hora_termino: string;
  @ApiProperty({ example: 'Pagada' }) estado: string;
  @ApiPropertyOptional({ nullable: true }) comentario?: string;
  @ApiProperty({ description: 'Precio cobrado en CLP.' })
  precio_cobrado: number;
}

export class CourtRecordDto {
  @ApiProperty() id_pista: number;
  @ApiProperty() nombre: string;
  @ApiProperty() precio_hora: number;
  @ApiProperty() is_active: boolean;
}

export class CourtUpdateResponseDto {
  @ApiProperty() ok: boolean;
  @ApiProperty() msg: string;
  @ApiProperty({ type: () => CourtRecordDto }) data: CourtRecordDto;
}

export class CommentRecordDto {
  @ApiProperty() id_comentario: number;
  @ApiProperty({ format: 'uuid' }) id_deporte: string;
  @ApiProperty({ minimum: 1, maximum: 5 }) calificacion: number;
  @ApiProperty() comentario: string;
  @ApiProperty() is_active: boolean;
}

export class AvailabilitySlotDto {
  @ApiProperty({ example: '18:00' }) hora_inicio: string;
  @ApiProperty({ example: '19:00' }) hora_termino: string;
}

export class AvailabilityResponseDto {
  @ApiProperty() ok: boolean;
  @ApiProperty({ type: () => [AvailabilitySlotDto] })
  horarios: AvailabilitySlotDto[];
  @ApiPropertyOptional({
    description: 'Por ejemplo, cuando el servicio está cerrado.',
  })
  msg?: string;
}

export class PaymentStartResponseDto {
  @ApiProperty() ok: boolean;
  @ApiProperty({ format: 'uri' }) url: string;
  @ApiProperty() token: string;
  @ApiPropertyOptional({
    format: 'uri',
    description:
      'URL de retorno que debe interceptar el cliente durante el flujo móvil.',
  })
  callbackUrl?: string;
}

export class PaymentCommitResponseDto {
  @ApiProperty() ok: boolean;
  @ApiProperty({ example: 'AUTHORIZED' }) status: string;
  @ApiProperty() amount: number;
  @ApiProperty() buyOrder: string;
  @ApiPropertyOptional() cardNumber?: string;
  @ApiProperty() id_reserva: number;
  @ApiProperty() msg: string;
}

export class MobileDashboardLegacyResponseDto {
  @ApiProperty({ type: () => MobileDashboardDataDto })
  data: MobileDashboardDataDto;
}

export class ActionMessageResponseDto {
  @ApiProperty() ok: boolean;
  @ApiProperty() msg: string;
}

export class UserUpdateResponseDto extends ActionMessageResponseDto {
  @ApiProperty({ type: () => PublicUserDto }) usuario: PublicUserDto;
}
