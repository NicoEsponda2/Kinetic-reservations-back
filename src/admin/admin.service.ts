import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../modules/bookings/entities/booking.entity.js';
import { CourtEntity } from '../modules/courts/entities/court.entity.js';
import { SportsScheduleEntity } from '../modules/sports-schedules/entities/sports-schedule.entity.js';
import { CommentsEntity } from '../modules/comments/entities/comment.entity.js';
import { UserEntity } from '../auth/entities/user.entity.js';
import { getBusinessDateTime } from '../common/utils/business-time.util.js';

export interface DailyTrendPoint {
  fecha: string;
  etiqueta: string;
  completadas: number;
  canceladas: number;
  ingresos: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private static readonly DIAS_CORTOS = [
    'Dom',
    'Lun',
    'Mar',
    'Mié',
    'Jue',
    'Vie',
    'Sáb',
  ];

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(CourtEntity)
    private readonly courtRepository: Repository<CourtEntity>,
    @InjectRepository(SportsScheduleEntity)
    private readonly scheduleRepository: Repository<SportsScheduleEntity>,
    @InjectRepository(CommentsEntity)
    private readonly commentRepository: Repository<CommentsEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * Construye las métricas y la actividad del panel administrativo.
   *
   * @returns Una promesa con los indicadores, tendencias, canchas y reservas próximas.
   */
  async getDashboardData() {
    try {
      const [reservas, pistas, horarios] = await Promise.all([
        this.bookingRepository.find({
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
            estado: true,
            precio_cobrado: true,
            usuario: {
              id_usuario: true,
              nombre: true,
              apellido: true,
              email: true,
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
        }),
        this.courtRepository.find({
          where: { is_active: true },
          relations: { servicio: true },
          select: {
            id_pista: true,
            nombre: true,
            is_active: true,
            precio_hora: true,
            servicio: {
              id_deporte: true,
              nombre: true,
              is_active: true,
            },
          },
          order: { id_pista: 'ASC' },
        }),
        this.scheduleRepository.find({
          where: { is_active: true },
          select: {
            id_horario: true,
            dia_semana: true,
            hora_termino: true,
            is_active: true,
          },
        }),
      ]);

      // Fechas de todas las reservas a 'YYYY-MM-DD'
      const reservasNormalizadas = reservas.map((r) => ({
        raw: r,
        fechaStr: this.normalizeDate(r.fecha),
        estadoLower: (r.estado || '').toLowerCase().trim(),
        monto: Number(r.precio_cobrado) || 0,
      }));

      // Fecha y hora real actual en la zona horaria comercial (America/Santiago)
      const { date: hoyIso, time: horaActualChile } = getBusinessDateTime();
      const ahoraMinutos = this.timeToMinutes(horaActualChile);

      const hayReservasHoy = reservasNormalizadas.some(
        (r) => r.fechaStr === hoyIso,
      );
      const fechaReferenciaIso =
        hayReservasHoy || reservasNormalizadas.length === 0
          ? hoyIso
          : reservasNormalizadas[0].fechaStr;

      const refDate = this.parseIsoDate(fechaReferenciaIso);
      const ranges = this.buildDateRanges(refDate);

      // 1. Cálculo de KPIs en una sola pasada O(N)
      let ingresosTotales = 0;
      let ingresosMesActual = 0;
      let ingresosMesAnterior = 0;
      let reservasActivas = 0;
      let reservasMesActual = 0;
      let reservasMesAnterior = 0;
      let pagosPendientes = 0;

      const conteoPorFecha = new Map<
        string,
        { completadas: number; canceladas: number; ingresos: number }
      >();
      const reservasPorPista = new Map<
        number,
        {
          hoy: number;
          totales: number;
          ocupadaAhora: boolean;
          turnosVigentesHoy: number;
        }
      >();

      for (const item of reservasNormalizadas) {
        const { raw, fechaStr, estadoLower, monto } = item;
        const esPagadaOCompletada =
          estadoLower === 'pagada' ||
          estadoLower === 'pagado' ||
          estadoLower === 'completada';
        const esCancelada =
          estadoLower === 'cancelada' || estadoLower === 'cancelado';
        const esPendiente = estadoLower === 'pendiente';

        const enMesActual =
          fechaStr >= ranges.inicioMesActual && fechaStr <= ranges.finMesActual;
        const enMesAnterior =
          fechaStr >= ranges.inicioMesAnterior &&
          fechaStr <= ranges.finMesAnterior;

        if (esPagadaOCompletada) {
          ingresosTotales += monto;
          reservasActivas += 1;

          if (enMesActual) {
            ingresosMesActual += monto;
            reservasMesActual += 1;
          } else if (enMesAnterior) {
            ingresosMesAnterior += monto;
            reservasMesAnterior += 1;
          }
        } else if (esPendiente) {
          pagosPendientes += 1;
        }

        // Estadísticas reales por pista (excluyendo reservas canceladas)
        if (!esCancelada) {
          const idPista = raw.id_pista || raw.pista?.id_pista;
          if (idPista) {
            const actualPista = reservasPorPista.get(idPista) ?? {
              hoy: 0,
              totales: 0,
              ocupadaAhora: false,
              turnosVigentesHoy: 0,
            };
            actualPista.totales += 1;
            if (fechaStr === hoyIso) {
              actualPista.hoy += 1;
              const inicioMin = this.timeToMinutes(raw.hora_inicio);
              const terminoMin = raw.hora_termino
                ? this.timeToMinutes(raw.hora_termino)
                : inicioMin + 60;
              if (inicioMin <= ahoraMinutos && ahoraMinutos < terminoMin) {
                actualPista.ocupadaAhora = true;
              }
              if (terminoMin > ahoraMinutos) {
                actualPista.turnosVigentesHoy += 1;
              }
            }
            reservasPorPista.set(idPista, actualPista);
          }
        }

        // Acumulación para el gráfico de tendencia
        const statDia = conteoPorFecha.get(fechaStr) ?? {
          completadas: 0,
          canceladas: 0,
          ingresos: 0,
        };
        if (esPagadaOCompletada) {
          statDia.completadas += 1;
          statDia.ingresos += monto;
        } else if (esCancelada) {
          statDia.canceladas += 1;
        }
        conteoPorFecha.set(fechaStr, statDia);
      }

      const crecimientoIngresos = this.calculateGrowth(
        ingresosMesActual,
        ingresosMesAnterior,
      );
      const crecimientoReservas = this.calculateGrowth(
        reservasMesActual,
        reservasMesAnterior,
      );

      // 2. Estado real de Pistas (según reservas activas del día de hoy) y Tasa de Ocupación
      const pistasActivas = pistas.filter(
        (p) => p.is_active && p.servicio?.is_active !== false,
      );

      const estadoPistas = pistasActivas.map((c) => {
        const stats = reservasPorPista.get(c.id_pista) ?? {
          hoy: 0,
          totales: 0,
          ocupadaAhora: false,
          turnosVigentesHoy: 0,
        };
        const isOcupada = stats.ocupadaAhora || stats.turnosVigentesHoy > 0;

        return {
          id_pista: c.id_pista,
          nombre: `${c.servicio?.nombre ?? 'Deporte'} (${c.nombre})`,
          deporte: c.servicio?.nombre ?? 'Deporte',
          precioHora: Number(c.precio_hora) || 0,
          reservasHoy: stats.hoy,
          reservasTotales: stats.totales,
          estado: (isOcupada ? 'OCUPADA' : 'LIBRE') as 'OCUPADA' | 'LIBRE',
        };
      });

      const totalPistas = estadoPistas.length;
      const pistasConActividad = estadoPistas.filter(
        (p) => p.estado === 'OCUPADA',
      ).length;
      const tasaOcupacion =
        totalPistas > 0
          ? Math.min(100, Math.round((pistasConActividad / totalPistas) * 100))
          : 0;

      // 3. Series de Tendencia (7 y 30 días)
      const tendencia30Dias = this.buildDateSeries(
        ranges.hace30DiasDate,
        30,
        conteoPorFecha,
        false,
      );
      const start7Days = new Date(ranges.hace30DiasDate);
      start7Days.setDate(start7Days.getDate() + 23);
      const tendencia7Dias = this.buildDateSeries(
        start7Days,
        7,
        conteoPorFecha,
        true,
      );

      // 4. Próximas Reservas (hasta 6)
      const proximasReservas = reservasNormalizadas
        .slice(0, 6)
        .map(({ raw: r, fechaStr, estadoLower, monto }) => {
          const horaInicio = (r.hora_inicio || '').slice(0, 5);
          const horaTermino = (r.hora_termino || '').slice(0, 5);
          const nombreCompleto = [
            r.usuario?.nombre,
            r.usuario?.apellido,
          ]
            .filter(Boolean)
            .join(' ');

          let estadoPago: 'Pagado' | 'Pendiente' | 'Cancelado' = 'Pendiente';
          if (
            estadoLower === 'pagada' ||
            estadoLower === 'pagado' ||
            estadoLower === 'completada'
          ) {
            estadoPago = 'Pagado';
          } else if (estadoLower === 'cancelada' || estadoLower === 'cancelado') {
            estadoPago = 'Cancelado';
          }

          return {
            id: r.id_reserva,
            fecha: fechaStr,
            hora: horaTermino ? `${horaInicio} - ${horaTermino}` : horaInicio,
            instalacion: `${r.pista?.servicio?.nombre ?? 'Servicio'} - ${r.pista?.nombre ?? 'Pista'}`,
            servicio: r.pista?.servicio?.nombre ?? 'Deporte',
            pista: r.pista?.nombre ?? '',
            usuario: nombreCompleto || r.usuario?.email || 'Usuario',
            emailUsuario: r.usuario?.email ?? '',
            avatarUsuario:
              r.usuario?.imagen ||
              'https://cdn-icons-png.flaticon.com/512/149/149071.png',
            monto,
            estadoReserva: r.estado,
            estadoPago,
          };
        });

      // 5. Próximo cierre según horarios activos
      const horariosHoy = horarios.filter(
        (h) => Number(h.dia_semana) === ranges.diaSemana,
      );
      const maxHora = (horariosHoy.length ? horariosHoy : horarios).reduce(
        (max, h) => (h.hora_termino > max ? h.hora_termino : max),
        '20:00',
      );
      const proximoCierre = `${maxHora.slice(0, 5)} - Cierre y Mantenimiento`;

      return {
        ok: true,
        data: {
          kpis: {
            ingresosTotales,
            ingresosMesActual,
            crecimientoIngresos,
            tasaOcupacion,
            crecimientoOcupacion: crecimientoReservas,
            reservasActivas,
            crecimientoReservas,
            pagosPendientes,
          },
          tendencia: {
            ultimos7Dias: tendencia7Dias,
            ultimos30Dias: tendencia30Dias,
          },
          estadoPistas,
          proximoCierre,
          proximasReservas,
        },
      };
    } catch (error) {
      this.logger.error(
        'Error al obtener datos del dashboard administrativo:',
        error,
      );
      throw new InternalServerErrorException({
        ok: false,
        msg: 'Error interno al cargar las métricas del dashboard administrativo',
      });
    }
  }

  /**
   * Actualiza los datos editables de una cancha.
   *
   * @param id_pista Identificador numérico de la cancha.
   * @param data Nombre y precio por hora que se guardarán.
   * @returns Una promesa con el resultado y la cancha actualizada.
   */
  async updateCourt(
    id_pista: number,
    data: { nombre: string; precio_hora: number },
  ) {
    const court = await this.courtRepository.preload({
      id_pista,
      nombre: data.nombre?.trim(),
      precio_hora: Number(data.precio_hora),
    });

    if (!court) {
      throw new NotFoundException(`La pista con ID ${id_pista} no existe`);
    }

    await this.courtRepository.save(court);
    return {
      ok: true,
      msg: 'Pista actualizada correctamente',
      data: court,
    };
  }

  /**
   * Cambia el estado de activación de un comentario.
   *
   * @param id_comentario Identificador numérico del comentario.
   * @param is_active Estado que indica si el comentario debe quedar activo.
   * @returns Una promesa con la confirmación de la actualización.
   */
  async updateCommentStatus(
    id_comentario: number,
    is_active: number | boolean | string,
  ) {
    const activeBool =
      is_active === true ||
      is_active === 1 ||
      is_active === '1' ||
      is_active === 'true';

    const comment = await this.commentRepository.preload({
      id_comentario,
      is_active: activeBool,
    });

    if (!comment) {
      throw new NotFoundException(
        `El comentario con ID ${id_comentario} no existe`,
      );
    }

    await this.commentRepository.save(comment);
    return {
      ok: true,
      msg: 'Estado del comentario actualizado correctamente',
    };
  }

  /**
   * Actualiza los roles o el estado de un usuario desde administración.
   *
   * @param id_usuario UUID del usuario que se modificará.
   * @param body Roles o estado de activación que se guardarán.
   * @returns Una promesa con el resultado y el usuario actualizado.
   */
  async updateUserByAdmin(
    id_usuario: string,
    body: { roles?: string[]; is_active?: boolean },
  ) {
    const datosActualizar: Partial<UserEntity> = {
      id_usuario,
    };

    if (Array.isArray(body.roles) && body.roles.length > 0) {
      datosActualizar.roles = body.roles.map((r) => {
        const lower = r.trim().toLowerCase();
        if (lower === 'usuario' || lower === 'user') return 'user';
        if (lower === 'admin') return 'admin';
        if (lower === 'superadmin' || lower === 'super-user')
          return 'super-user';
        return lower;
      });
    }

    if (body.is_active !== undefined) {
      datosActualizar.is_active = Boolean(body.is_active);
    }

    const user = await this.userRepository.preload(datosActualizar);

    if (!user) {
      throw new NotFoundException(`El usuario con ID ${id_usuario} no existe`);
    }

    const updatedUser = await this.userRepository.save(user);
    return {
      ok: true,
      msg: 'Usuario actualizado correctamente',
      usuario: updatedUser,
    };
  }

  /**
   * Calcula la variación porcentual entre dos períodos.
   *
   * @param current Valor correspondiente al período actual.
   * @param previous Valor correspondiente al período anterior.
   * @returns El porcentaje de crecimiento redondeado a un decimal.
   */
  private calculateGrowth(current: number, previous: number): number {
    if (previous > 0) {
      return Math.round(((current - previous) / previous) * 1000) / 10;
    }
    return current > 0 ? 100 : 0;
  }

  /**
   * Genera una serie diaria continua para los gráficos de tendencias.
   *
   * @param startDate Fecha inicial de la serie.
   * @param daysCount Cantidad de días que se incluirán.
   * @param byDate Métricas acumuladas y agrupadas por fecha ISO.
   * @param useDayName Indica si la etiqueta debe incluir el nombre del día.
   * @returns Los puntos diarios ordenados de la serie.
   */
  private buildDateSeries(
    startDate: Date,
    daysCount: number,
    byDate: Map<
      string,
      { completadas: number; canceladas: number; ingresos: number }
    >,
    useDayName: boolean,
  ): DailyTrendPoint[] {
    const series: DailyTrendPoint[] = [];

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const iso = this.formatIsoDate(d);
      const dayName = AdminService.DIAS_CORTOS[d.getDay()];
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const found = byDate.get(iso);

      series.push({
        fecha: iso,
        etiqueta: useDayName ? `${dayName} ${dayNum}` : `${dayNum}/${monthNum}`,
        completadas: found?.completadas ?? 0,
        canceladas: found?.canceladas ?? 0,
        ingresos: found?.ingresos ?? 0,
      });
    }

    return series;
  }

