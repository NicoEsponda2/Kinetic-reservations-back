/**
 * Utilidades para trabajar con la fecha y hora comercial de Kinetic.
 *
 * Las reservas se almacenan como fecha (`DATE`) y hora (`TIME`) sin zona
 * horaria. Por ese motivo, todas las comparaciones de disponibilidad se hacen
 * contra el reloj de `America/Santiago`, independientemente de la zona horaria
 * configurada en el servidor o contenedor.
 */

/** Zona horaria IANA utilizada como referencia para las reservas. */
export const BUSINESS_TIME_ZONE = 'America/Santiago';

/** Formateador reutilizable para obtener componentes de fecha y hora en Chile. */
const businessDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/**
 * Extrae un componente específico desde el resultado de `formatToParts`.
 *
 * @param parts Componentes producidos por `Intl.DateTimeFormat`.
 * @param type Tipo de componente que se desea obtener.
 * @returns Valor textual del componente o una cadena vacía si no está presente.
 */
const getPart = (
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) => parts.find((part) => part.type === type)?.value ?? '';

/**
 * Normaliza una fecha de calendario a `YYYY-MM-DD`.
 *
 * Si recibe una fecha ISO con hora, conserva la parte anterior a `T`. No aplica
 * conversión de zona horaria porque la fecha representa un día comercial.
 *
 * @param date Fecha `YYYY-MM-DD` o cadena ISO que comienza con ese formato.
 * @returns Fecha comercial sin componente de hora.
 */
const normalizeDate = (date: string) => date.trim().split('T')[0];

/**
 * Normaliza una hora de pared al formato comparable `HH:mm:ss`.
 *
 * @param time Hora en formato `HH:mm` o `HH:mm:ss`.
 * @returns Hora con dos dígitos por componente y segundos incluidos.
 */
const normalizeTime = (time: string) => {
  const [hour, minute, second = '00'] = time.trim().split(':');
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
};

/**
 * Obtiene la fecha y hora correspondientes a un instante en la zona comercial.
 *
 * @param now Instante de referencia. Por defecto utiliza la fecha y hora actual.
 * @returns Fecha `YYYY-MM-DD` y hora `HH:mm:ss` en `America/Santiago`.
 */
export function getBusinessDateTime(now: Date = new Date()): {
  date: string;
  time: string;
} {
  const parts = businessDateTimeFormatter.formatToParts(now);
  const year = getPart(parts, 'year');
  const month = getPart(parts, 'month');
  const day = getPart(parts, 'day');
  const hour = getPart(parts, 'hour');
  const minute = getPart(parts, 'minute');
  const second = getPart(parts, 'second');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}:${second}`,
  };
}

/**
 * Indica si el inicio de un bloque ya pasó según el reloj comercial de Chile.
 *
 * La comparación es estricta: un bloque exactamente igual al instante de
 * referencia todavía no se considera pasado. En cambio, cualquier segundo
 * posterior al inicio hace que el bloque sea rechazado. Las fechas anteriores
 * siempre se consideran pasadas y las posteriores siempre permanecen vigentes.
 *
 * @param date Fecha del bloque en `YYYY-MM-DD` o como cadena ISO.
 * @param time Hora de inicio del bloque en `HH:mm` o `HH:mm:ss`.
 * @param now Instante contra el cual se compara. Por defecto utiliza el actual.
 * @returns `true` si el bloque comenzó antes del instante de referencia.
 */
export function isBusinessDateTimePast(
  date: string,
  time: string,
  now: Date = new Date(),
): boolean {
  const current = getBusinessDateTime(now);
  const candidateDate = normalizeDate(date);

  if (candidateDate !== current.date) {
    return candidateDate < current.date;
  }

  return normalizeTime(time) < current.time;
}
