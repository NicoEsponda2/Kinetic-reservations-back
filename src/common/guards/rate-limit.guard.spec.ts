import { describe, expect, it, vi } from 'vitest';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard.js';

describe('RateLimitGuard - Protección contra Fuerza Bruta y Spoofing de IP', () => {
  const createHttpContext = (options: {
    method?: string;
    url?: string;
    ip?: string;
    forwardedFor?: string;
  }) => {
    const headers: Record<string, string> = {};
    if (options.forwardedFor) {
      headers['x-forwarded-for'] = options.forwardedFor;
    }

    const setHeader = vi.fn();
    const req = {
      method: options.method ?? 'POST',
      originalUrl: options.url ?? '/api/auth/login',
      url: options.url ?? '/api/auth/login',
      ip: options.ip ?? '192.168.1.50',
      headers,
      socket: { remoteAddress: options.ip ?? '192.168.1.50' },
    };
    const res = { setHeader };

    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;

    return { context, setHeader };
  };

  it('debe bloquear con HTTP 429 tras superar los 25 intentos por minuto en rutas de autenticación', () => {
    const guard = new RateLimitGuard();

    for (let i = 0; i < 25; i++) {
      const { context } = createHttpContext({
        method: 'POST',
        url: '/api/auth/login',
        ip: '10.0.0.15',
      });
      expect(guard.canActivate(context)).toBe(true);
    }

    const { context: blockedCtx, setHeader } = createHttpContext({
      method: 'POST',
      url: '/api/auth/login',
      ip: '10.0.0.15',
    });

    try {
      guard.canActivate(blockedCtx);
      expect.unreachable('Debió lanzar HttpException 429');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect(setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    }
  });

  it('no debe permitir evadir el límite falsificando X-Forwarded-For cuando TRUST_PROXY no está activo', () => {
    delete process.env.TRUST_PROXY;
    const guard = new RateLimitGuard();

    for (let i = 0; i < 25; i++) {
      const { context } = createHttpContext({
        method: 'POST',
        url: '/api/auth/google',
        ip: '10.0.0.99',
        forwardedFor: `203.0.113.${i}`, // IP falsa distinta en cada petición
      });
      expect(guard.canActivate(context)).toBe(true);
    }

    // La petición 26 desde la misma IP real debe ser bloqueada aunque cambie X-Forwarded-For
    const { context: spoofedCtx } = createHttpContext({
      method: 'POST',
      url: '/api/auth/google',
      ip: '10.0.0.99',
      forwardedFor: '198.51.100.250',
    });

    expect(() => guard.canActivate(spoofedCtx)).toThrow(HttpException);
  });
});
