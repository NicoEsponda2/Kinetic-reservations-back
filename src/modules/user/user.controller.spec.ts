import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { UserEntity } from '../../auth/entities/user.entity.js';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';

describe('UserController - Inicio móvil', () => {
  it('obtiene el dashboard usando exclusivamente el usuario del JWT', async () => {
    const response = {
      ok: true,
      client: 'mobile' as const,
      data: {
        proximoPartido: null,
        metricas: {
          reservasRealizadas: 0,
          crecimientoPorcentual: 0,
          deportesPracticados: 0,
          dineroTotalGastado: 0,
          promedioPorReserva: 0,
        },
      },
    };
    const getMobileDashboardData = vi.fn().mockResolvedValue(response);
    const userService = { getMobileDashboardData } as unknown as UserService;
    const controller = new UserController(userService);
    const authenticatedUser = {
      id_usuario: 'b1f0aa77-8a14-4a8e-8aa0-9acdedcc55ef',
    } as UserEntity;

    await expect(
      controller.getMobileDashboard(authenticatedUser),
    ).resolves.toEqual(response);
    expect(getMobileDashboardData).toHaveBeenCalledOnce();
    expect(getMobileDashboardData).toHaveBeenCalledWith(
      authenticatedUser.id_usuario,
    );
  });

  it('obtiene Próximas e Historial usando exclusivamente el usuario del JWT', async () => {
    const response = {
      ok: true,
      client: 'mobile' as const,
      data: { upcoming: [], history: [] },
    };
    const getMobileBookingsData = vi.fn().mockResolvedValue(response);
    const userService = { getMobileBookingsData } as unknown as UserService;
    const controller = new UserController(userService);
    const authenticatedUser = {
      id_usuario: 'b1f0aa77-8a14-4a8e-8aa0-9acdedcc55ef',
    } as UserEntity;

    await expect(
      controller.getMobileBookings(authenticatedUser),
    ).resolves.toEqual(response);
    expect(getMobileBookingsData).toHaveBeenCalledOnce();
    expect(getMobileBookingsData).toHaveBeenCalledWith(
      authenticatedUser.id_usuario,
    );
  });

  it('obtiene los comentarios usando exclusivamente el usuario del JWT', async () => {
    const response = {
      ok: true,
      client: 'mobile' as const,
      data: { comments: [] },
    };
    const getMobileCommentsData = vi.fn().mockResolvedValue(response);
    const userService = { getMobileCommentsData } as unknown as UserService;
    const controller = new UserController(userService);
    const authenticatedUser = {
      id_usuario: 'b1f0aa77-8a14-4a8e-8aa0-9acdedcc55ef',
    } as UserEntity;

    await expect(
      controller.getMobileComments(authenticatedUser),
    ).resolves.toEqual(response);
    expect(getMobileCommentsData).toHaveBeenCalledOnce();
    expect(getMobileCommentsData).toHaveBeenCalledWith(
      authenticatedUser.id_usuario,
    );
  });

  it('obtiene y actualiza el perfil usando exclusivamente el usuario del JWT', async () => {
    const response = {
      ok: true,
      client: 'mobile' as const,
      data: { user: { idUsuario: 'user-id' } },
    };
    const getMobileProfileData = vi.fn().mockResolvedValue(response);
    const updateMobileProfileData = vi.fn().mockResolvedValue(response);
    const userService = {
      getMobileProfileData,
      updateMobileProfileData,
    } as unknown as UserService;
    const controller = new UserController(userService);
    const authenticatedUser = {
      id_usuario: 'b1f0aa77-8a14-4a8e-8aa0-9acdedcc55ef',
    } as UserEntity;
    const updateDto = { nombre: 'Nicolás', apellido: 'Esponda' };

    await expect(
      controller.getMobileProfile(authenticatedUser),
    ).resolves.toEqual(response);
    await expect(
      controller.updateMobileProfile(authenticatedUser, updateDto),
    ).resolves.toEqual(response);

    expect(getMobileProfileData).toHaveBeenCalledWith(
      authenticatedUser.id_usuario,
    );
    expect(updateMobileProfileData).toHaveBeenCalledWith(
      authenticatedUser.id_usuario,
      updateDto,
    );
  });
});

describe('UserController - Seguridad Web y Protección IDOR', () => {
  const userA = {
    id_usuario: '11111111-1111-4111-8111-111111111111',
    roles: ['user'],
  } as UserEntity;

  const userBId = '22222222-2222-4222-8222-222222222222';

  const adminUser = {
    id_usuario: '99999999-9999-4999-8999-999999999999',
    roles: ['admin'],
  } as UserEntity;

  it('impide que un usuario normal consulte o edite el perfil de otro usuario (IDOR)', () => {
    const userService = {
      getDashboardData: vi.fn(),
      getBookingHistory: vi.fn(),
      getUserComments: vi.fn(),
      updateUser: vi.fn(),
    } as unknown as UserService;
    const controller = new UserController(userService);

    expect(() => controller.getDashboardData(userBId, userA)).toThrow(
      ForbiddenException,
    );
    expect(() => controller.getBookingHistory(userBId, userA)).toThrow(
      ForbiddenException,
    );
    expect(() => controller.getUserComments(userBId, userA)).toThrow(
      ForbiddenException,
    );
    expect(() =>
      controller.updateUser(userBId, { nombre: 'Intruso' }, userA),
    ).toThrow(ForbiddenException);
  });

  it('permite que el propio titular o un administrador acceda y actualice el perfil', async () => {
    const updateUser = vi.fn().mockResolvedValue({ ok: true });
    const getDashboardData = vi.fn().mockResolvedValue({ ok: true });
    const userService = {
      updateUser,
      getDashboardData,
    } as unknown as UserService;
    const controller = new UserController(userService);

    await expect(
      controller.updateUser(userA.id_usuario, { nombre: 'Ana' }, userA),
    ).resolves.toEqual({ ok: true });

    await expect(
      controller.getDashboardData(userBId, adminUser),
    ).resolves.toEqual({ ok: true });

    expect(updateUser).toHaveBeenCalledWith(userA.id_usuario, {
      nombre: 'Ana',
    });
    expect(getDashboardData).toHaveBeenCalledWith(userBId);
  });
});
