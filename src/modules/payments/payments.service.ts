import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
// 1. Importamos el paquete completo como default para compatibilidad con ESM
import transbankSdk from 'transbank-sdk';
import { CommitPaymentDto, InitPaymentDto } from './dto/create-payment.dto.js';
import { BookingEntity } from '../bookings/entities/booking.entity.js';
import { PaymentEntity } from './entities/payment.entity.js';
import { CourtEntity } from '../courts/entities/court.entity.js';
import { UserEntity } from '../../auth/entities/user.entity.js';
import { ValidRoles } from '../../auth/interfaces/valid-roles.js';
import { isBusinessDateTimePast } from '../../common/utils/business-time.util.js';

interface PendingPaymentIntent {
  idUsuario: string;
  idPista?: number;
  fecha?: string;
  horaInicio?: string;
  horaTermino?: string;
  monto: number;
  expiresAt: number;
}

// 2. Desestructuramos las clases desde el objeto principal
const {
  WebpayPlus,
  Options,
  IntegrationCommerceCodes,
  IntegrationApiKeys,
  Environment,
} = transbankSdk;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  // 3. Ajustamos el tipado de tx para que no dependa del namespace directo
  private readonly tx: any;
  private readonly frontendUrl: string;
  private readonly backendUrl: string;
  private readonly mobilePaymentReturnUrl?: string;
  private readonly mobilePaymentCallbackUrl: string;
  private readonly pendingIntents = new Map<string, PendingPaymentIntent>();

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.tx = new WebpayPlus.Transaction(
      new Options(
        IntegrationCommerceCodes.WEBPAY_PLUS,
        IntegrationApiKeys.WEBPAY,
        Environment.Integration,
      ),
    );

    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    this.backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    this.mobilePaymentReturnUrl = this.configService
      .get<string>('MOBILE_PAYMENT_RETURN_URL')
      ?.trim();
    this.mobilePaymentCallbackUrl =
      this.configService.get<string>('MOBILE_PAYMENT_CALLBACK_URL') ||
      'http://localhost:8080/confirmacion_reserva?payment_callback=1';
  }

  /**
   * Crea una transacción en Webpay Plus y genera el token junto con la URL de pago para web.
   *
   * @param dto Datos iniciales del pago (reserva, usuario, rol y monto).
   * @returns Objeto con el indicador de éxito, la URL del formulario Webpay y el token generado.
   */
  async iniciarPago(dto: InitPaymentDto, user?: UserEntity) {
    const { id_reserva, role } = dto;
    const idUsuarioEfectivo = user?.id_usuario || String(dto.id_usuario);

    if (
      dto.fecha &&
      dto.hora_inicio &&
      isBusinessDateTimePast(dto.fecha, dto.hora_inicio)
    ) {
      throw new BadRequestException(
        'No se puede reservar un horario que ya haya comenzado',
      );
    }

    let montoCobrar = Number(dto.monto);

    if (dto.id_pista !== undefined && dto.id_pista !== null) {
      const courtRepo = this.dataSource.getRepository(CourtEntity);
      const court = await courtRepo.findOne({
        where: { id_pista: Number(dto.id_pista), is_active: true },
      });

      if (!court) {
        throw new BadRequestException(
          'La cancha seleccionada no existe o no se encuentra disponible',
        );
      }

      montoCobrar = Number(court.precio_hora);

      if (dto.fecha && dto.hora_inicio && dto.hora_termino) {
        const bookingRepo = this.dataSource.getRepository(BookingEntity);
        const solapada = await bookingRepo
          .createQueryBuilder('r')
          .where('r.id_pista = :idPista', { idPista: Number(dto.id_pista) })
          .andWhere('r.fecha = :fecha', { fecha: dto.fecha })
          .andWhere("LOWER(r.estado) NOT IN ('cancelada', 'cancelado')")
          .andWhere(
            'r.hora_inicio < :horaTermino AND r.hora_termino > :horaInicio',
            {
              horaInicio: dto.hora_inicio,
              horaTermino: dto.hora_termino,
            },
          )
          .getOne();

        if (solapada) {
          throw new BadRequestException(
            'El horario seleccionado ya se encuentra reservado',
          );
        }
      }
    }

    if (!Number.isFinite(montoCobrar) || montoCobrar <= 0) {
      throw new BadRequestException('El monto del pago no es válido');
    }

    const roleParam = Array.isArray(role)
      ? role.includes('admin')
        ? '2'
        : '3'
      : String(role ?? '3');

    const buyOrder = `RES-${id_reserva}`;
    const sessionId = `USR-${idUsuarioEfectivo}`;
    const returnUrl = `${this.backendUrl}/api/payment/return?role=${encodeURIComponent(roleParam)}`;

    try {
      const createResponse = await this.tx.create(
        buyOrder,
        sessionId,
        montoCobrar,
        returnUrl,
      );

      this.cleanupExpiredIntents();
      this.pendingIntents.set(createResponse.token, {
        idUsuario: idUsuarioEfectivo,
        idPista: dto.id_pista ? Number(dto.id_pista) : undefined,
        fecha: dto.fecha,
        horaInicio: dto.hora_inicio,
        horaTermino: dto.hora_termino,
        monto: montoCobrar,
        expiresAt: Date.now() + 30 * 60_000,
      });

      return {
        ok: true,
        url: createResponse.url,
        token: createResponse.token,
      };
    } catch (error) {
      this.logger.error('Error al iniciar pago en Transbank:', error);
      throw new InternalServerErrorException(
        'No se pudo conectar con el banco',
      );
    }
  }

  /**
   * Determina la URL del frontend a la cual redirigir según los tokens devueltos por Transbank.
   *
   * @param params Objeto con los posibles tokens (`token_ws`, `TBK_TOKEN`) y el rol del usuario.
   * @returns Objeto con la URL completa hacia la vista de confirmación o cancelación en el frontend.
   */
  resolverRedireccionRetorno(params: {
    token_ws?: string;
    TBK_TOKEN?: string;
    role?: string;
  }): { url: string } {
    const { token_ws, TBK_TOKEN, role } = params;
    const basePath = role === '2' ? '/admin' : '/panel-usuario';

    try {
      // Caso A: Pago anulado por el usuario en el formulario de Webpay
      if (TBK_TOKEN && !token_ws) {
        return {
          url: `${this.frontendUrl}${basePath}/nueva-reserva?status=cancelado`,
        };
      }

      // Caso B: Flujo normal finalizado (aprobado o rechazado)
      if (token_ws) {
        return {
          url: `${this.frontendUrl}${basePath}/confirmacion-reserva?token_ws=${token_ws}&role=${role}`,
        };
      }

      // Caso C: Timeout o retorno sin tokens
      this.logger.warn('Evento: Retorno de Transbank sin tokens válidos.');
      return { url: `${this.frontendUrl}/` };
    } catch (error) {
      this.logger.error('Error crítico en retornoTransbank:', error);
      return { url: `${this.frontendUrl}/?error=true` };
    }
  }

  /**
   * Confirma el pago en Transbank mediante `token_ws` y persiste la reserva y el pago en una transacción.
   *
   * @param dto Objeto con el token de Webpay y la información detallada de la reserva.
   * @returns Resumen de la transacción autorizada junto con el identificador de la reserva guardada.
   */
  async commitPago(dto: CommitPaymentDto, user?: UserEntity) {
    const { tokenWs, datosReserva } = dto;

    const existingPayment = await this.dataSource
      .getRepository(PaymentEntity)
      .findOne({ where: { token_transaccion: tokenWs } });

    if (existingPayment) {
      throw new BadRequestException({
        ok: false,
        msg: 'Esta transacción ya fue confirmada previamente',
      });
    }

    const intent = this.pendingIntents.get(tokenWs);
    const isAdmin =
      user?.roles?.includes(ValidRoles.admin) ||
      user?.roles?.includes(ValidRoles.superUser);

    if (
      user &&
      !isAdmin &&
      intent &&
      intent.idUsuario !== user.id_usuario
    ) {
      throw new ForbiddenException({
        ok: false,
        msg: 'La transacción de pago no pertenece al usuario autenticado',
      });
    }

    const idUsuarioFinal = isAdmin
      ? (intent?.idUsuario ?? datosReserva?.idUsuario ?? user?.id_usuario)
      : (user?.id_usuario ?? intent?.idUsuario ?? datosReserva?.idUsuario);
    const idPistaFinal = Number(intent?.idPista ?? datosReserva?.idPista);
    const fechaFinal = intent?.fecha ?? datosReserva?.fecha;
    const horaInicioFinal = intent?.horaInicio ?? datosReserva?.horaInicio;
    const horaTerminoFinal = intent?.horaTermino ?? datosReserva?.horaTermino;

    if (
      !idUsuarioFinal ||
      !Number.isFinite(idPistaFinal) ||
      idPistaFinal <= 0 ||
      !fechaFinal ||
      !horaInicioFinal ||
      !horaTerminoFinal
    ) {
      throw new BadRequestException({
        ok: false,
        msg: 'Faltan datos de la reserva para confirmar el pago',
      });
    }

    if (isBusinessDateTimePast(fechaFinal, horaInicioFinal)) {
      throw new BadRequestException(
        'No se puede reservar un horario que ya haya comenzado',
      );
    }

    let result: any;
    try {
      result = await this.tx.commit(tokenWs);
    } catch (error) {
      this.logger.error('Error al confirmar token en Transbank:', error);
      throw new InternalServerErrorException(
        'Error al validar la transacción con Transbank',
      );
    }

    if (result.status !== 'AUTHORIZED') {
      throw new BadRequestException({
        ok: false,
        status: result.status,
        msg: 'El pago no fue autorizado por el banco',
      });
    }

    // Iniciamos transacción de base de datos igual que en SportService
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const court = await queryRunner.manager.findOne(CourtEntity, {
        where: { id_pista: idPistaFinal, is_active: true },
        relations: { servicio: true },
      });

      if (!court) {
        throw new BadRequestException({
          ok: false,
          msg: 'La cancha seleccionada no existe o no está disponible',
        });
      }

      if (Number(result.amount) !== Number(court.precio_hora)) {
        throw new BadRequestException({
          ok: false,
          msg: 'El monto pagado no coincide con la tarifa oficial de la cancha',
        });
      }

      const solapada = await queryRunner.manager
        .createQueryBuilder(BookingEntity, 'r')
        .where('r.id_pista = :idPista', { idPista: idPistaFinal })
        .andWhere('r.fecha = :fecha', { fecha: fechaFinal })
        .andWhere("LOWER(r.estado) NOT IN ('cancelada', 'cancelado')")
        .andWhere(
          'r.hora_inicio < :horaTermino AND r.hora_termino > :horaInicio',
          {
            horaInicio: horaInicioFinal,
            horaTermino: horaTerminoFinal,
          },
        )
        .getOne();

      if (solapada) {
        throw new BadRequestException({
          ok: false,
          msg: 'El bloque horario seleccionado ya se encuentra reservado',
        });
      }

      // 1. Crear registro en la tabla 'reservas'
      const nuevaReserva = queryRunner.manager.create(BookingEntity, {
        id_usuario: idUsuarioFinal,
        id_pista: idPistaFinal,
        fecha: fechaFinal as any,
        hora_inicio: horaInicioFinal,
        hora_termino: horaTerminoFinal,
        estado: 'Pagada',
        comentario: datosReserva?.comentario || null,
        precio_cobrado: Number(court.precio_hora),
      });

      const reservaGuardada = await queryRunner.manager.save(
        BookingEntity,
        nuevaReserva,
      );

      // 2. Crear registro en la tabla 'pagos' vinculado a la reserva creada
      const nuevoPago = queryRunner.manager.create(PaymentEntity, {
        id_reserva: reservaGuardada.id_reserva,
        monto: result.amount,
        metodo_pago: 'Webpay Plus',
        estado_pago: 'Aprobado',
        token_transaccion: tokenWs,
      });

      await queryRunner.manager.save(PaymentEntity, nuevoPago);

      await queryRunner.commitTransaction();
      this.pendingIntents.delete(tokenWs);

      // 3. Disparo asíncrono del correo de confirmación (no bloquea la respuesta)
      /*
      enviarConfirmacionReserva({
        emailDestino: datosReserva?.email,
        nombreUsuario: datosReserva?.nombreUsuario,
        cancha: datosReserva?.nombreCancha,
        fecha: datosReserva?.fecha,
        horaInicio: datosReserva?.horaInicio,
        horaTermino: datosReserva?.horaTermino,
        monto: result.amount,
        buyOrder: result.buy_order,
      }).catch((err) => this.logger.error('⚠️ Error enviando correo:', err));
      */

      return {
        ok: true,
        status: result.status,
        amount: result.amount,
        buyOrder: result.buy_order,
        cardNumber: result.card_detail?.card_number,
        id_reserva: reservaGuardada.id_reserva,
        courtName: court.nombre,
        courtType: court.servicio?.nombre ?? undefined,
        imageUrl: court.servicio?.imagen_principal ?? null,
        fecha: fechaFinal,
        schedule: `${String(horaInicioFinal).slice(0, 5)} - ${String(horaTerminoFinal).slice(0, 5)}`,
        msg: 'Reserva y pago registrados exitosamente',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Error guardando reserva y pago en BD:', error);
      throw new InternalServerErrorException(
        'Hubo un problema al registrar la reserva',
      );
    } finally {
      await queryRunner.release();
    }
  }

  private cleanupExpiredIntents(): void {
    const now = Date.now();
    for (const [token, intent] of this.pendingIntents.entries()) {
      if (intent.expiresAt <= now) {
        this.pendingIntents.delete(token);
      }
    }
  }

  /**
   * Inicia una transacción en Webpay Plus configurada para el retorno hacia la aplicación móvil.
   *
   * @param dto Datos iniciales de la reserva, usuario y monto a cobrar.
   * @param requestReturnUrl URL de retorno opcional inferida desde el host de la petición HTTP.
   * @returns Objeto con la URL de Webpay, el token y la URL de callback para la aplicación móvil.
   */
  async iniciarPagoMovil(dto: InitPaymentDto, requestReturnUrl?: string) {
    try {
      const { id_reserva, id_usuario, monto } = dto;

      const buyOrder = `RES-${id_reserva}`;
      const sessionId = `USR-${id_usuario}`;
      const returnUrl =
        this.mobilePaymentReturnUrl ||
        requestReturnUrl ||
        `${this.backendUrl}/api/payment/mobile-app-return`;

      const createResponse = await this.tx.create(
        buyOrder,
        sessionId,
        monto,
        returnUrl,
      );

      return {
        ok: true,
        url: createResponse.url,
        token: createResponse.token,
        callbackUrl: this.mobilePaymentCallbackUrl,
      };
    } catch (error) {
      this.logger.error('Error al iniciar pago móvil en Transbank:', error);
      throw new InternalServerErrorException(
        'No se pudo conectar con el banco desde la app',
      );
    }
  }

  /**
   * Construye la URL de redirección final con los tokens de Transbank para que la app móvil la intercepte.
   *
   * @param params Tokens recibidos desde Transbank (`token_ws` o `TBK_TOKEN`).
   * @returns Objeto con la URL de callback móvil formateada con los parámetros de resultado.
   */
  resolverRedireccionRetornoMovil(params: {
    token_ws?: string;
    TBK_TOKEN?: string;
  }): { url: string } {
    const callbackUrl = new URL(this.mobilePaymentCallbackUrl);

    if (params.token_ws) {
      callbackUrl.searchParams.set('token_ws', params.token_ws);
    } else if (params.TBK_TOKEN) {
      callbackUrl.searchParams.set('TBK_TOKEN', params.TBK_TOKEN);
    } else {
      callbackUrl.searchParams.set('status', 'error');
    }

    return { url: callbackUrl.toString() };
  }
}
