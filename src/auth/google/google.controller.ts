import { Body, Controller, Get, Post } from '@nestjs/common';
import { GoogleService } from './google.service.js';
import { GoogleAuthDto } from './dto/google-auth.dto.js';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { GoogleAuthSessionResponseDto, GoogleConfigResponseDto } from '../../common/swagger/api-response.dto.js';

@ApiTags('Autenticación con Google')
@Controller('auth/google')
export class GoogleController {
  constructor(private readonly googleService: GoogleService) {}

  /**
   * Obtiene la configuración pública necesaria para iniciar Google OAuth.
   *
   * @returns La configuración que contiene el identificador de cliente de Google.
   */
  @Get('config')
  @ApiOperation({ summary: 'Obtener el ID de cliente público de Google OAuth' })
  @ApiOkResponse({ type: GoogleConfigResponseDto })
  getGoogleConfig() {
    return this.googleService.getGoogleConfig();
  }

  /**
   * Autentica o registra a un usuario mediante sus credenciales de Google.
   *
   * @param googleAuthDto DTO que contiene el token de identidad o acceso de Google.
   * @returns Una promesa con el usuario autenticado, el token de sesión y el indicador de nuevo usuario.
   */
  @Post()
  @ApiOperation({ summary: 'Iniciar sesión o registrar usuario con token de Google' })
  @ApiCreatedResponse({ type: GoogleAuthSessionResponseDto })
  @ApiBadRequestResponse({ description: 'Google no entregó un correo válido.' })
  @ApiUnauthorizedResponse({ description: 'Token de Google inválido, vencido o correo sin verificar.' })
  authenticateWithGoogle(@Body() googleAuthDto: GoogleAuthDto) {
    return this.googleService.authenticateWithGoogle(googleAuthDto);
  }
}
