/**
 * Representa una opción rápida interactiva mostrada al usuario en el chat.
 */
export interface QuickReplyOption {
  id: string;
  label: string;
  icon: string;
}

/**
 * Estructura de un mensaje transmitido por el servidor WebSocket hacia el cliente.
 */
export interface ChatServerMessage {
  id: string;
  sender: 'user' | 'bot' | 'ai' | 'admin';
  senderName: string;
  message: string;
  timestamp: string;
  options?: QuickReplyOption[];
}

/**
 * Conversación de soporte activa o reciente visible desde el panel del administrador.
 */
export interface SupportConversation {
  sessionId: string;
  clientSocketId: string | null;
  userName: string;
  userEmail: string;
  isOnline: boolean;
  needsHumanAdmin: boolean;
  unreadForAdmin: boolean;
  updatedAt: string;
  messages: ChatServerMessage[];
}
