import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity.js';
import { JwtPayload } from '../interfaces/jwt.payload.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    configService: ConfigService,
  ) {
    super({
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  /**
   * Valida el contenido del JWT y recupera al usuario activo asociado.
   *
   * @param payload Datos decodificados del token de autenticación.
   * @returns Una promesa con el usuario autenticado y activo.
   */
  async validate(payload: JwtPayload): Promise<UserEntity> {
    const { id_usuario } = payload;

    const user = await this.userRepository.findOneBy({ id_usuario });

    if (!user) throw new UnauthorizedException('Token not valid');

    if (!user.is_active)
      throw new UnauthorizedException('User is inactive, talk with an admin');

    return user;
  }
}
