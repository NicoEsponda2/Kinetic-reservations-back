import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageWsService } from './message-ws.service.js';
import { AdminReplyDto, NewMessageDto } from './dto/new-message.dto.js';

const ADMIN_ROOM = 'kinetic-admins-room';

/**
 * Gateway WebSocket para el chat de soporte híbrido (Clientes + IA + Panel Administrador).
 */
@WebSocketGateway({ cors: true })
export class MessageWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() wss: Server;

  constructor(private readonly messageWsService: MessageWsService) {}

  /**
   * Registra la conexión entrante y envía el mensaje de bienvenida con opciones rápidas.
   */
  handleConnection(client: Socket): void {
    this.messageWsService.registerClient(client);
    this.wss.emit(
      'clients-updated',
      this.messageWsService.getConnectedClients(),
    );
    client.emit('chat-welcome', this.messageWsService.buildWelcomeMessage());
  }

  /**
   * Limpia la sesión cuando el usuario cierra la pestaña o se desconecta y notifica al admin.
   */
  handleDisconnect(client: Socket): void {
    this.messageWsService.removeClient(client.id);
    this.wss.emit(
      'clients-updated',
      this.messageWsService.getConnectedClients(),
    );
    this.broadcastConversationsToAdmins();
  }

  /**
   * Vincula la sesión del cliente al abrir o reconectar su widget para recibir respuestas del admin.
   */
  @SubscribeMessage('client-identify')
  onClientIdentify(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { sessionId?: string; userName?: string; userEmail?: string },
  ): void {
    if (!payload?.sessionId) return;
    this.messageWsService.bindClientSession(
      client.id,
      payload.sessionId,
      payload.userName,
      payload.userEmail,
    );
    this.broadcastConversationsToAdmins();
  }

  /**
   * Recibe un mensaje o selección rápida del cliente, responde y actualiza el panel del admin en vivo.
   */
  @SubscribeMessage('message-from-client')
  async onMessageFromClient(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: NewMessageDto,
  ): Promise<void> {
    if (!payload?.message || typeof payload.message !== 'string') {
      return;
    }

    client.emit('bot-typing', { typing: true });

    const { userEcho, assistantReply, isInstant } =
      await this.messageWsService.processClientMessage(payload, client.id);

    client.emit('message-from-server', userEcho);
    this.broadcastConversationsToAdmins();

    if (!isInstant) {
      await new Promise((resolve) => setTimeout(resolve, 450));
    }

    client.emit('bot-typing', { typing: false });
    client.emit('message-from-server', assistantReply);
    this.broadcastConversationsToAdmins();
  }

  /**
   * Suscribe el socket del administrador a la sala de monitoreo en tiempo real.
   */
  @SubscribeMessage('admin-join')
  onAdminJoin(@ConnectedSocket() client: Socket): void {
    client.join(ADMIN_ROOM);
    client.emit(
      'admin-conversations-updated',
      this.messageWsService.getConversations(),
    );
  }

  /**
   * Envía la respuesta de un administrador en vivo al usuario correspondiente.
   */
  @SubscribeMessage('admin-reply')
  onAdminReply(@MessageBody() payload: AdminReplyDto): void {
    if (!payload?.sessionId || !payload?.message?.trim()) {
      return;
    }

    const result = this.messageWsService.registerAdminReply(payload);
    if (!result) return;

    const { conversation, adminMessage } = result;
    if (conversation.clientSocketId) {
      this.wss
        .to(conversation.clientSocketId)
        .emit('message-from-server', adminMessage);
    }

    this.broadcastConversationsToAdmins();
  }

  /**
   * Marca una conversación como leída desde el panel administrativo.
   */
  @SubscribeMessage('admin-mark-read')
  onAdminMarkRead(@MessageBody() payload: { sessionId?: string }): void {
    if (!payload?.sessionId) return;
    this.messageWsService.markConversationRead(payload.sessionId);
    this.broadcastConversationsToAdmins();
  }

  /**
   * Marca una solicitud de atención humana como resuelta.
   */
  @SubscribeMessage('admin-resolve')
  onAdminResolve(@MessageBody() payload: { sessionId?: string }): void {
    if (!payload?.sessionId) return;
    this.messageWsService.resolveConversation(payload.sessionId);
    this.broadcastConversationsToAdmins();
  }

  /**
   * Emite la lista actualizada de conversaciones a todos los administradores conectados.
   */
  private broadcastConversationsToAdmins(): void {
    this.wss
      ?.to(ADMIN_ROOM)
      .emit(
        'admin-conversations-updated',
        this.messageWsService.getConversations(),
      );
  }
}
