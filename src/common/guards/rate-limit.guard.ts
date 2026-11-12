import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface RateBucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000; // Ventana de 1 minuto
const GLOBAL_MAX_REQUESTS = 120; // Máximo general por IP por minuto
const AUTH_MAX_REQUESTS = 25; // Límite más estricto contra fuerza bruta en login/register
const MAX_RATE_BUCKETS = 5_000; // Límite máximo de entradas en memoria contra agotamiento RAM

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateBucket>();
  private lastCleanup = Date.now();

  /**
   * Verifica que una solicitud HTTP no supere el límite configurado para su IP
   * y añade a la respuesta los encabezados con el estado del límite.
   *
   * @param context Contexto de ejecución utilizado para acceder a la solicitud y la respuesta HTTP.
   * @returns `true` cuando la solicitud puede continuar; lanza una excepción si excede el límite.
   */
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();

    if (req.method === 'OPTIONS') {
      return true;
    }

    const now = Date.now();
    if (now - this.lastCleanup > WINDOW_MS) {
      this.cleanupExpiredBuckets(now);
      this.lastCleanup = now;
    }

    const url = req.originalUrl || req.url || '';
    const isAuthSensitive =
      req.method === 'POST' &&
      (url.includes('/api/auth/login') ||
        url.includes('/api/auth/register') ||
        url.includes('/api/auth/google'));

    const limit = isAuthSensitive ? AUTH_MAX_REQUESTS : GLOBAL_MAX_REQUESTS;
    const scope = isAuthSensitive ? 'auth' : 'global';
    const ip = this.extractClientIp(req);
    const key = `${scope}:${ip}`;

    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (this.buckets.size >= MAX_RATE_BUCKETS) {
        this.cleanupExpiredBuckets(now);
        if (this.buckets.size >= MAX_RATE_BUCKETS) {
          const oldestKey = this.buckets.keys().next().value;
          if (oldestKey) {
            this.buckets.delete(oldestKey);
          }
        }
      }
      bucket = {
        count: 1,
        resetAt: now + WINDOW_MS,
      };
      this.buckets.set(key, bucket);
    } else {
      bucket.count += 1;
    }

    const remaining = Math.max(0, limit - bucket.count);
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (bucket.count > limit) {
      res.setHeader('Retry-After', String(retryAfterSec));
      throw new HttpException(
        {
          ok: false,
          message:
            'Demasiadas solicitudes seguidas. Por favor espera unos segundos antes de intentar nuevamente.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Obtiene la dirección IP del cliente, priorizando el encabezado enviado por proxies.
   *
   * @param req Solicitud HTTP de la que se extraerá la dirección IP.
   * @returns Dirección IP detectada o `unknown` cuando no está disponible.
   */
  private extractClientIp(req: Request): string {
    if (process.env.TRUST_PROXY === 'true') {
      const forwarded = req.headers['x-forwarded-for'];
      if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
      }
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  /**
   * Elimina los registros de límite cuya ventana de tiempo ya expiró.
   *
   * @param now Marca de tiempo actual usada para identificar los registros vencidos.
   * @returns No retorna ningún valor.
   */
  private cleanupExpiredBuckets(now: number): void {
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}

