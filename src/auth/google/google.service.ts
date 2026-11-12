import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { UserEntity } from '../entities/user.entity.js';
import { JwtPayload } from '../interfaces/jwt.payload.interface.js';
import { GoogleAuthDto } from './dto/google-auth.dto.js';
import { GoogleUserInfo } from './interfaces/google-user.interface.js';

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Obtiene el identificador de cliente configurado para Google OAuth.
   *
   * @returns La configuración pública con el identificador de cliente de Google.
   */
  getGoogleConfig() {
    return {
      clientId:
        this.configService.get<string>('GOOGLE_CLIENT_ID') ||
        '145686420353-pgv150b8k0hv02gn49412cn8a7tdrtat.apps.googleusercontent.com',
    };
  }

  /**
   * Inicia sesión o registra automáticamente a un usuario utilizando su cuenta de Google.
   *
   * @param googleAuthDto DTO que contiene el token entregado por Google.
   * @returns Una promesa con el usuario sin contraseña, el token de sesión y el indicador de nuevo usuario.
   */
  async authenticateWithGoogle(googleAuthDto: GoogleAuthDto) {
    const { token } = googleAuthDto;

    const googleUser = await this.verifyGoogleToken(token);

    if (!googleUser.email) {
      throw new BadRequestException(
        'No se pudo obtener el correo electrónico desde la cuenta de Google',
      );
    }

    const isVerified =
      googleUser.email_verified === true ||
      googleUser.email_verified === 'true';

    if (googleUser.email_verified !== undefined && !isVerified) {
      throw new UnauthorizedException(
        'El correo electrónico de Google no está verificado',
      );
    }

    const normalizedEmail = googleUser.email.toLowerCase().trim();

    try {
      let user = await this.userRepository.findOne({
        where: { email: normalizedEmail },
      });

      let isNewUser = false;

      if (!user) {
        // Caso 1: El usuario no existe -> Se registra automáticamente con los datos de Google
        isNewUser = true;
        const { nombre, apellido } = this.extractNames(googleUser);
        const randomPassword = randomBytes(32).toString('hex') + 'Aa1!';

        const newUser = this.userRepository.create({
          email: normalizedEmail,
          nombre,
          apellido,
          password: await bcrypt.hash(randomPassword, 10),
          imagen: googleUser.picture ?? undefined,
          is_active: true,
          roles: ['user'],
        });

        user = await this.userRepository.save(newUser);
      } else {
        // Caso 2: El usuario ya existe -> Inicia sesión
        if (!user.is_active) {
          throw new UnauthorizedException(
            'El usuario se encuentra inactivo, contacta con un administrador',
          );
        }

        // Si el usuario aún no tiene foto de perfil y Google provee una, la actualizamos
        if (!user.imagen && googleUser.picture) {
          user.imagen = googleUser.picture;
          user = await this.userRepository.save(user);
        }
      }

      const { password: _password, ...userWithoutPassword } = user;

      return {
        usuario: userWithoutPassword,
        token: this.getJwtToken({ id_usuario: user.id_usuario }),
        isNewUser,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error('Error en la autenticación con Google:', error);
      throw new InternalServerErrorException(
        'Error interno al procesar la autenticación con Google',
      );
    }
  }

  /**
   * Verifica un token de identidad JWT o un token de acceso de Google.
   *
   * @param token Token de identidad o acceso entregado por Google.
   * @returns Una promesa con la información validada del usuario de Google.
   */
  private async verifyGoogleToken(token: string): Promise<GoogleUserInfo> {
    try {
      const expectedClientId =
        this.configService.get<string>('GOOGLE_CLIENT_ID')?.trim() ||
        this.getGoogleConfig().clientId;
      const isJwtIdToken = token.split('.').length === 3;

      if (isJwtIdToken) {
        const response = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
        );

        if (!response.ok) {
          throw new UnauthorizedException(
            'El token de identidad de Google no es válido o ha expirado',
          );
        }

        const data = (await response.json()) as GoogleUserInfo;

        if (!data.aud || data.aud !== expectedClientId) {
          throw new UnauthorizedException(
            'El token de Google no corresponde a esta aplicación',
          );
        }

        return data;
      }

      // 1. Verificar que el access_token haya sido emitido para el client_id de esta aplicación
      const tokenInfoResponse = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`,
      );

      if (!tokenInfoResponse.ok) {
        throw new UnauthorizedException(
          'El token de acceso de Google no es válido o ha expirado',
        );
      }

      const tokenInfo = (await tokenInfoResponse.json()) as {
        aud?: string;
        azp?: string;
      };

      if (
        tokenInfo.aud !== expectedClientId &&
        tokenInfo.azp !== expectedClientId
      ) {
        throw new UnauthorizedException(
          'El token de acceso de Google no corresponde a esta aplicación',
        );
      }

      // 2. Verificación mediante access_token consultando el endpoint oficial UserInfo de Google
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new UnauthorizedException(
          'El token de acceso de Google no es válido o ha expirado',
        );
      }

      return (await response.json()) as GoogleUserInfo;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Error al verificar token con Google:', error);
      throw new UnauthorizedException(
        'No fue posible validar las credenciales con Google',
      );
    }
  }

  /**
   * Obtiene el nombre y el apellido desde la información del usuario de Google.
   *
   * @param googleUser Información del usuario obtenida desde Google.
   * @returns El nombre y el apellido normalizados, con valores alternativos cuando faltan datos.
   */
  private extractNames(googleUser: GoogleUserInfo): {
    nombre: string;
    apellido: string;
  } {
    if (googleUser.given_name) {
      return {
        nombre: googleUser.given_name.trim(),
        apellido: (googleUser.family_name || '').trim(),
      };
    }

    const fullName = (googleUser.name || '').trim();
    if (fullName) {
      const parts = fullName.split(/\s+/);
      const nombre = parts[0] || 'Usuario';
      const apellido = parts.slice(1).join(' ') || '';
      return { nombre, apellido };
    }

    const emailPrefix = googleUser.email.split('@')[0] || 'Usuario';
    return {
      nombre: emailPrefix,
      apellido: '',
    };
  }

  /**
   * Genera el token JWT de sesión para el usuario autenticado.
   *
   * @param payload Datos del usuario que se incluirán en el token.
   * @returns El token JWT firmado.
   */
  private getJwtToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }
}
