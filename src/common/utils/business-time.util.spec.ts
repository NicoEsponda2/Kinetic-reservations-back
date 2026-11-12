import { describe, expect, it } from 'vitest';
import {
  BUSINESS_TIME_ZONE,
  getBusinessDateTime,
  isBusinessDateTimePast,
} from './business-time.util.js';

describe('business-time.util', () => {
  it('obtiene la fecha y hora comercial de America/Santiago', () => {
    const now = new Date('2026-11-11T19:20:00.000Z');

    expect(BUSINESS_TIME_ZONE).toBe('America/Santiago');
    expect(getBusinessDateTime(now)).toEqual({
      date: '2026-11-11',
      time: '16:20:00',
    });
  });

  it('considera pasadas las horas anteriores, pero no la igualdad exacta', () => {
    const now = new Date('2026-11-11T19:20:00.000Z');

    expect(isBusinessDateTimePast('2026-11-11', '16:00', now)).toBe(true);
    expect(isBusinessDateTimePast('2026-11-11', '16:20', now)).toBe(false);
    expect(isBusinessDateTimePast('2026-11-11', '17:00', now)).toBe(false);
  });

  it('compara dias anteriores y futuros sin depender de la hora', () => {
    const now = new Date('2026-11-11T19:20:00.000Z');

    expect(isBusinessDateTimePast('2026-11-10', '23:59:59', now)).toBe(true);
    expect(isBusinessDateTimePast('2026-11-12', '00:00', now)).toBe(false);
  });

  it('acepta una fecha ISO con hora y respeta el cambio de fecha entre UTC y Santiago', () => {
    const now = new Date('2026-11-01T02:30:00.000Z');

    expect(getBusinessDateTime(now)).toEqual({
      date: '2026-10-31',
      time: '23:30:00',
    });
    expect(
      isBusinessDateTimePast('2026-10-31T00:00:00.000Z', '23:00', now),
    ).toBe(true);
    expect(
      isBusinessDateTimePast('2026-11-01T00:00:00.000Z', '00:00', now),
    ).toBe(false);
  });

  it('normaliza segundos y solo marca como pasado lo estrictamente anterior', () => {
    const now = new Date('2026-11-11T19:20:30.000Z');

    expect(isBusinessDateTimePast('2026-11-11', '16:20', now)).toBe(true);
    expect(isBusinessDateTimePast('2026-11-11', '16:20:29', now)).toBe(true);
    expect(isBusinessDateTimePast('2026-11-11', '16:20:30', now)).toBe(false);
    expect(isBusinessDateTimePast('2026-11-11', '16:20:31', now)).toBe(false);
  });
});
