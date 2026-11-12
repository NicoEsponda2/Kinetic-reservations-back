import { afterEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingEntity } from '../bookings/entities/booking.entity.js';
import { UserEntity } from '../../auth/entities/user.entity.js';
import { UserService } from './user.service.js';

interface DateRanges {
  fechaActual: string;
  horaActual: string;
  inicioMesActual: string;
  finMesActual: string;
  inicioMesAnterior: string;
  finMesAnterior: string;
}

type UserServiceWithDateRanges = UserService & {
  obtenerRangosDeFechas: () => DateRanges;
};

describe('UserService - Inicio móvil', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('identifica la respuesta como mobile y conserva el contrato del dashboard', async () => {
    const service = Object.create(UserService.prototype) as UserService;
    const dashboard = {
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
    vi.spyOn(service, 'getDashboardData').mockResolvedValue(dashboard);

    await expect(
      service.getMobileDashboardData(
        'b1f0aa77-8a14-4a8e-8aa0-9acdedcc55ef',
      ),
    ).resolves.toEqual({
      ok: true,
      client: 'mobile',
      data: dashboard.data,
    });
  });

  it('calcula el día y mes comercial en la zona horaria de Santiago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T02:30:00.000Z'));
    const service = Object.create(
      UserService.prototype,
    ) as UserServiceWithDateRanges;

    expect(service.obtenerRangosDeFechas()).toEqual({
      fechaActual: '2026-10-31',
      horaActual: '23:30:00',
      inicioMesActual: '2026-10-01',
      finMesActual: '2026-10-31',
      inicioMesAnterior: '2026-09-01',
      finMesAnterior: '2026-09-30',
    });
  });

  it('incluye la imagen principal del servicio en cada reserva móvil', () => {
    const service = Object.create(UserService.prototype) as UserService;
    const booking = {
      id_reserva: 42,
      fecha: new Date('2026-11-12T00:00:00.000Z'),
      hora_inicio: '18:00:00',
      hora_termino: '19:00:00',
      estado: 'pagada',
      precio_cobrado: 15000,
      comentarios: [],
      pista: {
        nombre: 'Cancha 1',
        servicio: {
          id_deporte: 'efec0828-d5b5-4ec5-b0e1-00bb6d7ef9c2',
          nombre: 'Tenis',
          imagen_principal: 'https://cdn.example.com/tenis.webp',
        },
      },
    } as unknown as BookingEntity;
    const mapMobileBooking = (
      service as unknown as {
        mapMobileBooking: (value: BookingEntity) => unknown;
      }
    ).mapMobileBooking.bind(service);

    expect(mapMobileBooking(booking)).toMatchObject({
      idReserva: 42,
      servicio: 'Tenis',
      imagenPrincipal: 'https://cdn.example.com/tenis.webp',
    });
  });

  it('adapta los comentarios heredados al contrato móvil', async () => {
    const service = Object.create(UserService.prototype) as UserService;
    vi.spyOn(service, 'getUserComments').mockResolvedValue({
      ok: true,
      comentarios: [
        {
          id_comentario: 7,
          id_servicio: 'efec0828-d5b5-4ec5-b0e1-00bb6d7ef9c2',
          nombre_servicio: 'Tenis',
          imagen_servicio: null,
          calificacion: 5,
          comentario: 'Excelente experiencia en la cancha.',
          is_active: 1,
          created_at: new Date('2026-11-05T22:15:00.000Z'),
          updated_at: new Date('2026-11-05T22:15:00.000Z'),
          reserva: {
            id_reserva: 42,
            id_usuario: 'b1f0aa77-8a14-4a8e-8aa0-9acdedcc55ef',
            fecha_visita: '2026-11-05',
            hora_visita: '18:00:00',
            hora_termino: '19:00:00',
          },
          pista: { id_pista: 3, nombre: 'Cancha 1' },
        },
      ],
    });

    await expect(
      service.getMobileCommentsData(
        'b1f0aa77-8a14-4a8e-8aa0-9acdedcc55ef',
      ),
    ).resolves.toEqual({
      ok: true,
      client: 'mobile',
      data: {
        comments: [
          {
            idComentario: 7,
            idReserva: 42,
            idServicio: 'efec0828-d5b5-4ec5-b0e1-00bb6d7ef9c2',
            servicio: 'Tenis',
            imagenServicio: null,
            pista: 'Cancha 1',
            calificacion: 5,
            comentario: 'Excelente experiencia en la cancha.',
            fechaReserva: '2026-11-05',
            horaInicio: '18:00:00',
            horaTermino: '19:00:00',
            createdAt: '2026-11-05T22:15:00.000Z',
            updatedAt: '2026-11-05T22:15:00.000Z',
          },
        ],
      },
    });
  });

  it('traduce únicamente los campos editables al actualizar el perfil móvil', async () => {
    const service = Object.create(UserService.prototype) as UserService;
    const mobileProfile = {
      ok: true,
      client: 'mobile' as const,
      data: { user: { idUsuario: 'user-id' } },
    };
    const updateUser = vi.spyOn(service, 'updateUser').mockResolvedValue({
      ok: true,
      msg: 'Perfil actualizado correctamente',
      usuario: {} as never,
    });
    vi.spyOn(service, 'getMobileProfileData').mockResolvedValue(
      mobileProfile as never,
    );

    await expect(
      service.updateMobileProfileData('user-id', {
        nombre: ' Nicolás ',
        apellido: ' Esponda ',
        email: 'NICOLAS@EXAMPLE.COM',
        telefono: '+56912345678',
        genero: 'M' as never,
        fechaNacimiento: '1995-08-24',
      }),
    ).resolves.toEqual({
      ...mobileProfile,
      message: 'Perfil actualizado correctamente',
    });

    expect(updateUser).toHaveBeenCalledWith('user-id', {
      nombre: ' Nicolás ',
      apellido: ' Esponda ',
      email: 'NICOLAS@EXAMPLE.COM',
      telefono: '+56912345678',
      genero: 'M',
      fecha_nacimiento: '1995-08-24',
    });
  });

  it('impide reseñar o consultar reseñas de una reserva que pertenece a otro usuario', async () => {
    const mockBookingRepo = {
      findOne: vi.fn().mockResolvedValue({
        id_reserva: 100,
        id_usuario: 'owner-uuid',
        estado: 'Pagada',
      }),
    };
    const mockCommentRepo = {};
    const mockUserRepo = {};

    const service = new UserService(
      mockBookingRepo as any,
      mockCommentRepo as any,
      mockUserRepo as any,
    );

    const attacker = {
      id_usuario: 'attacker-uuid',
      roles: ['user'],
    } as UserEntity;

    await expect(service.getCommentById(100, attacker)).rejects.toThrow(
      ForbiddenException,
    );

    await expect(
      service.createComment(
        {
          id_reserva: 100,
          id_servicio: 'efec0828-d5b5-4ec5-b0e1-00bb6d7ef9c2',
          calificacion: 5,
          comentario: 'Intento de reseña ajena',
        },
        attacker,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('ignora intentos de inyectar roles o is_active en updateUser (protección Mass Assignment)', async () => {
    const preload = vi.fn().mockImplementation(async (data) => ({ ...data }));
    const save = vi.fn().mockImplementation(async (entity) => entity);
    const service = new UserService(
      {} as any,
      {} as any,
      { preload, save } as any,
    );

    const maliciousPayload = {
      nombre: 'Usuario Normal',
      roles: ['admin', 'super-user'],
      is_active: true,
    } as any;

    await service.updateUser('user-uuid', maliciousPayload);

    expect(preload).toHaveBeenCalledOnce();
    const passedToPreload = preload.mock.calls[0][0];
    expect(passedToPreload.roles).toBeUndefined();
    expect(passedToPreload.is_active).toBeUndefined();
    expect(passedToPreload.nombre).toBe('Usuario Normal');
  });

  it('retorna todos los comentarios del usuario (activos y desactivados) sin filtrar por is_active', async () => {
    const queryBuilderMock = {
      innerJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        {
          id_comentario: 10,
          id_deporte: 'sport-uuid',
          calificacion: 5,
          comentario: 'Comentario activo',
          is_active: true,
          created_at: new Date('2026-11-10T15:00:00.000Z'),
          updated_at: new Date('2026-11-10T15:00:00.000Z'),
          id_reserva: {
            id_reserva: 101,
            id_usuario: 'user-uuid',
            fecha: '2026-11-09',
            hora_inicio: '18:00:00',
            hora_termino: '19:00:00',
            pista: {
              id_pista: 1,
              nombre: 'Cancha 1',
              servicio: {
                id_deporte: 'sport-uuid',
                nombre: 'Tenis',
                imagen_principal: 'https://cdn.example.com/tenis.webp',
              },
            },
          },
        },
        {
          id_comentario: 11,
          id_deporte: 'sport-uuid',
          calificacion: 4,
          comentario: 'Comentario desactivado o pendiente',
          is_active: false,
          created_at: new Date('2026-11-11T15:00:00.000Z'),
          updated_at: new Date('2026-11-11T15:00:00.000Z'),
          id_reserva: {
            id_reserva: 102,
            id_usuario: 'user-uuid',
            fecha: '2026-11-10',
            hora_inicio: '19:00:00',
            hora_termino: '20:00:00',
            pista: {
              id_pista: 2,
              nombre: 'Cancha 2',
              servicio: {
                id_deporte: 'sport-uuid',
                nombre: 'Tenis',
                imagen_principal: 'https://cdn.example.com/tenis.webp',
              },
            },
          },
        },
      ]),
    };

    const mockCommentRepo = {
      createQueryBuilder: vi.fn().mockReturnValue(queryBuilderMock),
    };

    const service = new UserService(
      {} as any,
      mockCommentRepo as any,
      {} as any,
    );

    const res = await service.getUserComments('user-uuid');

    expect(queryBuilderMock.where).toHaveBeenCalledWith(
      'r.id_usuario = :id_user',
      { id_user: 'user-uuid' },
    );
    expect(queryBuilderMock.andWhere).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
    expect(res.comentarios).toHaveLength(2);
    expect(res.comentarios.map((c) => c.is_active)).toEqual([1, 0]);
  });
});
