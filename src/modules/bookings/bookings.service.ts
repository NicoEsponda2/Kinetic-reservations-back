import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from './entities/booking.entity.js';
import { CourtEntity } from '../courts/entities/court.entity.js';
import { UserEntity } from '../../auth/entities/user.entity.js';
import { ValidRoles } from '../../auth/interfaces/valid-roles.js';
import { isBusinessDateTimePast } from '../../common/utils/business-time.util.js';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger('BookingsService');

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(CourtEntity)
    private readonly courtRepository: Repository<CourtEntity>,
  ) {}

  /**
   * Obtiene el historial completo de reservas con datos de usuario, cancha y deporte para administración.
   *
   * @returns Objeto con el indicador de éxito y el listado de reservas formateado.
   */
  async findBookingHistory() {
    try {
      const reservas = await this.bookingRepository.find({
        relations: {
          usuario: true,
          pista: {
            servicio: true,
          },
        },
        select: {
          id_reserva: true,
          id_pista: true,
          fecha: true,
          hora_inicio: true,
          hora_termino: true,
          precio_cobrado: true,
          estado: true,
          usuario: {
            id_usuario: true,
            nombre: true,
            apellido: true,
            imagen: true,
          },
          pista: {
            id_pista: true,
            nombre: true,
            servicio: {
              id_deporte: true,
              nombre: true,
            },
          },
        },
        order: {
          fecha: 'DESC',
          hora_inicio: 'ASC',
        },
      });

      const data = reservas.map((reserva) => ({
        id_reserva: reserva.id_reserva,
        id_pista: reserva.id_pista ?? reserva.pista?.id_pista,
        fecha:
          typeof reserva.fecha === 'string'
            ? reserva.fecha
            : reserva.fecha.toISOString().split('T')[0],
        hora_inicio: reserva.hora_inicio,
        hora_termino: reserva.hora_termino,
        precio_cobrado: reserva.precio_cobrado,
        estado: reserva.estado,
        pista: reserva.pista?.nombre,
        servicio: reserva.pista?.servicio?.nombre,
        id_servicio: reserva.pista?.servicio?.id_deporte,
        usuario_nombre:
          [reserva.usuario?.nombre, reserva.usuario?.apellido]
            .filter(Boolean)
            .join(' ') || reserva.usuario?.nombre,
        avatar: reserva.usuario?.imagen ?? null,
      }));

      return {
        ok: true,
        data,
      };
    } catch (error) {
      this.logger.error('Error al obtener el listado de reservas:', error);
      throw new InternalServerErrorException({
        ok: false,
        msg: 'Error interno al cargar las reservas',
      });
    }
  }

  /**
   * Crea y almacena una nueva reserva en la base de datos.
   *
   * @param createBookingDto Datos de la reserva que se desea guardar.
   * @returns Entidad de la reserva guardada en la base de datos.
   */
  async create(createBookingDto: CreateBookingDto, user?: UserEntity) {
    try {
      if (
        isBusinessDateTimePast(
          createBookingDto.fecha,
          createBookingDto.hora_inicio,
        )
      ) {
        throw new BadRequestException(
          'No se puede reservar un horario que ya haya comenzado',
        );
      }

      const court = await this.courtRepository.findOne({
        where: { id_pista: createBookingDto.id_pista, is_active: true },
      });

      if (!court) {
        throw new BadRequestException(
          'La cancha seleccionada no existe o no se encuentra habilitada',
        );
      }

      const solapada = await this.bookingRepository
        .createQueryBuilder('r')
        .where('r.id_pista = :id_pista', { id_pista: createBookingDto.id_pista })
        .andWhere('r.fecha = :fecha', { fecha: createBookingDto.fecha })
        .andWhere("LOWER(r.estado) NOT IN ('cancelada', 'cancelado')")
        .andWhere('r.hora_inicio < :horaTermino AND r.hora_termino > :horaInicio', {
          horaInicio: createBookingDto.hora_inicio,
          horaTermino: createBookingDto.hora_termino,
        })
        .getOne();

      if (solapada) {
        throw new BadRequestException(
          'El bloque horario seleccionado ya se encuentra reservado',
        );
      }

      const isAdmin =
        user?.roles?.includes(ValidRoles.admin) ||
        user?.roles?.includes(ValidRoles.superUser);

      const booking = this.bookingRepository.create({
        ...createBookingDto,
        id_usuario: isAdmin
          ? createBookingDto.id_usuario
          : (user?.id_usuario ?? createBookingDto.id_usuario),
        estado: isAdmin ? (createBookingDto.estado ?? 'Pendiente') : 'Pendiente',
        precio_cobrado: Number(court.precio_hora),
      });
      await this.bookingRepository.save(booking);
      return booking;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.handleDBExceptions(error);
    }
  }

  /**
   * Obtiene todas las reservas registradas incluyendo relaciones básicas con usuario y cancha.
   *
   * @returns Objeto que envuelve el listado completo de reservas.
   */
  async findAll() {
    const bookings = await this.bookingRepository.find({
      relations: { usuario: true, pista: true },
      select: {
        id_reserva: true,
        fecha: true,
        hora_inicio: true,
        usuario: {
          id_usuario: true,
          nombre: true,
          apellido: true,
        },
        pista: {
          id_pista: true,
          nombre: true,
        },
        hora_termino: true,
        estado: true,
        precio_cobrado: true,
        created_at: true,
        updated_at: true,
      },
    });

    return { data: { reservas: bookings } };
  }

  /**
   * Devuelve una respuesta descriptiva para la consulta de una reserva por su ID.
   *
   * @param id Identificador numérico de la reserva.
   * @returns Texto informativo con el identificador de la reserva.
   */
  findOne(id: number) {
    return `Esta acción devuelve la reserva n.º ${id}`;
  }

  /**
   * Devuelve una respuesta descriptiva para la actualización de una reserva por su ID.
   *
   * @param id Identificador numérico de la reserva.
   * @param _updateBookingDto Datos parciales de actualización de la reserva.
   * @returns Texto informativo indicando la actualización de la reserva.
   */
  update(id: number, _updateBookingDto: UpdateBookingDto) {
    return `Esta acción actualiza la reserva n.º ${id}`;
  }

  /**
   * Devuelve una respuesta descriptiva para la eliminación de una reserva por su ID.
   *
   * @param id Identificador numérico de la reserva.
   * @returns Texto informativo indicando la eliminación de la reserva.
   */
  remove(id: number) {
    return `Esta acción elimina la reserva n.º ${id}`;
  }

  /**
   * Centraliza el manejo de excepciones de base de datos al operar con reservas.
   *
   * @param error Error capturado durante la operación en base de datos.
   * @returns Lanza una excepción HTTP acorde al código de error de PostgreSQL.
   */
  private handleDBExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    this.logger.error(error);

    throw new InternalServerErrorException('Error creating booking');
  }
}
