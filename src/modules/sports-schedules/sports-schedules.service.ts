import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateSportsScheduleDto } from './dto/create-sports-schedule.dto.js';
import { UpdateSportsScheduleDto } from './dto/update-sports-schedule.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { SportsScheduleEntity } from './entities/sports-schedule.entity.js';
import { BookingEntity } from '../bookings/entities/booking.entity.js';
import { CheckAvailabilityDto } from './dto/checkavailability.dto.js';
import { GetAvailabilityDto } from './dto/getAvailability.dto.js';
import { isBusinessDateTimePast } from '../../common/utils/business-time.util.js';

export interface TimeSlot {
  hora_inicio: string;
  hora_termino: string;
}

@Injectable()
export class SportsSchedulesService {
  private readonly logger = new Logger('SportService');
  private readonly SLOT_DURATION_MINUTES = 60;
  constructor(
    @InjectRepository(SportsScheduleEntity)
    private readonly sportScheduleRepository: Repository<SportsScheduleEntity>,

    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
  ) {}

  /**
   * Crea y guarda un nuevo registro de horario semanal para un deporte.
   *
   * @param createSportsScheduleDto Datos del horario semanal a almacenar.
   * @returns Los datos del horario semanal guardado.
   */
  async create(createSportsScheduleDto: CreateSportsScheduleDto) {
    try {
      console.log(createSportsScheduleDto);

      const schedule = this.sportScheduleRepository.create(
        createSportsScheduleDto,
      );

      await this.sportScheduleRepository.save(schedule);
      return createSportsScheduleDto;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  // findAvailableTimes() {
  //   return `This action returns all sportsSchedules`;
  // }

  // Funciones auxiliares privadas y tipadas
  /**
   * Convierte una hora en formato `HH:mm` a la cantidad total de minutos desde medianoche.
   *
   * @param timeVal Cadena de texto con la hora en formato `HH:mm`.
   * @returns Total de minutos equivalentes a la hora proporcionada.
   */
  private timeToMinutes(timeVal: string): number {
    if (!timeVal) return 0;
    const partes = String(timeVal).split(':');
    return Number(partes[0]) * 60 + (Number(partes[1]) || 0);
  }

  /**
   * Convierte una cantidad de minutos desde medianoche al formato de hora `HH:mm`.
   *
   * @param mins Cantidad de minutos transcurridos desde las `00:00`.
   * @returns Cadena de texto formateada como `HH:mm`.
   */
  private minutesToTime(mins: number): string {
    const h = Math.floor(mins / 60)
      .toString()
      .padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  /**
   * Calcula los bloques horarios de 60 minutos disponibles para una cancha y fecha excluyendo reservas activas.
   *
   * @param dto Objeto con `id_servicio`, `id_pista` y `fecha` a consultar.
   * @returns Objeto con el indicador de éxito y el arreglo de horarios disponibles.
   */
  async findAvailableTimes(dto: CheckAvailabilityDto) {
    const { id_servicio, id_pista, fecha } = dto;
    const now = new Date();

    if (!id_pista) {
      throw new BadRequestException({
        ok: false,
        msg: 'id_pista es requerido',
      });
    }

    try {
      // Convertimos a Number para que el constructor de Date en TypeScript sea válido
      const fechaLimpia = fecha.split('T')[0];
      const [year, month, day] = fechaLimpia.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const diaSemana = dateObj.getDay();

      // 1. Horario maestro del servicio para ese día usando tu relación "servicio"
      const horariosMaestros = await this.sportScheduleRepository.find({
        select: {
          hora_inicio: true,
          hora_termino: true,
        },
        where: {
          servicio: { id_deporte: id_servicio as any },
          dia_semana: diaSemana,
          is_active: true,
        },
        order: {
          hora_inicio: 'ASC',
        },
      });

      if (horariosMaestros.length === 0) {
        return {
          ok: true,
          horarios: [],
          msg: 'Servicio cerrado este día',
        };
      }

      // 2. Filtrar reservas de la pista seleccionada en esa fecha y excluir las canceladas
      const reservasDia = await this.bookingRepository
        .createQueryBuilder('r')
        .select(['r.hora_inicio', 'r.hora_termino'])
        .where('r.id_pista = :id_pista', { id_pista })
        .andWhere('DATE(r.fecha) = :fechaLimpia', { fechaLimpia })
        .andWhere('r.estado != :estado', { estado: 'Cancelada' })
        .getMany();

      // 3. Cálculo de bloques disponibles de 60 minutos
      const bloquesDisponibles: {
        hora_inicio: string;
        hora_termino: string;
      }[] = [];

      for (const rango of horariosMaestros) {
        let actualMinutos = this.timeToMinutes(rango.hora_inicio);
        const terminoMinutos = this.timeToMinutes(rango.hora_termino);

        while (actualMinutos < terminoMinutos) {
          const finBloqueMinutos = actualMinutos + 60;

          // Verificar si alguna reserva se solapa con el bloque actual
          const ocupado = reservasDia.some((r) => {
            const resInicio = this.timeToMinutes(r.hora_inicio);
            const resFin = this.timeToMinutes(r.hora_termino);
            return resInicio < finBloqueMinutos && resFin > actualMinutos;
          });

          const horaInicio = this.minutesToTime(actualMinutos);

          if (
            !ocupado &&
            !isBusinessDateTimePast(fechaLimpia, horaInicio, now)
          ) {
            bloquesDisponibles.push({
              hora_inicio: horaInicio,
              hora_termino: this.minutesToTime(finBloqueMinutos),
            });
          }

          actualMinutos = finBloqueMinutos;
        }
      }

      return {
        ok: true,
        horarios: bloquesDisponibles,
      };
    } catch (error) {
      console.error('Error al obtener disponibilidad:', error);
      throw new InternalServerErrorException({
        ok: false,
        msg: 'Error interno del servidor',
      });
    }
  }

  /**
   * Calcula en paralelo los bloques horarios libres de 60 minutos para un servicio, cancha y fecha.
   *
   * @param dto Filtros de consulta (`id_servicio`, `id_pista` y `fecha`).
   * @returns Objeto con el estado de la operación y el listado de tramos horarios libres.
   */
  async obtenerHorariosDisponibles(dto: GetAvailabilityDto) {
    const { id_servicio, id_pista, fecha } = dto;
    const now = new Date();

    try {
      // 1. Obtener el día de la semana de forma segura sin desfase de zona horaria
      const fechaLimpia = fecha.split('T')[0];
      const [year, month, day] = fechaLimpia.split('-').map(Number);
      const diaSemana = new Date(year, month - 1, day).getDay();

      // 2. Ejecutar ambas consultas en paralelo para minimizar la latencia
      const [horariosMaestros, reservasDia] = await Promise.all([
        this.sportScheduleRepository.find({
          select: {
            hora_inicio: true,
            hora_termino: true,
          },
          where: {
            servicio: { id_deporte: id_servicio as any },
            dia_semana: diaSemana,
            is_active: true,
          },
          order: {
            hora_inicio: 'ASC',
          },
        }),

        this.bookingRepository.find({
          select: {
            hora_inicio: true,
            hora_termino: true,
          },
          where: {
            id_pista: id_pista,
            fecha: fechaLimpia as any, // Comparación directa sobre columna DATE
            estado: Not('Cancelada'),
          },
        }),
      ]);

      if (horariosMaestros.length === 0) {
        return {
          ok: true,
          horarios: [],
        };
      }

      // 3. Pre-calcular los minutos de las reservas existentes una sola vez (O(N))
      const reservasEnMinutos = reservasDia.map((r) => ({
        inicio: this.timeToMinutes(r.hora_inicio),
        fin: this.timeToMinutes(r.hora_termino),
      }));

      // 4. Generar bloques horarios y filtrar solapamientos
      const horarios: TimeSlot[] = [];

      for (const rango of horariosMaestros) {
        let actualMinutos = this.timeToMinutes(rango.hora_inicio);
        const terminoMinutos = this.timeToMinutes(rango.hora_termino);

        while (actualMinutos + this.SLOT_DURATION_MINUTES <= terminoMinutos) {
          const finBloqueMinutos = actualMinutos + this.SLOT_DURATION_MINUTES;

          const ocupado = reservasEnMinutos.some(
            (res) => res.inicio < finBloqueMinutos && res.fin > actualMinutos,
          );

          const horaInicio = this.minutesToTime(actualMinutos);

          if (
            !ocupado &&
            !isBusinessDateTimePast(fechaLimpia, horaInicio, now)
          ) {
            horarios.push({
              hora_inicio: horaInicio,
              hora_termino: this.minutesToTime(finBloqueMinutos),
            });
          }

          actualMinutos = finBloqueMinutos;
        }
      }

      return {
        ok: true,
        horarios,
      };
    } catch (error) {
      this.logger.error(`Error al obtener disponibilidad para pista ${id_pista}:`, error);
      throw new InternalServerErrorException({
        ok: false,
        msg: 'Error interno del servidor al calcular horarios disponibles',
      });
    }
  }

  // findOne(id: number) {
  //   return `This action returns a #${id} sportsSchedule`;
  // }

  // update(id: number, updateSportsScheduleDto: UpdateSportsScheduleDto) {
  //   return `This action updates a #${id} sportsSchedule`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} sportsSchedule`;
  // }

  /**
   * Centraliza el manejo de excepciones de base de datos en el módulo de horarios deportivos.
   *
   * @param error Error capturado durante la operación en base de datos.
   * @returns Lanza una excepción HTTP acorde al código de error de PostgreSQL.
   */
  private handleDBExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    this.logger.error(error);

    throw new InternalServerErrorException('Error creating sport');
  }
}
