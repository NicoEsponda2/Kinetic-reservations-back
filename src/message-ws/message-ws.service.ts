import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { randomUUID } from 'node:crypto';
import { AdminReplyDto, NewMessageDto } from './dto/new-message.dto.js';
import {
  ChatServerMessage,
  SupportConversation,
} from './interfaces/chat-message.interface.js';
import { AiAssistantService } from './services/ai-assistant.service.js';

interface ConnectedClients {
  [id: string]: Socket;
}

const MAX_CONVERSATIONS = 40;
const MAX_MESSAGES_PER_CONVERSATION = 60;

/**
 * Servicio encargado de gestionar las sesiones WebSocket activas, el historial
 * acotado de conversaciones para el panel de administración y la respuesta híbrida.
 */
@Injectable()
export class MessageWsService {
  private connectedClients: ConnectedClients = {};
  private conversations = new Map<string, SupportConversation>();
  private socketToSession = new Map<string, string>();

  constructor(private readonly aiAssistantService: AiAssistantService) {}

  /**
   * Registra un cliente Socket.IO al conectarse.
   */
  registerClient(client: Socket): void {
    this.connectedClients[client.id] = client;
  }

  /**
   * Elimina la referencia del socket al desconectarse y actualiza su estado online.
   */
  removeClient(clientId: string): void {
    delete this.connectedClients[clientId];
    const sessionId = this.socketToSession.get(clientId);
    if (sessionId) {
      const conv = this.conversations.get(sessionId);
      if (conv && conv.clientSocketId === clientId) {
        conv.isOnline = false;
        conv.clientSocketId = null;
      }
      this.socketToSession.delete(clientId);
    }
  }

  /**
   * Devuelve la lista de identificadores de sockets actualmente conectados.
   */
  getConnectedClients(): string[] {
    return Object.keys(this.connectedClients);
  }

  /**
   * Vincula un socket activo con su identificador de sesión de cliente.
   */
  bindClientSession(
    clientId: string,
    sessionId: string,
    userName?: string,
    userEmail?: string,
  ): void {
    if (!sessionId) return;
    this.socketToSession.set(clientId, sessionId);
    const existing = this.conversations.get(sessionId);
    if (existing) {
      existing.clientSocketId = clientId;
      existing.isOnline = true;
      if (userName?.trim()) existing.userName = userName.trim();
      if (userEmail?.trim()) existing.userEmail = userEmail.trim();
    }
  }

  /**
   * Construye el mensaje inicial de bienvenida con las opciones rápidas interactivas.
   */
  buildWelcomeMessage(): ChatServerMessage {
    return {
      id: randomUUID(),
      sender: 'bot',
      senderName: 'Asistente Kinetic',
      message:
        '¡Hola! 👋 Bienvenido al soporte en vivo de Kinetic Sports Club. Selecciona una consulta rápida o escribe tu pregunta abajo:',
      timestamp: new Date().toISOString(),
      options: this.aiAssistantService.getQuickReplyOptions(),
    };
  }

  /**
   * Procesa el mensaje entrante del usuario, actualiza la conversación para el admin
   * y genera la respuesta automática (bot rápido o IA Gemini).
   */
  async processClientMessage(
    dto: NewMessageDto,
    clientSocketId?: string,
  ): Promise<{
    userEcho: ChatServerMessage;
    assistantReply: ChatServerMessage;
    isInstant: boolean;
    conversation: SupportConversation;
  }> {
    const cleanText = dto.message.trim();
    const sessionId = dto.sessionId?.trim() || clientSocketId || randomUUID();
    const senderLabel = dto.userName?.trim() || 'Visitante';

    const userEcho: ChatServerMessage = {
      id: randomUUID(),
      sender: 'user',
      senderName: senderLabel,
      message: cleanText,
      timestamp: new Date().toISOString(),
    };

    let assistantReply: ChatServerMessage;
    let isInstant = false;

    if (dto.quickOptionId) {
      const quickAnswer = this.aiAssistantService.resolveQuickOption(
        dto.quickOptionId,
      );
      if (quickAnswer) {
        isInstant = true;
        assistantReply = {
          id: randomUUID(),
          sender: 'bot',
          senderName: 'Recepción Kinetic',
          message: quickAnswer,
          timestamp: new Date().toISOString(),
          options: this.aiAssistantService.getQuickReplyOptions(),
        };
      } else {
        const { reply, source } =
          await this.aiAssistantService.generateFreeTextReply(cleanText);
        assistantReply = {
          id: randomUUID(),
          sender: source,
          senderName: source === 'ai' ? 'Kinetic IA' : 'Asistente Kinetic',
          message: reply,
          timestamp: new Date().toISOString(),
        };
      }
    } else {
      const { reply, source } =
        await this.aiAssistantService.generateFreeTextReply(cleanText);
      assistantReply = {
        id: randomUUID(),
        sender: source,
        senderName: source === 'ai' ? 'Kinetic IA' : 'Asistente Kinetic',
        message: reply,
        timestamp: new Date().toISOString(),
      };
    }

    const requestsHuman =
      dto.quickOptionId === 'humano' ||
      /(humano|persona|admin|administrador|recepcion|llamar|ayuda|problema)/i.test(
        cleanText,
      );

    const conversation = this.upsertConversation({
      sessionId,
      clientSocketId: clientSocketId ?? null,
      userName: senderLabel,
      userEmail: dto.userEmail?.trim() || 'Sin correo registrado',
      requestsHuman,
      newMessages: [userEcho, assistantReply],
    });

    return {
      userEcho,
      assistantReply,
      isInstant,
      conversation,
    };
  }

