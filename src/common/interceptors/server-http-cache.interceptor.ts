import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, of, tap } from 'rxjs';
import { ServerCacheService } from '../cache/server-cache.service.js';

@Injectable()
export class ServerHttpCacheInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: ServerCacheService) {}

  /**
   * Gestiona la caché HTTP de la solicitud antes y después de ejecutar el manejador correspondiente.
   *
   * @param context Contexto de ejecución de la solicitud actual.
   * @param next Manejador que continúa con la ejecución de la ruta.
   * @returns Un observable con la respuesta recuperada de la caché o generada por el manejador.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();

    // Si ocurre una escritura exitosa (POST, PUT, PATCH, DELETE), invalidamos el caché del servidor
    if (req.method !== 'GET') {
      const mutationUrl = req.originalUrl || req.url || '';
      const isAuthEndpoint =
        mutationUrl.includes('/api/auth/login') ||
        mutationUrl.includes('/api/auth/google');
      return next.handle().pipe(
        tap(() => {
          if (
            !isAuthEndpoint &&
            res.statusCode >= 200 &&
            res.statusCode < 300
          ) {
            this.cacheService.clear();
          }
        }),
      );
    }

    if (req.headers['x-skip-cache'] === 'true') {
      return next.handle();
    }

    const url = req.originalUrl || req.url;
    const rule = this.cacheService.resolveRule(url);
    if (!rule) {
      return next.handle();
    }

    const authHeader =
      typeof req.headers.authorization === 'string'
        ? req.headers.authorization
        : undefined;
    const key = this.cacheService.buildKey(url, authHeader, rule.publicShared);

    const cachedResponse = this.cacheService.get(key);
    if (cachedResponse !== undefined) {
      res.setHeader('X-Cache', 'HIT');
      return of(cachedResponse);
    }

    res.setHeader('X-Cache', 'MISS');
    return next.handle().pipe(
      tap((responseBody) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.cacheService.set(key, responseBody, rule.ttlMs);
        }
      }),
    );
  }
}
