import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payments.service.js';
import { CourtEntity } from '../courts/entities/court.entity.js';
import { BookingEntity } from '../bookings/entities/booking.entity.js';
import { PaymentEntity } from './entities/payment.entity.js';
import { UserEntity } from '../../auth/entities/user.entity.js';

describe('PaymentService - Seguridad de Pagos Webpay e Integridad Transaccional', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-11T19:20:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:4200';
      if (key === 'BACKEND_URL') return 'http://localhost:3000';
      return undefined;
    }),
  } as unknown as ConfigService;

  const user = {
    id_usuario: '11111111-1111-4111-8111-111111111111',
    roles: ['user'],
  } as UserEntity;

  it('iniciarPago debe rechazar un horario pasado antes de consultar repositorios o contactar Webpay', async () => {
    const getRepository = vi.fn();
    const service = new PaymentService(
      { getRepository } as any,
      mockConfigService,
    );
    const txCreateSpy = vi.spyOn((service as any).tx, 'create');

    await expect(
      service.iniciarPago(
        {
          id_reserva: 999,
          id_usuario: user.id_usuario,
          monto: 25000,
          id_pista: 1,
          fecha: '2026-11-11',
          hora_inicio: '16:00',
          hora_termino: '17:00',
        },
        user,
      ),
    ).rejects.toThrow(
      'No se puede reservar un horario que ya haya comenzado',
    );

    expect(getRepository).not.toHaveBeenCalled();
    expect(txCreateSpy).not.toHaveBeenCalled();
  });

  it('commitPago debe rechazar un horario pasado antes de confirmar el pago en Webpay', async () => {
    const mockPaymentRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    };
    const createQueryRunner = vi.fn();
    const service = new PaymentService(
      {
        getRepository: vi.fn(() => mockPaymentRepo),
        createQueryRunner,
      } as any,
      mockConfigService,
    );
    const txCommitSpy = vi.spyOn((service as any).tx, 'commit');

    await expect(
      service.commitPago(
        {
          tokenWs: 'valid-token-past-slot',
          datosReserva: {
            idUsuario: user.id_usuario,
            idPista: 1,
            fecha: '2026-11-11',
            horaInicio: '16:00',
            horaTermino: '17:00',
            email: 'user@example.com',
            nombreUsuario: 'Ana',
            nombreCancha: 'Cancha 1',
          },
        },
        user,
      ),
    ).rejects.toThrow(
      'No se puede reservar un horario que ya haya comenzado',
    );

    expect(txCommitSpy).not.toHaveBeenCalled();
    expect(createQueryRunner).not.toHaveBeenCalled();
  });

  it('iniciarPago debe sobrescribir el monto enviado por el cliente con el precio oficial de la cancha en BD', async () => {
    const mockCourtRepo = {
      findOne: vi.fn().mockResolvedValue({
        id_pista: 1,
        precio_hora: 25000,
        is_active: true,
      }),
    };
    const mockBookingRepo = {
      createQueryBuilder: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      }),
    };

    const mockDataSource = {
      getRepository: vi.fn((entity) => {
        if (entity === CourtEntity) return mockCourtRepo;
        if (entity === BookingEntity) return mockBookingRepo;
        return {};
      }),
    };

    const service = new PaymentService(
      mockDataSource as any,
      mockConfigService,
    );
    const txCreateSpy = vi
      .spyOn((service as any).tx, 'create')
      .mockResolvedValue({
        url: 'https://webpay3gint.transbank.cl/webpayserver/initTransaction',
        token: 'tbk-token-123',
      });

    const response = await service.iniciarPago(
      {
        id_reserva: 999,
        id_usuario: user.id_usuario,
        monto: 1, // Intento de pagar $1 CLP desde el cliente
        id_pista: 1,
        fecha: '2026-11-25',
        hora_inicio: '19:00',
        hora_termino: '20:00',
      },
      user,
    );

    expect(response.ok).toBe(true);
    expect(txCreateSpy).toHaveBeenCalledWith(
      'RES-999',
      `USR-${user.id_usuario}`,
      25000, // Se cobró la tarifa real de la BD ($25.000), no $1
      expect.any(String),
    );
  });

  it('commitPago debe rechazar tokens reutilizados (Replay Attack)', async () => {
    const mockPaymentRepo = {
      findOne: vi.fn().mockResolvedValue({
        id_pago: 10,
        token_transaccion: 'replayed-token',
      }),
    };
    const mockDataSource = {
      getRepository: vi.fn((entity) => {
        if (entity === PaymentEntity) return mockPaymentRepo;
        return {};
      }),
    };

    const service = new PaymentService(
      mockDataSource as any,
      mockConfigService,
    );

    await expect(
      service.commitPago(
        {
          tokenWs: 'replayed-token',
          datosReserva: {
            idUsuario: user.id_usuario,
            idPista: 1,
            fecha: '2026-11-25',
            horaInicio: '19:00',
            horaTermino: '20:00',
            email: 'user@example.com',
            nombreUsuario: 'Ana',
            nombreCancha: 'Cancha 1',
          },
        },
        user,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('commitPago debe hacer rollback y rechazar si el monto pagado en Transbank no coincide con el precio de la cancha', async () => {
    const mockPaymentRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    };
    const rollbackTransaction = vi.fn();
    const release = vi.fn();

    const mockQueryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction,
      release,
      manager: {
        findOne: vi.fn().mockResolvedValue({
          id_pista: 1,
          precio_hora: 25000,
          is_active: true,
        }),
      },
    };

    const mockDataSource = {
      getRepository: vi.fn(() => mockPaymentRepo),
      createQueryRunner: vi.fn(() => mockQueryRunner),
    };

    const service = new PaymentService(
      mockDataSource as any,
      mockConfigService,
    );
    vi.spyOn((service as any).tx, 'commit').mockResolvedValue({
      status: 'AUTHORIZED',
      amount: 100, // Monto manipulado distinto a 25000
      buy_order: 'RES-999',
    });

    await expect(
      service.commitPago(
        {
          tokenWs: 'valid-token-wrong-amount',
          datosReserva: {
            idUsuario: user.id_usuario,
            idPista: 1,
            fecha: '2026-11-25',
            horaInicio: '19:00',
            horaTermino: '20:00',
            email: 'user@example.com',
            nombreUsuario: 'Ana',
            nombreCancha: 'Cancha 1',
          },
        },
        user,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(rollbackTransaction).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it('commitPago debe rechazar cuando un usuario intenta reclamar el token de pago iniciado por otro usuario', async () => {
    const mockPaymentRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    };
    const mockDataSource = {
      getRepository: vi.fn(() => mockPaymentRepo),
    };

    const service = new PaymentService(
      mockDataSource as any,
      mockConfigService,
    );

    (service as any).pendingIntents.set('victim-token', {
      idUsuario: 'victim-uuid',
      idPista: 1,
      fecha: '2026-11-25',
      horaInicio: '19:00',
      horaTermino: '20:00',
      monto: 25000,
      expiresAt: Date.now() + 60_000,
    });

    await expect(
      service.commitPago(
        {
          tokenWs: 'victim-token',
          datosReserva: {
            idUsuario: user.id_usuario,
            idPista: 1,
            fecha: '2026-11-25',
            horaInicio: '19:00',
            horaTermino: '20:00',
            email: 'attacker@example.com',
            nombreUsuario: 'Atacante',
            nombreCancha: 'Cancha 1',
          },
        },
        user,
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
