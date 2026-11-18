import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { AiAssistantService } from './services/ai-assistant.service.js';
import { MessageWsService } from './message-ws.service.js';

describe('MessageWsService (Chat Híbrido WebSocket)', () => {
  let messageWsService: MessageWsService;

  beforeEach(() => {
    const configService = {
      get: () => undefined,
    } as unknown as ConfigService;
    const aiAssistantService = new AiAssistantService(configService);
    messageWsService = new MessageWsService(aiAssistantService);
  });

  it('debe construir el mensaje de bienvenida con opciones rápidas', () => {
    const welcome = messageWsService.buildWelcomeMessage();
    expect(welcome.sender).toBe('bot');
    expect(welcome.options?.length).toBeGreaterThan(0);
  });

  it('debe resolver una opción rápida de manera instantánea', async () => {
    const result = await messageWsService.processClientMessage({
      message: 'Horarios y deportes',
      quickOptionId: 'horarios',
    });

    expect(result.isInstant).toBe(true);
    expect(result.assistantReply.message).toContain('08:00');
  });

  it('debe responder texto libre usando el motor inteligente local cuando no hay GEMINI_API_KEY', async () => {
    const result = await messageWsService.processClientMessage({
      message: '¿Qué pasa si llueve el día de mi reserva?',
    });

    expect(result.isInstant).toBe(false);
    expect(result.assistantReply.message.toLowerCase()).toContain('techadas');
  });

  it('debe registrar la conversación para el panel del administrador y permitir responder en vivo', async () => {
    await messageWsService.processClientMessage(
      {
        message: 'Necesito hablar con un administrador',
        quickOptionId: 'humano',
        sessionId: 'sess-123',
        userName: 'Ana Pérez',
        userEmail: 'ana@kinetic.com',
      },
      'socket-abc',
    );

    const conversations = messageWsService.getConversations();
    expect(conversations.length).toBe(1);
    expect(conversations[0].needsHumanAdmin).toBe(true);
    expect(conversations[0].userName).toBe('Ana Pérez');

    const replyResult = messageWsService.registerAdminReply({
      sessionId: 'sess-123',
      message: 'Hola Ana, te atiende administración.',
      adminName: 'Admin Central',
    });

    expect(replyResult).not.toBeNull();
    expect(replyResult?.adminMessage.sender).toBe('admin');
    expect(replyResult?.conversation.needsHumanAdmin).toBe(false);
  });
});
