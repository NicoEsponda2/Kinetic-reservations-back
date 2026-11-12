import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

interface ServerCacheEntry {
  value: unknown;
  expiresAt: number;
  createdAt: number;
}

interface ServerCacheRule {
  pattern: string;
  ttlMs: number;
  publicShared: boolean;
}

const MAX_SERVER_CACHE_ENTRIES = 500;

const SERVER_CACHE_RULES: readonly ServerCacheRule[] = [
  // Rutas que nunca deben cachearse en el servidor
  { pattern: '/api/payment/', ttlMs: 0, publicShared: false },
  { pattern: '/api/auth/renew', ttlMs: 0, publicShared: false },

  // Escudo corto contra ráfagas en consulta de horarios disponibles (10s)
  {
    pattern: '/api/sports-schedules/get-available-times',
    ttlMs: 10_000,
    publicShared: true,
  },

  // Catálogo público compartido para todos los visitantes (5 minutos)
  { pattern: '/api/auth/google/config', ttlMs: 15 * 60_000, publicShared: true },
  { pattern: '/api/sport/home', ttlMs: 5 * 60_000, publicShared: true },
  {
    pattern: '/api/sport/get-sports-names',
    ttlMs: 5 * 60_000,
    publicShared: true,
  },
  { pattern: '/api/comments/home-page', ttlMs: 5 * 60_000, publicShared: true },

  // Paneles autenticados aislados por token de sesión (60 segundos)
  { pattern: '/api/admin/dashboard', ttlMs: 60_000, publicShared: false },
  {
    pattern: '/api/sport/admin/find-sports',
    ttlMs: 90_000,
    publicShared: false,
  },
  {
    pattern: '/api/bookings/admin/bookings-history',
    ttlMs: 60_000,
    publicShared: false,
  },
  {
    pattern: '/api/comments/admin/find-comments',
    ttlMs: 60_000,
    publicShared: false,
  },
  { pattern: '/api/auth/admin/find-users', ttlMs: 60_000, publicShared: false },
  {
    pattern: '/api/user/mobile/dashboard',
    ttlMs: 60_000,
    publicShared: false,
  },
  {
    pattern: '/api/user/mobile/bookings',
    ttlMs: 60_000,
    publicShared: false,
  },
  {
    pattern: '/api/user/mobile/comments',
    ttlMs: 60_000,
    publicShared: false,
  },
  {
    pattern: '/api/user/get-dashboard-data/',
    ttlMs: 60_000,
    publicShared: false,
  },
  { pattern: '/api/user/booking-history/', ttlMs: 60_000, publicShared: false },
];

@Injectable()
export class ServerCacheService {
  private readonly store = new Map<string, ServerCacheEntry>();

  /**
   * Busca la regla de caché configurada para una URL.
   *
   * @param url URL de la solicitud que se desea evaluar.
   * @returns La regla de caché aplicable o `null` si la ruta no debe almacenarse.
   */
  resolveRule(url: string): ServerCacheRule | null {
    for (const rule of SERVER_CACHE_RULES) {
      if (url.includes(rule.pattern)) {
        return rule.ttlMs > 0 ? rule : null;
      }
    }
    return null;
  }

  /**
   * Construye una clave de caché pública o aislada por sesión.
   *
   * @param originalUrl URL original de la solicitud.
   * @param authHeader Encabezado de autorización utilizado para identificar la sesión.
   * @param publicShared Indica si la entrada se comparte entre todos los usuarios.
   * @returns La clave que identifica la entrada en la caché.
   */
  buildKey(
    originalUrl: string,
    authHeader: string | undefined,
    publicShared: boolean,
  ): string {
    if (publicShared) {
      return `pub|${originalUrl}`;
    }
    const tokenScope = authHeader
      ? `usr:${this.hashString(authHeader)}`
      : 'anon';
    return `${tokenScope}|${originalUrl}`;
  }

  /**
   * Obtiene una entrada vigente de la caché y elimina las que hayan expirado.
   *
   * @param key Clave de la entrada que se desea recuperar.
   * @returns El valor almacenado o `undefined` si no existe o ya expiró.
   */
  get(key: string): unknown | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Almacena un valor en la caché durante el tiempo de vida indicado.
   *
   * @param key Clave que identificará la entrada.
   * @param value Valor que se desea almacenar.
   * @param ttlMs Tiempo de vida de la entrada, expresado en milisegundos.
   * @returns No retorna ningún valor.
   */
  set(key: string, value: unknown, ttlMs: number): void {
    if (ttlMs <= 0) {
      return;
    }

    const now = Date.now();
    if (this.store.size >= MAX_SERVER_CACHE_ENTRIES) {
      this.evictExpiredOrOldest(now);
    }

    this.store.set(key, {
      value,
      createdAt: now,
      expiresAt: now + ttlMs,
    });
  }

  /**
   * Elimina todas las entradas almacenadas en la caché.
   *
   * @returns No retorna ningún valor.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Libera espacio eliminando entradas expiradas o la entrada vigente más antigua.
   *
   * @param now Marca de tiempo actual utilizada para detectar entradas expiradas.
   * @returns No retorna ningún valor.
   */
  private evictExpiredOrOldest(now: number): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [k, v] of this.store.entries()) {
      if (v.expiresAt <= now) {
        this.store.delete(k);
      } else if (v.createdAt < oldestTime) {
        oldestTime = v.createdAt;
        oldestKey = k;
      }
    }

    if (this.store.size >= MAX_SERVER_CACHE_ENTRIES && oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  /**
   * Genera un hash hexadecimal criptográfico SHA-256 determinista para una cadena.
   *
   * @param input Cadena que se desea procesar.
   * @returns El hash hexadecimal calculado.
   */
  private hashString(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }
}
