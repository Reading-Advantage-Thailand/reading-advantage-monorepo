/**
 * Structured logger of Primary Advantage, on the pattern of `apps/science-advantage/lib/observability/logger.ts`:
 * one JSON line per event with the event name, the level, and a timestamp. Cloud Run reads the
 * level from stderr (error) and stdout (info, warn).
 */

/** The fields of one log line besides the event, the level, and the timestamp. */
export type LogPayload = Record<string, unknown>;

type LogLevel = "info" | "warn" | "error";

/**
 * Serializes a log entry. An Error becomes its name, message, and stack (JSON gives `{}` for it);
 * an entry that cannot be serialized keeps only its event, level, and timestamp.
 * @param entry The log entry.
 * @returns One JSON line.
 */
function safeStringify(entry: Record<string, unknown>): string {
  try {
    return JSON.stringify(entry, (_key, value: unknown) => {
      if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
      if (typeof value === "bigint") return `[BigInt:${value.toString()}]`;
      if (typeof value === "function") return "[Function]";
      if (typeof value === "symbol") return value.toString();
      return value;
    });
  } catch {
    return JSON.stringify({
      event: entry.event,
      level: entry.level,
      timestamp: entry.timestamp,
      serializationError: "payload contained unserializable structure (e.g. circular reference)",
    });
  }
}

/**
 * Writes one structured log line.
 * @param level The severity.
 * @param event A stable snake_case event name.
 * @param payload Extra fields; an `error` field may hold an Error.
 */
function emit(level: LogLevel, event: string, payload: LogPayload = {}): void {
  const line = safeStringify({ event, level, timestamp: new Date().toISOString(), ...payload });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/** The Primary structured logger: `logger.error("event_name", { error })`. */
export const logger = {
  /**
   * Logs an info event.
   * @param event A stable snake_case event name.
   * @param payload Extra fields.
   */
  info(event: string, payload?: LogPayload): void {
    emit("info", event, payload);
  },
  /**
   * Logs a warning event.
   * @param event A stable snake_case event name.
   * @param payload Extra fields.
   */
  warn(event: string, payload?: LogPayload): void {
    emit("warn", event, payload);
  },
  /**
   * Logs an error event.
   * @param event A stable snake_case event name.
   * @param payload Extra fields; an `error` field may hold an Error.
   */
  error(event: string, payload?: LogPayload): void {
    emit("error", event, payload);
  },
};
