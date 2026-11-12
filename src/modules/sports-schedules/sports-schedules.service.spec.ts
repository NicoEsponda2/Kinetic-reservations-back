import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SportsSchedulesService } from './sports-schedules.service.js';

const availabilityMethods = [
  'findAvailableTimes',
  'obtenerHorariosDisponibles',
] as const;

describe.each(availabilityMethods)('SportsSchedulesService.%s', (method) => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 16:20 del 11 de noviembre en America/Santiago (UTC-03:00).
    vi.setSystemTime(new Date('2026-11-11T19:20:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createService = () => {
    const sportScheduleRepository = {
      find: vi.fn().mockResolvedValue([
        {
          hora_inicio: '09:00:00',
          hora_termino: '18:00:00',
        },
      ]),
    };
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    };
    const bookingRepository = {
      createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
      find: vi.fn().mockResolvedValue([]),
    };

    return new SportsSchedulesService(
      sportScheduleRepository as any,
      bookingRepository as any,
    );
  };

  const getAvailability = async (fecha: string) => {
    const service = createService();

    return service[method]({
      id_servicio: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      id_pista: 1,
      fecha,
    });
  };

  it('excluye los bloques anteriores a la hora actual para el dia de hoy', async () => {
    const result = await getAvailability('2026-11-11');

    expect(result.horarios).toEqual([
      {
        hora_inicio: '17:00',
        hora_termino: '18:00',
      },
    ]);
  });

  it('mantiene todos los bloques de una fecha futura', async () => {
    const result = await getAvailability('2026-11-12');

    expect(result.horarios).toHaveLength(9);
    expect(result.horarios.map((slot) => slot.hora_inicio)).toEqual([
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
    ]);
  });

  it('no devuelve bloques para una fecha pasada', async () => {
    const result = await getAvailability('2026-11-10');

    expect(result.horarios).toEqual([]);
  });
});