  /**
   * Normaliza una fecha al formato ISO `YYYY-MM-DD`.
   *
   * @param fecha Fecha que se normalizará.
   * @returns La fecha representada como una cadena ISO sin hora.
   */
  private normalizeDate(fecha: Date | string): string {
    if (typeof fecha === 'string') {
      return fecha.split('T')[0];
    }
    if (fecha instanceof Date) {
      return fecha.toISOString().split('T')[0];
    }
    return String(fecha);
  }

  /**
   * Convierte una fecha ISO en una instancia local de `Date`.
   *
   * @param iso Fecha con formato `YYYY-MM-DD`.
   * @returns La fecha local configurada al mediodía.
   */
  private parseIsoDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  }

  /**
   * Convierte una hora `HH:mm` o `HH:mm:ss` al total de minutos desde medianoche.
   *
   * @param timeVal Hora de referencia.
   * @returns Minutos totales desde las 00:00.
   */
  private timeToMinutes(timeVal: string | undefined | null): number {
    if (!timeVal) return 0;
    const [h, m] = String(timeVal).trim().split(':');
    return (Number(h) || 0) * 60 + (Number(m) || 0);
  }

  /**
   * Formatea una instancia de `Date` como `YYYY-MM-DD`.
   *
   * @param d Fecha que se formateará.
   * @returns La fecha en formato ISO sin hora.
   */
  private formatIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Calcula los rangos temporales utilizados por el panel administrativo.
   *
   * @param refDate Fecha tomada como referencia para los cálculos.
   * @returns Las fechas límite, la hora actual y el día de la semana calculados.
   */
  private buildDateRanges(refDate: Date) {
    const ahora = new Date();
    const year = refDate.getFullYear();
    const month = refDate.getMonth();

    const fechaActual = this.formatIsoDate(refDate);
    const horaActual = ahora.toTimeString().split(' ')[0];

    const hace30DiasDate = new Date(refDate);
    hace30DiasDate.setDate(refDate.getDate() - 29);

    const inicioMesActual = this.formatIsoDate(new Date(year, month, 1));
    const finMesActual = this.formatIsoDate(new Date(year, month + 1, 0));

    const inicioMesAnterior = this.formatIsoDate(new Date(year, month - 1, 1));
    const finMesAnterior = this.formatIsoDate(new Date(year, month, 0));

    const jsDay = refDate.getDay();
    const diaSemana = jsDay === 0 ? 7 : jsDay;

    return {
      fechaActual,
      horaActual,
      hace30DiasDate,
      inicioMesActual,
      finMesActual,
      inicioMesAnterior,
      finMesAnterior,
      diaSemana,
    };
  }
}
