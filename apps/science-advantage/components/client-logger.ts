type LogPayload = Record<string, unknown>;

export function info(event: string, payload?: LogPayload): void {
  if (process.env.NODE_ENV === 'production') return;
  console['info'](event, payload);
}

export function warn(event: string, payload?: LogPayload): void {
  if (process.env.NODE_ENV === 'production') return;
  console['warn'](event, payload);
}

export function error(event: string, payload?: LogPayload): void {
  if (process.env.NODE_ENV === 'production') return;
  console['error'](event, payload);
}

export function debug(event: string, payload?: LogPayload): void {
  if (process.env.NODE_ENV === 'production') return;
  console['debug'](event, payload);
}
