import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessageWsService } from './message-ws.service.js';
import { MessageWsGateway } from './message-ws.gateway.js';
import { AiAssistantService } from './services/ai-assistant.service.js';

/**
 * Módulo de mensajería en tiempo real mediante WebSockets y asistencia híbrida.
 */
@Module({
  imports: [ConfigModule],
  providers: [MessageWsGateway, MessageWsService, AiAssistantService],
})
export class MessageWsModule {}
