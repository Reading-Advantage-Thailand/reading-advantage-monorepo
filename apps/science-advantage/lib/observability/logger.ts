import { getRequestContext } from './context';

type LogPayload = Record<string, unknown>;

type LogLevel = 'info' | 'warn' | 'error';

function emit(level: LogLevel, event: string, payload: LogPayload = {}) {
  const ctx = getRequestContext();

  const entry: Record<string, unknown> = {
    event,
    level,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  if (ctx) {
    entry.requestId = ctx.requestId;
    if (ctx.userId !== undefined) {
      entry.userId = ctx.userId;
    }
    entry.route = ctx.route;
    entry.method = ctx.method;
    entry.latencyMs = Date.now() - ctx.startedAt;
  }

  if (level === 'error') {
    console.error(JSON.stringify(entry));
    return;
  }

  if (level === 'warn') {
    console.warn(JSON.stringify(entry));
    return;
  }

  console.info(JSON.stringify(entry));
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
