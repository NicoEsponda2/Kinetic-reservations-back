import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO para validar los mensajes entrantes enviados por el cliente vía WebSocket.
 */
export class NewMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message: string;

  @IsString()
  @IsOptional()
  quickOptionId?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  userName?: string;

  @IsString()
  @IsOptional()
  userEmail?: string;
}

/**
 * DTO para las respuestas enviadas por un administrador hacia la sesión de un usuario.
 */
export class AdminReplyDto {
  @IsString()
  @MinLength(1)
  sessionId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(600)
  message: string;

  @IsString()
  @IsOptional()
  adminName?: string;
}
