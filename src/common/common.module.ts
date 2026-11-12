import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ServerCacheService } from './cache/server-cache.service.js';
import { ServerHttpCacheInterceptor } from './interceptors/server-http-cache.interceptor.js';
import { RateLimitGuard } from './guards/rate-limit.guard.js';

@Module({
  providers: [
    ServerCacheService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ServerHttpCacheInterceptor,
    },
  ],
  exports: [ServerCacheService],
})
export class CommonModule {}
