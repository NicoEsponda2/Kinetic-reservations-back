import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger, ValidationPipe } from '@nestjs/common';
import { brotliCompress, constants as zlibConstants, gzip } from 'node:zlib';
import type { NextFunction, Request, Response } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const PUBLIC_CACHEABLE_PATHS = [
  '/api/sport/home',
  '/api/sport/get-sports-names',
  '/api/comments/home-page',
  '/api/auth/google/config',
];

function performanceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // 0. Cabeceras de seguridad HTTP (endurecimiento equivalente a Helmet)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()',
  );

  // 1. Cabeceras Cache-Control inteligentes para endpoints públicos de lectura
  if (
    req.method === 'GET' &&
    PUBLIC_CACHEABLE_PATHS.some((path) => req.path.startsWith(path))
  ) {
    res.setHeader(
      'Cache-Control',
      'public, max-age=60, stale-while-revalidate=300',
    );
  }

  // 2. Compresión HTTP nativa (Brotli / Gzip) sin dependencias externas para payloads >= 1 KB
  const acceptEncoding = String(req.headers['accept-encoding'] ?? '');
  const supportsBrotli = /\bbr\b/.test(acceptEncoding);
  const supportsGzip = /\bgzip\b/.test(acceptEncoding);

  if (req.method === 'HEAD' || (!supportsBrotli && !supportsGzip)) {
    next();
    return;
  }

  const originalSend = res.send.bind(res);

  res.send = function compressAndSend(body?: any): Response {
    if (
      res.headersSent ||
      res.getHeader('Content-Encoding') ||
      (typeof body !== 'string' && !Buffer.isBuffer(body))
    ) {
      return originalSend(body);
    }

    const rawBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
    if (rawBuffer.byteLength < 1024) {
      return originalSend(body);
    }

    const contentType = String(res.getHeader('Content-Type') ?? '');
    if (
      contentType &&
      !/json|text\/|javascript|xml|svg/i.test(contentType)
    ) {
      return originalSend(body);
    }

    res.vary('Accept-Encoding');

    if (supportsBrotli) {
      brotliCompress(
        rawBuffer,
        { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 4 } },
        (err, compressed) => {
          if (err || res.headersSent) {
            originalSend(body);
            return;
          }
          res.setHeader('Content-Encoding', 'br');
          res.setHeader('Content-Length', compressed.byteLength);
          originalSend(compressed);
        },
      );
      return res;
    }

    gzip(rawBuffer, { level: 6 }, (err, compressed) => {
      if (err || res.headersSent) {
        originalSend(body);
        return;
      }
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Length', compressed.byteLength);
      originalSend(compressed);
    });
    return res;
  };

  next();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const expressInstance = app.getHttpAdapter().getInstance();
  if (typeof expressInstance?.disable === 'function') {
    expressInstance.disable('x-powered-by');
  }

  app.use(performanceMiddleware);
  app.setGlobalPrefix('api');

  const allowedOrigins = new Set(
    [
      process.env.FRONTEND_URL,
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'https://webpay3gint.transbank.cl',
      'https://webpay3g.transbank.cl',
    ].filter((origin): origin is string => Boolean(origin)),
  );

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || origin === 'null' || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('API de Kinetic Reservations')
      .setDescription(
        'Documentación oficial de la API REST de Kinetic Reservations para la gestión de servicios deportivos, canchas, horarios, reservas, pagos y usuarios.',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Ingresa el token JWT obtenido al autenticarte en /api/auth/login',
        },
        'bearer',
      )
      .addTag(
        'Deportes',
        'Catálogo público y gestión administrativa de servicios deportivos, galerías de imágenes, canchas y horarios de atención.',
      )
      .addTag('Autenticación', 'Registro, inicio de sesión, renovación de JWT y diagnóstico.')
      .addTag('Autenticación con Google', 'Configuración pública y autenticación con Google OAuth.')
      .addTag('Usuarios', 'Panel, historial, reseñas y perfil por usuario.')
      .addTag('Aplicación móvil', 'Contratos específicos para la aplicación móvil.')
      .addTag('Administración', 'Métricas y operaciones del panel administrativo.')
      .addTag('Reservas', 'Creación y consulta de reservas; algunas rutas son marcadores de posición.')
      .addTag('Horarios deportivos', 'Creación de horarios y consulta de disponibilidad.')
      .addTag('Comentarios', 'Creación y consulta de reseñas.')
      .addTag('Pagos', 'Inicio, retorno y confirmación de pagos Webpay.')
      .addTag('Datos de prueba', 'Carga destructiva de datos de ejemplo para pruebas.')
      .addTag('Canchas', 'Módulo de canchas; no expone rutas HTTP propias actualmente.')
      .addTag('Almacenamiento en Cloudinary', 'Módulo de almacenamiento; no expone rutas HTTP propias actualmente.')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Kinetic Reservations - Documentación de la API',
      swaggerOptions: {
        persistAuthorization: true,
        filter: true,
        showRequestDuration: true,
        docExpansion: 'list',
      },
    });
  }

  await app.listen(process.env.PORT ?? 3000);
  logger.log(`Application running on port ${process.env.PORT ?? 3000}`);
}
await bootstrap();
