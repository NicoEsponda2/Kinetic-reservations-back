import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { BookingEntity } from '../bookings/entities/booking.entity.js';
import { CommentsEntity } from '../comments/entities/comment.entity.js';
import { UserEntity } from '../../auth/entities/user.entity.js';
import { ValidRoles } from '../../auth/interfaces/valid-roles.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateMobileProfileDto } from './dto/update-mobile-profile.dto.js';
import { UpsertReviewDto } from '../comments/dto/upsert-review.dto.js';

const BUSINESS_TIME_ZONE = 'America/Santiago';
const PAID_BOOKING_STATES = ['pagada', 'pagado', 'completada'];
const CANCELLED_BOOKING_STATES = ['cancelada', 'cancelado'];

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(CommentsEntity)
    private readonly commentRepository: Repository<CommentsEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * Obtiene la información del panel de inicio empaquetada para el cliente móvil.
   *
   * @param id_user Identificador UUID del usuario autenticado.
   * @returns Respuesta para móvil con los próximos partidos y métricas del usuario.
   */
  async getMobileDashboardData(id_user: string) {
    const { data } = await this.getDashboardData(id_user);

    return {
      ok: true,
      client: 'mobile' as const,
      data,
    };
  }

  /**
   * Clasifica y obtiene las reservas próximas y el historial de reservas del usuario para la app móvil.
   *
   * @param id_user Identificador UUID del usuario autenticado.
   * @returns Objeto con las listas de reservas próximas (`upcoming`) e históricas (`history`).
   */
  async getMobileBookingsData(id_user: string) {
    try {
      const { fechaActual, horaActual } = this.obtenerRangosDeFechas();
      const baseQuery = () =>
        this.bookingRepository
          .createQueryBuilder('r')
          .innerJoinAndSelect('r.pista', 'p')
          .innerJoinAndSelect('p.servicio', 's')
          .leftJoinAndSelect('r.comentarios', 'comentarios')
          .where('r.id_usuario = :id_user', { id_user });

      const upcomingQuery = baseQuery()
        .andWhere('LOWER(TRIM(r.estado)) NOT IN (:...cancelledStates)', {
          cancelledStates: CANCELLED_BOOKING_STATES,
        })
        .andWhere(
          new Brackets((qb) => {
            qb.where('r.fecha > :fechaActual', { fechaActual }).orWhere(
              'r.fecha = :fechaActual AND r.hora_inicio >= :horaActual',
              { fechaActual, horaActual },
            );
          }),
        )
        .orderBy('r.fecha', 'ASC')
        .addOrderBy('r.hora_inicio', 'ASC');

      const historyQuery = baseQuery()
        .andWhere(
          new Brackets((qb) => {
            qb.where('LOWER(TRIM(r.estado)) IN (:...cancelledStates)', {
              cancelledStates: CANCELLED_BOOKING_STATES,
            })
              .orWhere('r.fecha < :fechaActual', { fechaActual })
              .orWhere(
                'r.fecha = :fechaActual AND r.hora_inicio < :horaActual',
                { fechaActual, horaActual },
              );
          }),
        )
        .orderBy('r.fecha', 'DESC')
        .addOrderBy('r.hora_inicio', 'DESC');

      const [upcomingBookings, historyBookings] = await Promise.all([
        upcomingQuery.getMany(),
        historyQuery.getMany(),
      ]);

      return {
        ok: true,
        client: 'mobile' as const,
        data: {
          upcoming: upcomingBookings.map((booking) =>
            this.mapMobileBooking(booking),
          ),
          history: historyBookings.map((booking) =>
            this.mapMobileBooking(booking),
          ),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener las reservas móviles del usuario ${id_user}:`,
        error,
      );
      throw new InternalServerErrorException({
        ok: false,
        msg: 'Error interno al obtener las reservas del usuario',
      });
    }
  }

  /**
   * Obtiene y adapta el listado de comentarios realizados por el usuario para la aplicación móvil.
   *
   * @param id_user Identificador UUID del usuario autenticado.
   * @returns Respuesta para móvil con el arreglo de reseñas del usuario.
   */
  async getMobileCommentsData(id_user: string) {
    const { comentarios } = await this.getUserComments(id_user);

    return {
      ok: true,
      client: 'mobile' as const,
      data: {
        comments: comentarios.map((comment) => ({
          idComentario: comment.id_comentario,
          idReserva: comment.reserva.id_reserva,
          idServicio: String(comment.id_servicio ?? ''),
          servicio: comment.nombre_servicio ?? 'Deporte',
          imagenServicio: comment.imagen_servicio ?? null,
          pista: comment.pista.nombre ?? 'Cancha sin asignar',
          calificacion: Number(comment.calificacion),
          comentario: comment.comentario,
          fechaReserva: comment.reserva.fecha_visita ?? '',
          horaInicio: comment.reserva.hora_visita ?? '',
          horaTermino: comment.reserva.hora_termino ?? '',
          createdAt:
            comment.created_at instanceof Date
              ? comment.created_at.toISOString()
              : String(comment.created_at ?? ''),
          updatedAt:
            comment.updated_at instanceof Date
              ? comment.updated_at.toISOString()
              : String(comment.updated_at ?? ''),
        })),
      },
    };
  }

  /**
   * Consulta los datos actuales del perfil de un usuario y los adapta al contrato de la app móvil.
   *
   * @param id_user Identificador UUID del usuario autenticado.
   * @returns Objeto con la información del perfil del usuario para el cliente móvil.
   */
  async getMobileProfileData(id_user: string) {
    const user = await this.userRepository.findOne({
      where: { id_usuario: id_user },
      select: {
        id_usuario: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        genero: true,
        fecha_nacimiento: true,
        imagen: true,
        roles: true,
        is_active: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        ok: false,
        msg: 'El usuario autenticado no existe',
      });
    }

    return {
      ok: true,
      client: 'mobile' as const,
      data: { user: this.mapMobileProfileUser(user) },
    };
  }

  /**
   * Valida y actualiza los campos editables del perfil de usuario desde la aplicación móvil.
   *
   * @param id_user Identificador UUID del usuario autenticado.
   * @param updateMobileProfileDto Datos editables del perfil enviados desde la app móvil.
   * @returns Perfil móvil actualizado junto con el mensaje de confirmación.
   */
  async updateMobileProfileData(
    id_user: string,
    updateMobileProfileDto: UpdateMobileProfileDto,
  ) {
    if (updateMobileProfileDto.fechaNacimiento) {
      const birthDate = new Date(`${updateMobileProfileDto.fechaNacimiento}T00:00:00Z`);
      if (birthDate.getTime() > Date.now()) {
        throw new BadRequestException({
          ok: false,
          msg: 'La fecha de nacimiento no puede estar en el futuro',
        });
      }
    }

    await this.updateUser(id_user, {
      nombre: updateMobileProfileDto.nombre,
      apellido: updateMobileProfileDto.apellido,
      email: updateMobileProfileDto.email,
      telefono: updateMobileProfileDto.telefono,
      genero: updateMobileProfileDto.genero,
      fecha_nacimiento: updateMobileProfileDto.fechaNacimiento,
    });

    const response = await this.getMobileProfileData(id_user);
    return {
      ...response,
      message: 'Perfil actualizado correctamente',
    };
  }

  /**
   * Calcula los próximos partidos y las estadísticas mensuales de reservas y gasto de un usuario.
   *
   * @param id_user Identificador UUID del usuario.
   * @returns Objeto con los próximos partidos agendados y las métricas del mes actual.
   */
  async getDashboardData(id_user: string) {
    try {
      const {
        fechaActual,
        horaActual,
        inicioMesActual,
        finMesActual,
        inicioMesAnterior,
        finMesAnterior,
      } = this.obtenerRangosDeFechas();

      // 1. Próximos 2 partidos pagados a partir de la fecha/hora actual
      const queryProxima = this.bookingRepository
        .createQueryBuilder('r')
        .innerJoin('r.pista', 'p')
        .innerJoin('p.servicio', 's')
        .select([
          's.nombre AS "servicio"',
          'p.nombre AS "pista"',
          'r.fecha AS "fecha"',
          'r.hora_inicio AS "horaInicio"',
        ])
        .where('r.id_usuario = :id_user', { id_user })
        .andWhere('LOWER(r.estado) IN (:...paidStates)', {
          paidStates: PAID_BOOKING_STATES,
        })
        .andWhere(
          new Brackets((qb) => {
            qb.where('r.fecha > :fechaActual', { fechaActual }).orWhere(
              'r.fecha = :fechaActual AND r.hora_inicio >= :horaActual',
              { fechaActual, horaActual },
            );
          }),
        )
        .orderBy('r.fecha', 'ASC')
        .addOrderBy('r.hora_inicio', 'ASC')
        .limit(2)
        .getRawMany<{
          servicio: string;
          pista: string;
          fecha: Date | string;
          horaInicio: string;
        }>();

      // 2. Métricas agregadas del mes actual
      const queryMesActual = this.bookingRepository
        .createQueryBuilder('r')
        .innerJoin('r.pista', 'p')
        .innerJoin('p.servicio', 's')
        .select('COUNT(r.id_reserva)', 'totalReservas')
        .addSelect('COALESCE(SUM(r.precio_cobrado), 0)', 'totalGastado')
        .addSelect('COUNT(DISTINCT s.id_deporte)', 'deportesPracticados')
        .where('r.id_usuario = :id_user', { id_user })
        .andWhere('LOWER(r.estado) IN (:...paidStates)', {
          paidStates: PAID_BOOKING_STATES,
        })
        .andWhere('r.fecha BETWEEN :inicioMesActual AND :finMesActual', {
          inicioMesActual,
          finMesActual,
        })
        .getRawOne<{
          totalReservas: string;
          totalGastado: string;
          deportesPracticados: string;
        }>();

      // 3. Total de reservas del mes anterior
      const queryMesAnterior = this.bookingRepository
        .createQueryBuilder('r')
        .where('r.id_usuario = :id_user', { id_user })
        .andWhere('LOWER(r.estado) IN (:...paidStates)', {
          paidStates: PAID_BOOKING_STATES,
        })
        .andWhere('r.fecha BETWEEN :inicioMesAnterior AND :finMesAnterior', {
          inicioMesAnterior,
          finMesAnterior,
        })
        .getCount();

      const [proximaResult, mesActualResult, reservasMesPasado] =
        await Promise.all([queryProxima, queryMesActual, queryMesAnterior]);

      const proximoPartido =
        proximaResult.length > 0
          ? proximaResult.map((item) => ({
              ...item,
              fecha:
                item.fecha instanceof Date
                  ? item.fecha.toISOString().split('T')[0]
                  : item.fecha,
            }))
          : null;

      const reservasRealizadas = Number(mesActualResult?.totalReservas) || 0;
      const dineroTotalGastado = Number(mesActualResult?.totalGastado) || 0;
      const deportesPracticados =
        Number(mesActualResult?.deportesPracticados) || 0;

      // Porcentaje de crecimiento respecto al mes anterior
      let crecimientoPorcentual = 0;
      if (reservasMesPasado > 0) {
        crecimientoPorcentual = Math.round(
          ((reservasRealizadas - reservasMesPasado) / reservasMesPasado) * 100,
        );
      } else if (reservasRealizadas > 0) {
        crecimientoPorcentual = 100;
      }

      // Promedio de gasto por reserva
      const promedioPorReserva =
        reservasRealizadas > 0
          ? +(dineroTotalGastado / reservasRealizadas).toFixed(2)
          : 0;

      return {
        data: {
          proximoPartido,
          metricas: {
            reservasRealizadas,
            crecimientoPorcentual,
            deportesPracticados,
            dineroTotalGastado,
            promedioPorReserva,
          },
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener datos del dashboard para el usuario ${id_user}:`,
        error,
      );
      throw new InternalServerErrorException({
        ok: false,
        msg: 'Error interno al obtener los datos del dashboard',
      });
    }
  }

  /**
   * Obtiene las últimas diez reservas de un usuario indicando si cada una posee reseña registrada.
   *
   * @param id_user Identificador UUID del usuario.
   * @returns Objeto con el indicador de éxito y el historial reciente de reservas.
   */
  async getBookingHistory(id_user: string) {
    try {
      const reservas = await this.bookingRepository.find({
        where: { id_usuario: id_user },
        relations: {
          pista: {
            servicio: true,
          },
          comentarios: true,
        },
        order: {
          fecha: 'DESC',
          hora_inicio: 'DESC',
        },
        take: 10,
      });

      const data = reservas.map((reserva) => ({
        id_servicio: reserva.pista?.servicio?.id_deporte,
        servicio: reserva.pista?.servicio?.nombre,
        imagen_principal: reserva.pista?.servicio?.imagen_principal ?? null,
        pista: reserva.pista?.nombre,
        estado: reserva.estado,
        fecha:
          typeof reserva.fecha === 'string'
            ? reserva.fecha
            : reserva.fecha.toISOString().split('T')[0],
        horaInicio: reserva.hora_inicio,
        id_reserva: reserva.id_reserva,
        tieneResena: (reserva.comentarios?.length ?? 0) > 0,
      }));

      return {
        ok: true,
        data,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener el historial de reservas del usuario ${id_user}:`,
        error,
      );
      throw new InternalServerErrorException({
        ok: false,
        msg: 'Error interno al obtener las reservas del usuario',
      });
    }
  }

  /**
   * Transforma una entidad de reserva al formato requerido por las tarjetas de la aplicación móvil.
   *
   * @param reserva Entidad de la reserva con sus relaciones de cancha, servicio y comentarios.
   * @returns Objeto de reserva normalizado para el cliente móvil.
   */
  private mapMobileBooking(reserva: BookingEntity) {
    return {
      idReserva: reserva.id_reserva,
      idServicio: reserva.pista?.servicio?.id_deporte,
      servicio: reserva.pista?.servicio?.nombre ?? 'Deporte',
      imagenPrincipal: reserva.pista?.servicio?.imagen_principal ?? null,
      pista: reserva.pista?.nombre ?? 'Cancha sin asignar',
      estado: reserva.estado,
      fecha:
        typeof reserva.fecha === 'string'
          ? reserva.fecha
          : reserva.fecha.toISOString().split('T')[0],
      horaInicio: reserva.hora_inicio,
      horaTermino: reserva.hora_termino,
      precioCobrado: Number(reserva.precio_cobrado) || 0,
      tieneResena: (reserva.comentarios?.length ?? 0) > 0,
    };
  }

  /**
   * Transforma una entidad de usuario al contrato de perfil utilizado por la aplicación móvil.
   *
   * @param user Entidad del usuario obtenida de la base de datos.
   * @returns Objeto con los campos del perfil normalizados en camelCase.
   */
  private mapMobileProfileUser(user: UserEntity) {
    const birthDate = user.fecha_nacimiento;

    return {
      idUsuario: user.id_usuario,
      nombre: user.nombre,
      apellido: user.apellido ?? '',
      email: user.email,
      telefono: user.telefono ?? null,
      genero: user.genero ?? null,
      fechaNacimiento:
        typeof birthDate === 'string'
          ? birthDate
          : birthDate?.toISOString().split('T')[0] ?? null,
      imagen: user.imagen ?? null,
      roles: user.roles ?? [],
      isActive: user.is_active,
    };
  }

  /**
   * Busca la reseña más reciente asociada a una reserva específica.
   *
   * @param id_resena Identificador numérico de la reserva asociada al comentario.
   * @returns Objeto con el identificador, calificación y texto del comentario encontrado.
   */
  async getCommentById(id_resena: number, user?: UserEntity) {
    try {
      if (user) {
        await this.assertBookingOwnership(id_resena, user);
      }

      const resena = await this.commentRepository
        .createQueryBuilder('c')
        .select(['c.id_comentario', 'c.calificacion', 'c.comentario', 'c.is_active'])
        .where('c.id_reserva = :id_resena', { id_resena })
        .orderBy('c.id_comentario', 'DESC')
        .getOne();

      if (!resena) {
        throw new NotFoundException({
          msg: 'No se encontró ninguna reseña para esta reserva.',
          data: null,
        });
      }

      return {
        data: {
          id_comentario: resena.id_comentario,
          calificacion: resena.calificacion,
          comentario: resena.comentario,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.logger.error(
        `Error al obtener la reseña para la reserva ${id_resena}:`,
        error,
      );
      throw new InternalServerErrorException({
        ok: false,
        msg: 'Error interno al obtener la reseña',
      });
    }
  }

  /**
   * Crea una nueva reseña en estado inactivo para una reserva o actualiza la existente si ya existe.
   *
   * @param body Objeto con el identificador de reserva, servicio, calificación y texto del comentario.
   * @returns Respuesta con el estado de la operación, mensaje y la entidad de la reseña guardada.
   */
  async createComment(body: UpsertReviewDto, user?: UserEntity) {
    try {
      const idReserva = Number(body.id_reserva);
      const idDeporte = String(body.id_servicio ?? body.id_deporte ?? '').trim();

      if (!idReserva || !idDeporte) {
        throw new BadRequestException({
          ok: false,
          msg: 'La reserva y el servicio son obligatorios',
        });
      }

      if (user) {
        await this.assertBookingOwnership(idReserva, user);
      }

      const existente = await this.commentRepository
        .createQueryBuilder('c')
        .where('c.id_reserva = :idReserva', { idReserva })
        .getOne();

      if (existente) {
        return await this.updateComment(idReserva, body, user);
      }

      const nuevoComentario = this.commentRepository.create({
        id_deporte: idDeporte,
        calificacion: Number(body.calificacion),
        comentario: String(body.comentario ?? '').trim(),
        is_active: false,
        id_reserva: { id_reserva: idReserva } as BookingEntity,
      });

      const guardado = await this.commentRepository.save(nuevoComentario);

      return {
        ok: true,
        msg: 'Reseña publicada exitosamente',
        data: guardado,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Error al crear reseña:', error);
      throw new InternalServerErrorException({
        ok: false,
        msg: 'Error interno al crear la reseña',
      });
    }
  }

  /**
   * Actualiza la calificación y el texto de un comentario existente asociado a una reserva.
   *
   * @param id_reserva Identificador numérico de la reserva vinculada a la reseña.
   * @param body Nuevos valores de calificación y comentario.
   * @returns Objeto con el indicador de éxito, mensaje y el comentario actualizado.
   */
  async updateComment(
    id_reserva: number,
    body: UpsertReviewDto,
    user?: UserEntity,
  ) {
    try {
      const idReserva = Number(id_reserva || body.id_reserva);

      if (user) {
        await this.assertBookingOwnership(idReserva, user);
      }

      const resena = await this.commentRepository
        .createQueryBuilder('c')
        .where('c.id_reserva = :idReserva', { idReserva })
        .orderBy('c.id_comentario', 'DESC')
        .getOne();

      if (!resena) {
        throw new NotFoundException({
          ok: false,
          msg: `No se encontró ninguna reseña asociada a la reserva #${idReserva}`,
        });
      }

      resena.calificacion = Number(body.calificacion);
      resena.comentario = String(body.comentario ?? '').trim();

      const actualizado = await this.commentRepository.save(resena);

      return {
        ok: true,
        msg: 'Reseña actualizada exitosamente',
        data: actualizado,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar reseña de la reserva ${id_reserva}:`,
        error,
      );
      throw new InternalServerErrorException({
        ok: false,
        msg: 'Error interno al actualizar la reseña',
      });
    }
  }

  private async assertBookingOwnership(
    id_reserva: number,
    user: UserEntity,
  ): Promise<BookingEntity> {
    const reserva = await this.bookingRepository.findOne({
      where: { id_reserva },
      select: { id_reserva: true, id_usuario: true, estado: true },
    });

    if (!reserva) {
      throw new NotFoundException({
        ok: false,
        msg: `La reserva #${id_reserva} no existe`,
      });
    }

    const isAdmin =
      user.roles?.includes(ValidRoles.admin) ||
      user.roles?.includes(ValidRoles.superUser);

    if (reserva.id_usuario !== user.id_usuario && !isAdmin) {
      throw new ForbiddenException({
        ok: false,
        msg: 'No tienes permiso para acceder o reseñar una reserva de otro usuario',
      });
    }

    return reserva;
  }

  /**
   * Obtiene todas las reseñas realizadas por un usuario (activas e inactivas) incluyendo detalles de reserva y cancha.
   *
   * @param id_user Identificador UUID del usuario.
   * @returns Objeto con el indicador de éxito y el listado detallado de comentarios del usuario.
   */
  async getUserComments(id_user: string) {
    try {
      const comentarios = await this.commentRepository
        .createQueryBuilder('c')
        .innerJoinAndSelect('c.id_reserva', 'r')
        .innerJoinAndSelect('r.pista', 'p')
        .innerJoinAndSelect('p.servicio', 's')
        .where('r.id_usuario = :id_user', { id_user })
        .orderBy('c.created_at', 'DESC')
        .getMany();

      const resultado = comentarios.map((c) => {
        const reserva = c.id_reserva;
        const pista = reserva?.pista;
        const servicio = pista?.servicio;

        return {
          id_comentario: c.id_comentario,
          id_servicio: servicio?.id_deporte ?? c.id_deporte,
          nombre_servicio: servicio?.nombre,
          imagen_servicio: servicio?.imagen_principal,
          calificacion: c.calificacion,
          comentario: c.comentario,
          is_active: c.is_active ? 1 : 0,
          created_at: c.created_at,
          updated_at: c.updated_at,
          reserva: {
            id_reserva: reserva?.id_reserva,
            id_usuario: reserva?.id_usuario,
            fecha_visita:
              typeof reserva?.fecha === 'string'
                ? reserva.fecha
                : reserva?.fecha?.toISOString().split('T')[0],
            hora_visita: reserva?.hora_inicio,
            hora_termino: reserva?.hora_termino,
          },
          pista: {
            id_pista: pista?.id_pista,
            nombre: pista?.nombre,
          },
        };
      });

      return {
        ok: true,
        comentarios: resultado,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener los comentarios del usuario ${id_user}:`,
        error,
      );
      throw new InternalServerErrorException({
        ok: false,
        msg: 'Error interno al obtener los comentarios del usuario',
      });
    }
  }

  /**
   * Actualiza los datos personales, rol o estado de activación de un usuario en la base de datos.
   *
   * @param id_user Identificador UUID del usuario a modificar.
   * @param updateUserDto Campos del usuario que se desean actualizar.
   * @returns Objeto con el indicador de éxito, mensaje y la entidad del usuario guardada.
   */
  async updateUser(id_user: string, updateUserDto: UpdateUserDto) {
    try {
      const datosActualizar: Partial<UserEntity> = {
        id_usuario: id_user,
      };

      if (updateUserDto.nombre !== undefined) {
        datosActualizar.nombre = updateUserDto.nombre.trim();
      }
      if (updateUserDto.apellido !== undefined) {
        datosActualizar.apellido = updateUserDto.apellido?.trim() || '';
      }
      if (updateUserDto.telefono !== undefined) {
        datosActualizar.telefono =
          updateUserDto.telefono?.trim() || (null as any);
      }
      if (updateUserDto.email && updateUserDto.email.trim() !== '') {
        datosActualizar.email = updateUserDto.email.toLowerCase().trim();
      }
      if (updateUserDto.genero !== undefined) {
        datosActualizar.genero =
          updateUserDto.genero !== ('' as any) && updateUserDto.genero !== null
            ? updateUserDto.genero
            : (null as any);
      }
      if (updateUserDto.fecha_nacimiento !== undefined) {
        datosActualizar.fecha_nacimiento =
          updateUserDto.fecha_nacimiento &&
          updateUserDto.fecha_nacimiento.trim() !== ''
            ? (updateUserDto.fecha_nacimiento as any)
            : (null as any);
      }

      const usuarioPreload = await this.userRepository.preload(datosActualizar);

      if (!usuarioPreload) {
        throw new NotFoundException({
          ok: false,
          msg: `El usuario con id ${id_user} no existe`,
        });
      }

      const usuarioActualizado = await this.userRepository.save(usuarioPreload);

      return {
        ok: true,
        msg: 'Perfil actualizado correctamente',
        usuario: usuarioActualizado,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error?.code === '23505') {
        throw new BadRequestException({
          ok: false,
          msg: 'El correo electrónico ya está registrado por otro usuario',
        });
      }

      this.logger.error(
        `Error al actualizar el perfil del usuario ${id_user}:`,
        error,
      );
      throw new InternalServerErrorException({
        ok: false,
        msg: 'Error interno al editar el perfil del usuario',
      });
    }
  }

  /**
   * Calcula la fecha y hora actuales en la zona horaria `America/Santiago` junto con los límites del mes actual y anterior.
   *
   * @returns Objeto con `fechaActual`, `horaActual` y los rangos de inicio y fin de mes.
   */
  private obtenerRangosDeFechas() {
    const ahora = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: BUSINESS_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(ahora);
    const getPart = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value);
    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');
    const formatDate = (valueYear: number, valueMonth: number, valueDay: number) =>
      `${valueYear}-${String(valueMonth).padStart(2, '0')}-${String(valueDay).padStart(2, '0')}`;
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousMonthYear = month === 1 ? year - 1 : year;
    const lastDayCurrentMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const lastDayPreviousMonth = new Date(
      Date.UTC(previousMonthYear, previousMonth, 0),
    ).getUTCDate();

    const fechaActual = formatDate(year, month, day);
    const horaActual = [hour, minute, second]
      .map((value) => String(value).padStart(2, '0'))
      .join(':');
    const inicioMesActual = formatDate(year, month, 1);
    const finMesActual = formatDate(year, month, lastDayCurrentMonth);
    const inicioMesAnterior = formatDate(previousMonthYear, previousMonth, 1);
    const finMesAnterior = formatDate(
      previousMonthYear,
      previousMonth,
      lastDayPreviousMonth,
    );

    return {
      fechaActual,
      horaActual,
      inicioMesActual,
      finMesActual,
      inicioMesAnterior,
      finMesAnterior,
    };
  }
}
