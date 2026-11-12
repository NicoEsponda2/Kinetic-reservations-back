import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity.js';
import { Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/login-user.dto.js';
import { JwtPayload } from './interfaces/jwt.payload.interface.js';
import { JwtService } from '@nestjs/jwt';
import { PaginationDto } from '../common/dtos/pagination.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Obtiene los usuarios y agrega sus estadísticas de reservas pagadas o completadas.
   *
   * @param paginationDto Límite y desplazamiento aplicados al listado de usuarios.
   * @returns Una promesa con los usuarios paginados y sus cantidades y totales de reservas.
   */
  async findAllUsers(paginationDto: PaginationDto) {
    const { limit, offset } = paginationDto;

    const users = await this.userRepository.find({
      take: limit,
      skip: offset,
      select: {
        id_usuario: true,
        nombre: true,
        apellido: true,
        telefono: true,
        email: true,
        roles: true,
        is_active: true,
        imagen: true,
        created_at: true,
      },
      order: {
        created_at: 'ASC',
      },
    });

    const bookingStats = await this.userRepository.manager
      .createQueryBuilder()
      .select('r.id_usuario', 'id_usuario')
      .addSelect('COUNT(r.id_reserva)', 'cantidad_reservas')
      .addSelect('COALESCE(SUM(r.precio_cobrado), 0)', 'total_gastado')
      .from('bookings', 'r')
      .where("LOWER(r.estado) IN ('pagada', 'pagado', 'completada')")
      .groupBy('r.id_usuario')
      .getRawMany<{
        id_usuario: string;
        cantidad_reservas: string;
        total_gastado: string;
      }>();

    const statsByUser = new Map<
      string,
      { cantidad_reservas: number; total_gastado: number }
    >();
    for (const stat of bookingStats) {
      statsByUser.set(stat.id_usuario, {
        cantidad_reservas: Number(stat.cantidad_reservas) || 0,
        total_gastado: Number(stat.total_gastado) || 0,
      });
    }

    const usuariosConEstadisticas = users.map((u) => {
      const stat = statsByUser.get(u.id_usuario);
      return {
        ...u,
        cantidad_reservas: stat?.cantidad_reservas ?? 0,
        total_gastado: stat?.total_gastado ?? 0,
      };
    });

    return { usuarios: usuariosConEstadisticas };
  }

  /**
   * Crea una cuenta, cifra su contraseña y genera una sesión.
   *
   * @param createUserDto Datos requeridos para registrar al usuario.
   * @returns Una promesa con el usuario sin contraseña y su token JWT.
   */
  async create(createUserDto: CreateUserDto) {
    try {
      const { password, ...userData } = createUserDto;

      const user = this.userRepository.create({
        ...userData,
        password: await bcrypt.hash(password, 10),
      });

      await this.userRepository.save(user);

      const { password: _password, ...userWithoutPassword } = user;

      return {
        usuario: userWithoutPassword,
        token: this.getJwtToken({ id_usuario: user.id_usuario }),
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  /**
   * Valida las credenciales y el estado de una cuenta.
   *
   * @param loginUserDto Correo y contraseña proporcionados para iniciar sesión.
   * @returns Una promesa con el usuario autenticado sin contraseña y su token JWT.
   */
  async login(loginUserDto: LoginUserDto) {
    try {
      const { password, email } = loginUserDto;

      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase().trim() },
        select: {
          email: true,
          password: true,
          id_usuario: true,
          nombre: true,
          apellido: true,
          telefono: true,
          genero: true,
          fecha_nacimiento: true,
          imagen: true,
          is_active: true,
          roles: true,
        },
      });

      if (!user) throw new UnauthorizedException('Credentials are not valid');

      if (!user.is_active)
        throw new UnauthorizedException(
          'User is inactive, talk with an admin',
        );

      if (!user.password || !bcrypt.compareSync(password, user.password))
        throw new UnauthorizedException('Credentials are not valid');

      const { password: _password, ...userWithoutPassword } = user;

      return {
        usuario: userWithoutPassword,
        token: this.getJwtToken({ id_usuario: user.id_usuario }),
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  /**
   * Firma un token JWT para la carga útil indicada.
   *
   * @param payload Datos que se incluirán en el token.
   * @returns El token JWT firmado.
   */
  private getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }

  /**
   * Renueva la información de autenticación de un usuario.
   *
   * @param user Usuario autenticado cuya sesión se renovará.
   * @returns Una promesa con el usuario y un nuevo token JWT.
   */
  async checkAuthStatus(user: UserEntity) {
    return {
      usuario: { ...user },
      token: this.getJwtToken({ id_usuario: user.id_usuario }),
    };
  }

  /**
   * Convierte errores conocidos de persistencia en excepciones HTTP.
   *
   * @param error Error capturado durante una operación de base de datos.
   * @returns Nunca retorna; lanza una excepción con el error correspondiente.
   */
  private handleDBErrors(error: unknown): never {
    if (error && typeof error === 'object' && 'code' in error) {
      const databaseError = error as { code: string; detail?: string };

      if (databaseError.code === '23505') {
        throw new BadRequestException(
          'No fue posible completar el registro con los datos proporcionados',
        );
      }
    }

    throw error;
  }
}
