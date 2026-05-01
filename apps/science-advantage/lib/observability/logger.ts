type LogPayload = Record<string, unknown>;

type LogLevel = 'info' | 'warn' | 'error';

function emit(level: LogLevel, event: string, payload: LogPayload = {}) {
  const entry = {
    event,
    level,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  if (level === 'error') {
    console.error('[observability]', entry);
    return;
  }

  if (level === 'warn') {
    console.warn('[observability]', entry);
    return;
  }

  console.info('[observability]', entry);
}

export const logger = {
  info(event: string, payload?: LogPayload) {
    emit('info', event, payload);
  },
  warn(event: string, payload?: LogPayload) {
    emit('warn', event, payload);
  },
  error(event: string, payload?: LogPayload) {
    emit('error', event, payload);
  },
};

export type { LogPayload };
