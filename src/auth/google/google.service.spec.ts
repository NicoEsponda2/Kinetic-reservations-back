import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GoogleService } from './google.service.js';

describe('GoogleService - Verificación de Audiencia OAuth2 (Confused Deputy Protection)', () => {
  const VALID_CLIENT_ID =
    '145686420353-pgv150b8k0hv02gn49412cn8a7tdrtat.apps.googleusercontent.com';

  const mockConfigService = {
    get: vi.fn((key: string) =>
      key === 'GOOGLE_CLIENT_ID' ? VALID_CLIENT_ID : undefined,
    ),
  } as unknown as ConfigService;

  const mockJwtService = {
    sign: vi.fn().mockReturnValue('signed-session-jwt'),
  } as unknown as JwtService;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debe rechazar un access_token emitido para otra aplicación (aud distinto al GOOGLE_CLIENT_ID)', async () => {
    const mockUserRepo = {
      findOne: vi.fn(),
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          aud: '999999999-attacker-app.apps.googleusercontent.com',
          azp: '999999999-attacker-app.apps.googleusercontent.com',
        }),
      }),
    );

    const service = new GoogleService(
      mockUserRepo as any,
      mockJwtService,
      mockConfigService,
    );

    await expect(
      service.authenticateWithGoogle({ token: 'ya29.foreign-access-token' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('debe aceptar un access_token cuya audiencia coincide con GOOGLE_CLIENT_ID y autenticar al usuario', async () => {
    const existingUser = {
      id_usuario: 'user-uuid-1',
      email: 'ana@example.com',
      nombre: 'Ana',
      apellido: 'Pérez',
      is_active: true,
      roles: ['user'],
      imagen: 'https://lh3.googleusercontent.com/avatar',
    };
    const mockUserRepo = {
      findOne: vi.fn().mockResolvedValue(existingUser),
    };

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        // 1. Respuesta de oauth2.googleapis.com/tokeninfo
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            aud: VALID_CLIENT_ID,
            azp: VALID_CLIENT_ID,
          }),
        })
        // 2. Respuesta de www.googleapis.com/oauth2/v3/userinfo
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sub: '1234567890',
            email: 'ana@example.com',
            email_verified: true,
            given_name: 'Ana',
            family_name: 'Pérez',
            picture: 'https://lh3.googleusercontent.com/avatar',
          }),
        }),
    );

    const service = new GoogleService(
      mockUserRepo as any,
      mockJwtService,
      mockConfigService,
    );

    const result = await service.authenticateWithGoogle({
      token: 'ya29.valid-app-access-token',
    });

    expect(result.token).toBe('signed-session-jwt');
    expect(result.usuario.email).toBe('ana@example.com');
    expect(result.isNewUser).toBe(false);
  });
});
