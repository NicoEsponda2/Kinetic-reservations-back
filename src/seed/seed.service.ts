import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity.js';
import { SportEntity } from '../modules/sports/entities/sport.entity.js';
import { BookingEntity } from '../modules/bookings/entities/booking.entity.js';
import { PaymentEntity } from '../modules/payments/entities/payment.entity.js';
import { CommentsEntity } from '../modules/comments/entities/comment.entity.js';
import { initialData } from './data/seed-data.js';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(SportEntity)
    private readonly sportRepository: Repository<SportEntity>,

    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,

    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,

    @InjectRepository(CommentsEntity)
    private readonly commentRepository: Repository<CommentsEntity>,
  ) { }

  /**
   * Reinicia las tablas principales e inserta los usuarios, deportes, reservas, pagos y comentarios de prueba.
   *
   * @returns Mensaje de texto confirmando que los datos de prueba han sido cargados.
   */
  async runSeed() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'La ejecución de datos de prueba (seed) no está permitida en producción',
      );
    }

    await this.deleteTables();

    const users = await this.insertUsers();

    // Insert deportes con pistas, horarios e imágenes y se obtienen los nuevos UUID
    const sports = await this.insertNewProducts();

    await this.insertBookingsPaymentsAndComments(users, sports);

    return 'DATOS DE PRUEBA CARGADOS';
  }

  /**
   * Vacía todas las tablas principales de la base de datos reiniciando sus secuencias en cascada.
   *
   * @returns Promesa resuelta una vez truncadas las tablas y liberada la conexión.
   */
  private async deleteTables() {
    const queryRunner =
      this.sportRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.query(
        `TRUNCATE TABLE "users", "sports", "bookings", "payments", "comments" RESTART IDENTITY CASCADE;`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Crea e inserta en la base de datos los usuarios definidos en los datos iniciales de prueba.
   *
   * @returns Arreglo con las entidades de usuarios insertadas en la base de datos.
   */
  private async insertUsers(): Promise<UserEntity[]> {
    const seedUsers = initialData.users;
    const users: UserEntity[] = [];

    for (const user of seedUsers) {
      const nuevoUsuario = this.userRepository.create(user as any);
      const usuarioGuardado = await this.userRepository.save(nuevoUsuario);
      users.push(usuarioGuardado as unknown as UserEntity);
    }

    return users;
  }

  /**
   * Inserta los servicios deportivos iniciales junto con sus canchas, imágenes y bloques horarios por defecto.
   *
   * @returns Arreglo con las entidades de deportes guardadas y sus respectivos UUID generados.
   */
  private async insertNewProducts(): Promise<SportEntity[]> {
    const sports = initialData.sports;
    const savedSports: SportEntity[] = [];

    for (const sport of sports) {
      const horariosDefault = [];
      for (let dia = 1; dia <= 5; dia++) {
        horariosDefault.push(
          {
            dia_semana: dia,
            hora_inicio: '09:00',
            hora_termino: '14:00',
            is_active: true,
          },
          {
            dia_semana: dia,
            hora_inicio: '15:00',
            hora_termino: '20:00',
            is_active: true,
          },
        );
      }

      const imagenesMapeadas = sport.imagenes
        ? sport.imagenes.map((urlImg) => ({ url: urlImg }))
        : [];

      const sportDataToCreate = {
        ...sport,
        horarios: horariosDefault,
        imagenes: imagenesMapeadas,
        pistas: sport.pistas || [],
      };

      const nuevoDeporte = this.sportRepository.create(
        sportDataToCreate as any,
      );
      const deporteGuardado = await this.sportRepository.save(nuevoDeporte);
      savedSports.push(deporteGuardado as unknown as SportEntity);
    }

    return savedSports;
  }

  /**
   * Inserta las reservas de prueba junto con sus pagos y reseñas vinculándolas a los usuarios y deportes creados.
   *
   * @param users Lista de entidades de usuarios previamente insertados.
   * @param sports Lista de entidades de deportes previamente insertados con sus canchas.
   * @returns Promesa resuelta al finalizar el registro de reservas, pagos y comentarios.
   */
  private async insertBookingsPaymentsAndComments(
    users: UserEntity[],
    sports: SportEntity[],
  ) {
    // Obtenemos los usuarios con rol 'user'
    const usuariosConRolUser = users.filter((user) =>
      user.roles.includes('user'),
    );

    const seedBookings = initialData.bookings;

    for (let i = 0; i < seedBookings.length; i++) {
      const datosReserva = seedBookings[i];
      if (!datosReserva) continue;

      // Determinamos el usuario: si tiene user_index asignado usamos ese, sino 2 por cada usuario
      const userIndex =
        datosReserva.user_index !== undefined
          ? datosReserva.user_index
          : Math.floor(i / 2);
      const usuario =
        usuariosConRolUser[userIndex] || usuariosConRolUser[0];

      const userUuid = (usuario as any).id_usuario || (usuario as any).id;

      // 1. Crear y guardar la Reserva
      const nuevaReserva = this.bookingRepository.create({
        id_pista: datosReserva.id_pista,
        id_usuario: userUuid,
        fecha: datosReserva.fecha as any,
        hora_inicio: datosReserva.hora_inicio,
        hora_termino: datosReserva.hora_termino,
        precio_cobrado: datosReserva.precio_cobrado,
        estado: datosReserva.estado,
        comentario: datosReserva.comentario,
      });

      const reservaGuardada = await this.bookingRepository.save(nuevaReserva);

      // 2. Crear y guardar el Pago asociado a la reserva
      const nuevoPago = this.paymentRepository.create({
        id_reserva: reservaGuardada.id_reserva,
        monto: datosReserva.pago.monto,
        metodo_pago: datosReserva.pago.metodo_pago,
        estado_pago: datosReserva.pago.estado_pago,
        token_transaccion: datosReserva.pago.token_transaccion,
      });

      await this.paymentRepository.save(nuevoPago);

      // 3. Buscar dinámicamente el UUID del deporte al que pertenece la pista reservada
      const deporteAsociado =
        sports.find((s) =>
          s.pistas?.some((p) => p.id_pista === datosReserva.id_pista),
        ) || sports[0];

      // 4. Crear y guardar el Comentario asociado a la reserva y al UUID del deporte (solo si la reserva tiene comentario)
      if (datosReserva.detalle_comentario && deporteAsociado) {
        const nuevoComentario = this.commentRepository.create({
          id_deporte: deporteAsociado.id_deporte,
          calificacion: datosReserva.detalle_comentario.calificacion,
          comentario: datosReserva.detalle_comentario.comentario,
          is_active: datosReserva.detalle_comentario.is_active,
          id_reserva: reservaGuardada, // TypeORM extrae automáticamente el id_reserva de la entidad
        });

        await this.commentRepository.save(nuevoComentario);
      }
    }
  }
}
