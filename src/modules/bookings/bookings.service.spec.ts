import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { UserEntity } from '../../auth/entities/user.entity.js';

describe('BookingsService - Creación de Reservas y Prevención de Doble Reserva / Fraude', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-11T19:20:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockQueryBuilder = (overlappingBooking: unknown) => ({
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getOne: vi.fn().mockResolvedValue(overlappingBooking),
  });

  const regularUser = {
    id_usuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    roles: ['user'],
  } as UserEntity;

  const adminUser = {
    id_usuario: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    roles: ['admin'],
  } as UserEntity;

  it('debe rechazar un horario que ya comenzó antes de consultar la cancha', async () => {
    const findOne = vi.fn();
    const service = new BookingsService(
      {} as any,
      { findOne } as any,
    );

    await expect(
      service.create(
        {
          id_usuario: regularUser.id_usuario,
          id_pista: 1,
          fecha: '2026-11-11',
          hora_inicio: '16:00',
          hora_termino: '17:00',
        },
        regularUser,
      ),
    ).rejects.toThrow(
      'No se puede reservar un horario que ya haya comenzado',
    );

    expect(findOne).not.toHaveBeenCalled();
  });

  it('debe rechazar la reserva si la cancha no existe o está inactiva', async () => {
    const mockCourtRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    };
    const mockBookingRepo = {};

    const service = new BookingsService(
      mockBookingRepo as any,
      mockCourtRepo as any,
    );

    await expect(
      service.create(
        {
          id_usuario: regularUser.id_usuario,
          id_pista: 99,
          fecha: '2026-11-20',
          hora_inicio: '18:00',
          hora_termino: '19:00',
        },
        regularUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe rechazar la reserva cuando ya existe otra reserva activa en el mismo horario (Double Booking)', async () => {
    const mockCourtRepo = {
      findOne: vi.fn().mockResolvedValue({
        id_pista: 1,
        nombre: 'Cancha 1',
        precio_hora: 18000,
        is_active: true,
      }),
    };
    const mockBookingRepo = {
      createQueryBuilder: vi
        .fn()
        .mockReturnValue(createMockQueryBuilder({ id_reserva: 55 })),
    };

    const service = new BookingsService(
      mockBookingRepo as any,
      mockCourtRepo as any,
    );

    await expect(
      service.create(
        {
          id_usuario: regularUser.id_usuario,
          id_pista: 1,
          fecha: '2026-11-20',
          hora_inicio: '18:00',
          hora_termino: '19:00',
        },
        regularUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe ignorar precio_cobrado=0, estado="Pagada" e id_usuario ajeno enviados por un usuario normal', async () => {
    const mockCourtRepo = {
      findOne: vi.fn().mockResolvedValue({
        id_pista: 1,
        nombre: 'Cancha Central',
        precio_hora: 22000,
        is_active: true,
      }),
    };
    const create = vi.fn().mockImplementation((dto) => ({ ...dto, id_reserva: 101 }));
    const save = vi.fn().mockResolvedValue({ id_reserva: 101 });
    const mockBookingRepo = {
      createQueryBuilder: vi
        .fn()
        .mockReturnValue(createMockQueryBuilder(null)),
      create,
      save,
    };

    const service = new BookingsService(
      mockBookingRepo as any,
      mockCourtRepo as any,
    );

    const result = await service.create(
      {
        id_usuario: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', // Intento de suplantar a otro usuario
        id_pista: 1,
        fecha: '2026-11-20',
        hora_inicio: '18:00',
        hora_termino: '19:00',
        estado: 'Pagada', // Intento de saltar pasarela de pagos
        precio_cobrado: 0, // Intento de reservar gratis
      },
      regularUser,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        id_usuario: regularUser.id_usuario,
        estado: 'Pendiente',
        precio_cobrado: 22000,
      }),
    );
    expect(result?.precio_cobrado).toBe(22000);
    expect(result?.estado).toBe('Pendiente');
  });

  it('permite que un administrador asigne estado e id_usuario manteniendo el precio oficial de la cancha', async () => {
    const mockCourtRepo = {
      findOne: vi.fn().mockResolvedValue({
        id_pista: 2,
        nombre: 'Cancha 2',
        precio_hora: 15000,
        is_active: true,
      }),
    };
    const create = vi.fn().mockImplementation((dto) => ({ ...dto, id_reserva: 102 }));
    const save = vi.fn().mockResolvedValue({ id_reserva: 102 });
    const mockBookingRepo = {
      createQueryBuilder: vi
        .fn()
        .mockReturnValue(createMockQueryBuilder(null)),
      create,
      save,
    };

    const service = new BookingsService(
      mockBookingRepo as any,
      mockCourtRepo as any,
    );

    const targetUserId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    await service.create(
      {
        id_usuario: targetUserId,
        id_pista: 2,
        fecha: '2026-11-21',
        hora_inicio: '10:00',
        hora_termino: '11:00',
        estado: 'Pagada',
      },
      adminUser,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        id_usuario: targetUserId,
        estado: 'Pagada',
        precio_cobrado: 15000,
      }),
    );
  });
});
