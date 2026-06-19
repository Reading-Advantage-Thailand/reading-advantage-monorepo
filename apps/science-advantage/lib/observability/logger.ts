import { getRequestContext } from './context';

type LogPayload = Record<string, unknown>;

type LogLevel = 'info' | 'warn' | 'error';

function safeStringify(entry: Record<string, unknown>): string {
  try {
    return JSON.stringify(entry, (_key, value) => {
      if (typeof value === 'bigint') return `[BigInt:${value.toString()}]`;
      if (typeof value === 'function') return '[Function]';
      if (typeof value === 'symbol') return value.toString();
      return value;
    });
  } catch {
    return JSON.stringify({
      event: entry.event,
      level: entry.level,
      timestamp: entry.timestamp,
      requestId: entry.requestId,
      userId: entry.userId,
      route: entry.route,
      method: entry.method,
      latencyMs: entry.latencyMs,
      serializationError: 'payload contained unserializable structure (e.g. circular reference)',
    });
  }
}

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

  const line = safeStringify(entry);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.info(line);
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
