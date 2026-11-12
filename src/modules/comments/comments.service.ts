import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';
import { UpsertReviewDto } from './dto/upsert-review.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { CommentsEntity } from './entities/comment.entity.js';
import { BookingEntity } from '../bookings/entities/booking.entity.js';
import { UserEntity } from '../../auth/entities/user.entity.js';
import { ValidRoles } from '../../auth/interfaces/valid-roles.js';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dtos/pagination.dto.js';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger('CommentsService');

  private readonly DEFAULT_AVATAR =
    'https://res.cloudinary.com/dhwoq5fdq/image/upload/f_auto,q_auto,w_800/v1792590759/KINETIC-RESERVATIONS/Static/xila8me2itmgmwxnskzy.jpg';

  constructor(
    @InjectRepository(CommentsEntity)
    private readonly commentRepository: Repository<CommentsEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
  ) {}

  /**
   * Crea un nuevo comentario en estado inactivo por defecto para su posterior moderación.
   *
   * @param createCommentDto Datos del comentario a crear.
   * @returns Entidad del comentario almacenada en la base de datos.
   */
  async create(createCommentDto: CreateCommentDto, user?: UserEntity) {
    try {
      if (user) {
        await this.assertBookingOwnership(createCommentDto.reserva, user);
      }

      const comment = this.commentRepository.create({
        ...createCommentDto,
        is_active: false,
      });
      return await this.commentRepository.save(comment);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.handleDBExceptions(error);
    }
  }

  /**
   * Crea una nueva reseña inactiva para una reserva o actualiza la reseña si ya existe una previa.
   *
   * @param body Objeto con el identificador de la reserva, deporte, calificación y texto del comentario.
   * @returns Respuesta con el estado de la operación, mensaje de confirmación y la reseña guardada.
   */
  async crearResena(body: UpsertReviewDto, user?: UserEntity) {
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
        return await this.actualizarResena(idReserva, body, user);
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
   * Actualiza la calificación y el comentario de una reseña existente asociada a una reserva.
   *
   * @param id_reserva Identificador numérico de la reserva asociada.
   * @param body Datos actualizados de calificación y comentario.
   * @returns Respuesta con el indicador de éxito, mensaje y la entidad del comentario actualizado.
   */
  async actualizarResena(
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
        msg: 'No tienes permiso para comentar o modificar una reseña de otro usuario',
      });
    }

    return reserva;
  }

  /**
   * Obtiene todos los comentarios registrados proyectando datos de usuario y deporte para administración.
   *
   * @param _paginationDto Parámetros de paginación de la consulta.
   * @returns Objeto con el listado plano de comentarios para la tabla administrativa.
   */
  async findAllAdmin(_paginationDto: PaginationDto) {
    try {
      // 1. Cargamos los comentarios proyectando únicamente las columnas necesarias
      const comentarios = await this.commentRepository.find({
        relations: {
          id_reserva: {
            usuario: true,
            pista: {
              servicio: true,
            },
          },
        },
        select: {
          id_comentario: true,
          calificacion: true,
          comentario: true,
          created_at: true,
          is_active: true,
          id_reserva: {
            id_reserva: true,
            id_usuario: true,
            usuario: {
              id_usuario: true,
              nombre: true,
              apellido: true,
            },
            pista: {
              id_pista: true,
              servicio: {
                id_deporte: true,
                nombre: true,
              },
            },
          },
        },
        order: {
          id_comentario: 'DESC',
        },
      });

      // 2. Mapeamos la estructura plana que espera el frontend
      const data = comentarios.map((item) => {
        const reserva = item.id_reserva;
        const usuario = reserva?.usuario as any;

        const partesNombre = (usuario?.nombre || '').trim().split(' ');
        const nombre = usuario?.apellido
          ? usuario.nombre
          : partesNombre[0] || '';
        const apellido =
          usuario?.apellido ?? (partesNombre.slice(1).join(' ') || '');

        return {
          id_comentario: item.id_comentario,
          id_usuario:
            reserva?.id_usuario || usuario?.id_usuario || usuario?.id,
          nombre: nombre,
          apellido: apellido,
          deporte: reserva?.pista?.servicio?.nombre || 'General',
          calificacion: item.calificacion,
          comentario: item.comentario,
          created_at: item.created_at,
          is_active: item.is_active ? 1 : 0,
        };
      });

      return {
        data,
      };
    } catch (error) {
      this.logger.error('Error al obtener los comentarios:', error);
      throw new InternalServerErrorException({
        ok: false,
        msg: 'Error interno al cargar los comentarios',
      });
    }
  }

  /**
   * Obtiene un título descriptivo predeterminado según la puntuación numérica de la reseña.
   *
   * @param calificacion Puntuación numérica de 1 a 5 estrellas.
   * @returns Título representativo de la calificación otorgada.
   */
  private obtenerTituloPorCalificacion(calificacion: number): string {
    const titulos: Record<number, string> = {
      5: '¡Excelente experiencia!',
      4: 'Muy buen servicio',
      3: 'Buena experiencia',
      2: 'Podría mejorar',
      1: 'Mala experiencia',
    };
    return titulos[calificacion] || 'Opinión del cliente';
  }

  /**
   * Formatea una fecha al formato legible en español de Chile (día, mes y año).
   *
   * @param fecha Fecha en formato `Date` o cadena de texto.
   * @returns Cadena de texto con la fecha formateada en español.
   */
  private formatearFechaEspanol(fecha: Date | string): string {
    const dateObj = new Date(fecha);
    return new Intl.DateTimeFormat('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(dateObj);
  }

  /**
   * Obtiene y formatea los comentarios activos para su visualización en la página de inicio.
   *
   * @returns Objeto con el listado de comentarios activos enriquecidos con título, fecha y avatar.
   */
  async findHomePage() {
    try {
      const comentarios = await this.commentRepository.find({
        where: {
          is_active: true,
        },
        relations: {
          id_reserva: {
            usuario: true,
            pista: {
              servicio: true,
            },
          },
        },
        select: {
          id_comentario: true,
          calificacion: true,
          comentario: true,
          created_at: true,
          id_reserva: {
            id_reserva: true,
            usuario: {
              id_usuario: true,
              nombre: true,
              apellido: true,
              imagen: true,
            },
            pista: {
              id_pista: true,
              servicio: {
                id_deporte: true,
                nombre: true,
              },
            },
          },
        },
        order: {
          created_at: 'DESC',
        },
      });

      const comentariosFormateados = comentarios.map((item) => {
        const reserva = item.id_reserva;
        const usuario = reserva?.usuario;
        const deporteNombre = reserva?.pista?.servicio?.nombre || 'Deporte';
        const nombreCompleto =
          [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ') ||
          'Usuario';

        return {
          deporte: deporteNombre,
          titulo: this.obtenerTituloPorCalificacion(item.calificacion),
          calificacion: item.calificacion,
          comentario: item.comentario,
          nombre: nombreCompleto,
          fecha: this.formatearFechaEspanol(item.created_at),
          avatar: usuario?.imagen || this.DEFAULT_AVATAR,
        };
      });

      return {
        comentarios: comentariosFormateados,
      };
    } catch (error) {
      this.logger.error('Error al obtener comentarios para el Home:', error);
      throw new InternalServerErrorException({
        ok: false,
        msg: 'Error interno al cargar los comentarios del home',
      });
    }
  }

  /**
   * Devuelve un mensaje descriptivo para la consulta de un comentario por su ID.
   *
   * @param id Identificador numérico del comentario.
   * @returns Texto informativo con el identificador del comentario.
   */
  findOne(id: number) {
    return `Esta acción devuelve el comentario n.º ${id}`;
  }

  /**
   * Devuelve un mensaje descriptivo para la actualización de un comentario por su ID.
   *
   * @param id Identificador numérico del comentario.
   * @param _updateCommentDto Datos parciales para actualizar el comentario.
   * @returns Texto informativo indicando la actualización del comentario.
   */
  update(id: number, _updateCommentDto: UpdateCommentDto) {
    return `Esta acción actualiza el comentario n.º ${id}`;
  }

  /**
   * Devuelve un mensaje descriptivo para la eliminación de un comentario por su ID.
   *
   * @param id Identificador numérico del comentario.
   * @returns Texto informativo indicando la eliminación del comentario.
   */
  remove(id: number) {
    return `Esta acción elimina el comentario n.º ${id}`;
  }

  /**
   * Centraliza el manejo de excepciones de base de datos en las operaciones de comentarios.
   *
   * @param error Error capturado durante la consulta o persistencia.
   * @returns Lanza una excepción HTTP acorde al tipo de error de base de datos.
   */
  private handleDBExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    this.logger.error(error);

    throw new InternalServerErrorException('Error creating comment');
  }

  /**
   * Elimina todos los registros de comentarios de la base de datos (utilizado en el seed).
   *
   * @returns Resultado de la operación de borrado masivo.
   */
  async deleteAllComments() {
    const query = this.commentRepository.createQueryBuilder('comment');
    try {
      return await query.delete().execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}
