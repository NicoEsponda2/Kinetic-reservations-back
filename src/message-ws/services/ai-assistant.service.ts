import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QuickReplyOption } from '../interfaces/chat-message.interface.js';

const SYSTEM_PROMPT = `Eres el asistente virtual de recepción de "Kinetic Sports Club" (plataforma Kinetic Reservations).
Responde siempre en español de forma breve, amable y clara (máximo 3-4 líneas).
Información oficial del club:
- Deportes disponibles: Pádel, Tenis, Fútbol / Futbolito, Básquetbol y Natación.
- Horario de atención: Lunes a Domingo de 08:00 a 23:00 hrs.
- Pagos: 100% online mediante Webpay Plus (tarjetas de débito y crédito) al confirmar la reserva.
- Lluvia y clima: Contamos con canchas techadas. En canchas al aire libre, si llueve puedes reprogramar sin costo avisando con al menos 2 horas de anticipación.
- Arriendo de equipamiento: Arriendo de palas de pádel, raquetas y balones disponible en recepción ($2.500 a $4.000 CLP).
- Estacionamiento y camarines: Estacionamiento privado gratuito, camarines con duchas de agua caliente y cafetería.
- Cancelaciones: Se puede cancelar o reagendar hasta con 24 horas de anticipación desde el panel de usuario.
Si el usuario solicita hablar con una persona o tiene un problema específico con un cobro, indícale que su consulta quedó registrada para un administrador del club.`;

/**
 * Servicio híbrido de asistencia automática para el chat WebSocket.
 * Combina respuestas rápidas instantáneas, motor local de intenciones ($0) y Gemini Flash API gratuita opcional.
 */