  /**
   * Registra una respuesta enviada por un administrador hacia un usuario.
   */
  registerAdminReply(dto: AdminReplyDto): {
    conversation: SupportConversation;
    adminMessage: ChatServerMessage;
  } | null {
    const conv = this.conversations.get(dto.sessionId);
    if (!conv) return null;

    const adminMessage: ChatServerMessage = {
      id: randomUUID(),
      sender: 'admin',
      senderName: dto.adminName?.trim() || 'Administración Kinetic',
      message: dto.message.trim(),
      timestamp: new Date().toISOString(),
    };

    conv.messages = [
      ...conv.messages.slice(-(MAX_MESSAGES_PER_CONVERSATION - 1)),
      adminMessage,
    ];
    conv.needsHumanAdmin = false;
    conv.unreadForAdmin = false;
    conv.updatedAt = adminMessage.timestamp;

    return { conversation: conv, adminMessage };
  }

  /**
   * Marca una conversación como leída por el administrador.
   */
  markConversationRead(sessionId: string): SupportConversation | null {
    const conv = this.conversations.get(sessionId);
    if (!conv) return null;
    conv.unreadForAdmin = false;
    return conv;
  }

  /**
   * Marca una conversación como atendida/resuelta por el administrador.
   */
  resolveConversation(sessionId: string): SupportConversation | null {
    const conv = this.conversations.get(sessionId);
    if (!conv) return null;
    conv.needsHumanAdmin = false;
    conv.unreadForAdmin = false;
    return conv;
  }

  /**
   * Retorna todas las conversaciones ordenadas por prioridad (solicitud humana primero) y fecha.
   */
  getConversations(): SupportConversation[] {
    return Array.from(this.conversations.values()).sort((a, b) => {
      if (a.needsHumanAdmin !== b.needsHumanAdmin) {
        return a.needsHumanAdmin ? -1 : 1;
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }

  /**
   * Crea o actualiza una conversación manteniendo límites estrictos de memoria en la VM.
   */
  private upsertConversation(params: {
    sessionId: string;
    clientSocketId: string | null;
    userName: string;
    userEmail: string;
    requestsHuman: boolean;
    newMessages: ChatServerMessage[];
  }): SupportConversation {
    if (params.clientSocketId) {
      this.socketToSession.set(params.clientSocketId, params.sessionId);
    }

    let conv = this.conversations.get(params.sessionId);
    const now = new Date().toISOString();

    if (!conv) {
      if (this.conversations.size >= MAX_CONVERSATIONS) {
        const oldestKey = this.conversations.keys().next().value;
        if (oldestKey) {
          this.conversations.delete(oldestKey);
        }
      }

      conv = {
        sessionId: params.sessionId,
        clientSocketId: params.clientSocketId,
        userName: params.userName,
        userEmail: params.userEmail,
        isOnline: Boolean(params.clientSocketId),
        needsHumanAdmin: params.requestsHuman,
        unreadForAdmin: true,
        updatedAt: now,
        messages: [this.buildWelcomeMessage()],
      };
      this.conversations.set(params.sessionId, conv);
    } else {
      if (params.clientSocketId) {
        conv.clientSocketId = params.clientSocketId;
        conv.isOnline = true;
      }
      if (params.userName && params.userName !== 'Visitante') {
        conv.userName = params.userName;
      }
      if (
        params.userEmail &&
        params.userEmail !== 'Sin correo registrado'
      ) {
        conv.userEmail = params.userEmail;
      }
      if (params.requestsHuman) {
        conv.needsHumanAdmin = true;
      }
      conv.unreadForAdmin = true;
      conv.updatedAt = now;
    }

    conv.messages = [
      ...conv.messages,
      ...params.newMessages,
    ].slice(-MAX_MESSAGES_PER_CONVERSATION);

    return conv;
  }
}
