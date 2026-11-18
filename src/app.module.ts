import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportsModule } from './modules/sports/sport.module.js';
import { CommonModule } from './common/common.module.js';
import { SeedModule } from './seed/seed.module.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AuthModule } from './auth/auth.module.js';
import { AdminModule } from './admin/admin.module.js';
import { CommentsModule } from './modules/comments/comments.module.js';
import { BookingsModule } from './modules/bookings/bookings.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { SportsSchedulesModule } from './modules/sports-schedules/sports-schedules.module.js';
import { UserModule } from './modules/user/user.module.js';
import { MessageWsModule } from './message-ws/message-ws.module.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT!,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      autoLoadEntities: true,
      synchronize:
        process.env.DB_SYNCHRONIZE === 'true' ||
        process.env.NODE_ENV !== 'production',
      extra: {
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
    }),

    ServeStaticModule.forRoot({
      rootPath: join(currentDirectory, '..', 'public'),
    }),

    SportsModule,

    SportsSchedulesModule,

    CommonModule,

    SeedModule,

    AuthModule,

    AdminModule,

    CommentsModule,

    BookingsModule,

    PaymentsModule,

    UserModule,

    MessageWsModule,
  ],
})
export class AppModule {}