@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Retorna las opciones rápidas iniciales que se presentan al abrir el chat.
   */
  getQuickReplyOptions(): QuickReplyOption[] {
    return [
      { id: 'horarios', label: 'Horarios y deportes', icon: 'schedule' },
      { id: 'lluvia', label: 'Política de lluvia', icon: 'rainy' },
      { id: 'implementos', label: 'Arriendo e instalaciones', icon: 'sports_tennis' },
      { id: 'pagos', label: 'Pagos y cancelaciones', icon: 'credit_card' },
      { id: 'humano', label: 'Hablar con administración', icon: 'support_agent' },
    ];
  }

  /**
   * Resuelve de forma instantánea una opción rápida seleccionada por el usuario.
   */
  resolveQuickOption(optionId: string): string | null {
    switch (optionId) {
      case 'horarios':
        return '🕒 Nuestro club abre de Lunes a Domingo entre las 08:00 y las 23:00 hrs. Contamos con canchas de Pádel, Tenis, Fútbol, Básquetbol y Natación. Puedes ver la disponibilidad en vivo desde la sección "Servicios".';
      case 'lluvia':
        return '🌧️ Contamos con canchas techadas que funcionan con normalidad bajo lluvia. Para canchas descubiertas, si el clima impide jugar puedes reprogramar tu reserva sin costo adicional.';
      case 'implementos':
        return '🎾 En recepción disponemos de arriendo de palas de pádel, raquetas y balones ($2.500 - $4.000 CLP). Además, tu reserva incluye estacionamiento gratuito y acceso a camarines con duchas.';
      case 'pagos':
        return '💳 Todas las reservas se confirman de inmediato pagando con Webpay Plus (débito o crédito). Puedes reprogramar o cancelar hasta con 24 horas de anticipación desde tu panel de usuario.';
      case 'humano':
        return '👤 He notificado a la administración del club. Déjanos aquí los detalles de tu consulta (y tu correo o número de reserva) para que un administrador te responda a la brevedad.';
      default:
        return null;
    }
  }

  /**
   * Genera una respuesta para texto libre usando Gemini Flash (si hay API Key) o el motor inteligente local.
   */
  async generateFreeTextReply(userMessage: string): Promise<{
    reply: string;
    source: 'bot' | 'ai';
  }> {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();

    if (geminiKey) {
      const aiReply = await this.callGeminiFlash(userMessage, geminiKey);
      if (aiReply) {
        return { reply: aiReply, source: 'ai' };
      }
    }

    return {
      reply: this.resolveByLocalKnowledgeBase(userMessage),
      source: 'bot',
    };
  }

  /**
   * Consulta el endpoint REST gratuito de Google Gemini 2.0 Flash usando fetch nativo sin paquetes externos.
   */
  private async callGeminiFlash(
    userMessage: string,
    apiKey: string,
  ): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userMessage }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 220,
            temperature: 0.4,
          },
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return text || null;
    } catch (error) {
      this.logger.debug(
        `Fallback a motor local activado: ${(error as Error).message}`,
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Motor local de intenciones para responder consultas en lenguaje natural con costo $0 y sin latencia externa.
   */
  private resolveByLocalKnowledgeBase(rawText: string): string {
    const text = rawText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (/(hola|buenas|buenos dias|buenas tardes|buenas noches|saludos)/.test(text)) {
      return '👋 ¡Hola! Bienvenido a Kinetic Sports Club. Puedes tocar una de las opciones rápidas de arriba o preguntarme directamente por horarios, precios, lluvia, arriendo de palas o reservas.';
    }

    if (/(horario|hora|abren|cierran|abierto|atencion|cuando)/.test(text)) {
      return '🕒 Nuestro horario de funcionamiento es de Lunes a Domingo, de 08:00 a 23:00 hrs en horario continuado.';
    }

    if (/(lluvia|llueve|clima|techad|agua|suspende|mal tiempo)/.test(text)) {
      return '🌧️ Contamos con canchas techadas que operan normalmente con lluvia. Si reservaste una cancha descubierta y llueve, podemos reprogramar tu turno sin costo.';
    }

    if (/(pala|raqueta|pelota|balon|arriend|equipamiento|implemento)/.test(text)) {
      return '🎾 ¡Sí! En recepción arrendamos palas de pádel, raquetas de tenis y balones por valores entre $2.500 y $4.000 CLP por turno.';
    }

    if (/(estacionamiento|auto|parking|camarin|ducha|bano)/.test(text)) {
      return '🚗 Contamos con estacionamiento privado gratuito para clientes, además de camarines equipados con lockers y duchas con agua caliente.';
    }

    if (/(precio|valor|cuanto cuesta|tarifa|costo)/.test(text)) {
      return '💰 Las tarifas varían según el deporte y horario (desde $12.000 a $28.000 CLP por bloque). En la sección "Servicios" puedes ver el valor exacto de cada cancha antes de pagar.';
    }

    if (/(pago|webpay|tarjeta|debito|credito|transferencia|boleta)/.test(text)) {
      return '💳 El pago se realiza online de forma segura mediante Webpay Plus (tarjetas de débito y crédito) y tu reserva queda confirmada al instante.';
    }

    if (/(cancelar|anular|reprogramar|cambiar|devolucion|reembolso)/.test(text)) {
      return '🔄 Puedes cancelar o reprogramar tu reserva hasta con 24 horas de anticipación desde tu Panel de Usuario. Si necesitas ayuda con una reserva puntual, indícanos el código aquí.';
    }

    if (/(padel|tenis|futbol|futbolito|basquet|natacion|piscina|cancha|deporte)/.test(text)) {
      return '🏆 Disponemos de canchas de Pádel, Tenis, Fútbol/Futbolito, Básquetbol y Piscina. Puedes elegir el deporte, día y bloque horario directamente en el botón "Reservar".';
    }

    if (/(humano|persona|admin|administrador|recepcion|telefono|llamar|ayuda|problema)/.test(text)) {
      return '👤 Tu mensaje fue derivado al equipo de administración de Kinetic Sports Club. Déjanos tu correo o detalle de la reserva y te contactaremos a la brevedad.';
    }

    return '🤖 Gracias por escribirnos. He registrado tu consulta para el equipo de recepción de Kinetic Sports Club. Mientras tanto, también puedes consultar nuestras opciones rápidas de Horarios, Lluvia, Implementos o Pagos.';
  }
}
