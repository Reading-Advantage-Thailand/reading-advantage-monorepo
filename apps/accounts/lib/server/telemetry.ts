import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import type {
  CapabilityExecutor,
  CapabilityInvocation,
  CapabilityLogger,
  CapabilitySpan,
  ValidatedProjectedData,
} from "@reading-advantage/backend";

const SAFE_ATTRIBUTE_KEYS = new Set(["applicationKey", "resourceType"]);

/** Severity names understood by Google Cloud structured logging. */
export type AccountsTelemetrySeverity = "DEBUG" | "INFO" | "WARNING";

/** One secret-safe structured Accounts capability event. */
export interface AccountsTelemetryRecord {
  /** Schema version for downstream log consumers. */
  readonly schemaVersion: 1;
  /** Cloud Logging-compatible severity. */
  readonly severity: AccountsTelemetrySeverity;
  /** Stable service identifier. */
  readonly service: "accounts";
  /** Stable event identifier. */
  readonly event: string;
  /** Capability being observed, when execution-scoped. */
  readonly capabilityId?: string;
  /** Correlation identifier shared with the backend executor. */
  readonly correlationId?: string;
  /** Terminal execution outcome. */
  readonly outcome?: "success" | "failure";
  /** Monotonic execution time in milliseconds. */
  readonly durationMs?: number;
  /** Boundary-safe stable failure code. */
  readonly errorCode?: string;
  /** Reviewed attributes after defensive sensitive-key filtering. */
  readonly attributes?: Readonly<Record<string, unknown>>;
}

/** Injectable Accounts telemetry dependencies used by production and tests. */
export interface AccountsCapabilityTelemetryOptions {
  /** Creates the correlation identifier used for one observed execution. */
  readonly createId?: () => string;
  /** Reads a monotonic millisecond clock. */
  readonly now?: () => number;
  /** Writes one already-sanitized structured record. */
  readonly write?: (record: Readonly<AccountsTelemetryRecord>) => void;
}

/** Accounts implementation of the backend capability observability ports. */
export interface AccountsCapabilityTelemetry {
  /** Structured capability logger. */
  readonly logger: CapabilityLogger;
  /** Execution-scoped span attribute collector. */
  readonly span: CapabilitySpan;
  /** Returns the execution correlation identifier used by the kernel. */
  readonly createCorrelationId: () => string;
  /** Observes one capability operation with terminal timing and outcome metadata. */
  readonly observe: <T>(
    capabilityId: string,
    operation: () => Promise<T>,
  ) => Promise<T>;
  /** Wraps a capability executor so every invocation receives Accounts telemetry. */
  readonly instrument: (executor: CapabilityExecutor) => CapabilityExecutor;
}

interface ExecutionTelemetryContext {
  readonly capabilityId: string;
  readonly correlationId: string;
  readonly startedAt: number;
  spanAttributes: Readonly<Record<string, unknown>>;
}

function sanitizeValue(
  value: unknown,
): string | number | boolean | null | undefined {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return value.slice(0, 256);
  return undefined;
}

function sanitizeAttributes(
  attributes: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> {
  if (attributes === undefined) return Object.freeze({});
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attributes).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    if (!SAFE_ATTRIBUTE_KEYS.has(key)) continue;
    const safeValue = sanitizeValue(value);
    if (safeValue !== undefined) sanitized[key] = safeValue;
  }
  return Object.freeze(sanitized);
}

function safeErrorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[A-Z][A-Z0-9_]{1,79}$/.test(error.code)
  ) {
    return error.code;
  }
  return "INTERNAL_ERROR";
}

function defaultWrite(record: Readonly<AccountsTelemetryRecord>): void {
  process.stdout.write(`${JSON.stringify(record)}\n`);
}

/**
 * Creates secret-safe structured capability telemetry for the Accounts runtime.
 * @param options Optional deterministic identifiers, clock, and sink for tests.
 * @returns Logger, span, correlation, observation, and executor instrumentation ports.
 */
export function createAccountsCapabilityTelemetry(
  options: Readonly<AccountsCapabilityTelemetryOptions> = {},
): AccountsCapabilityTelemetry {
  const createId = options.createId ?? randomUUID;
  const now = options.now ?? (() => performance.now());
  const write = options.write ?? defaultWrite;
  const storage = new AsyncLocalStorage<ExecutionTelemetryContext>();

  const emit = (
    severity: AccountsTelemetrySeverity,
    event: string,
    fields: Partial<AccountsTelemetryRecord> = {},
  ): void => {
    const context = storage.getStore();
    const record = Object.freeze({
      schemaVersion: 1,
      severity,
      service: "accounts",
      event,
      ...(context === undefined
        ? {}
        : {
            capabilityId: context.capabilityId,
            correlationId: context.correlationId,
          }),
      ...fields,
    }) satisfies AccountsTelemetryRecord;
    try {
      write(record);
    } catch {
      // Telemetry output must never change capability behavior.
    }
  };

  const log = (
    severity: AccountsTelemetrySeverity,
    event: string,
    attributes?: ValidatedProjectedData,
  ): void => {
    const safeAttributes = sanitizeAttributes(
      attributes as Readonly<Record<string, unknown>> | undefined,
    );
    emit(
      severity,
      event,
      Object.keys(safeAttributes).length === 0
        ? {}
        : { attributes: safeAttributes },
    );
  };

  const logger: CapabilityLogger = Object.freeze({
    debug: (event: string, attributes?: ValidatedProjectedData) =>
      log("DEBUG", event, attributes),
    info: (event: string, attributes?: ValidatedProjectedData) =>
      log("INFO", event, attributes),
    warn: (event: string, attributes?: ValidatedProjectedData) =>
      log("WARNING", event, attributes),
  });
  const span: CapabilitySpan = Object.freeze({
    setAttributes: (attributes: ValidatedProjectedData) => {
      const context = storage.getStore();
      if (context !== undefined) {
        context.spanAttributes = sanitizeAttributes(
          attributes as Readonly<Record<string, unknown>>,
        );
      }
    },
  });
  const createCorrelationId = (): string =>
    storage.getStore()?.correlationId ?? createId();

  const observe = async <T>(
    capabilityId: string,
    operation: () => Promise<T>,
  ): Promise<T> =>
    storage.run(
      {
        capabilityId,
        correlationId: createId(),
        startedAt: now(),
        spanAttributes: Object.freeze({}),
      },
      async () => {
        try {
          const output = await operation();
          const context = storage.getStore();
          const durationMs = Math.max(
            0,
            Math.round((now() - (context?.startedAt ?? 0)) * 100) / 100,
          );
          emit("INFO", "accounts.capability.completed", {
            outcome: "success",
            durationMs,
            ...(context !== undefined &&
            Object.keys(context.spanAttributes).length > 0
              ? { attributes: context.spanAttributes }
              : {}),
          });
          return output;
        } catch (error) {
          const context = storage.getStore();
          const durationMs = Math.max(
            0,
            Math.round((now() - (context?.startedAt ?? 0)) * 100) / 100,
          );
          emit("WARNING", "accounts.capability.failed", {
            outcome: "failure",
            durationMs,
            errorCode: safeErrorCode(error),
            ...(context !== undefined &&
            Object.keys(context.spanAttributes).length > 0
              ? { attributes: context.spanAttributes }
              : {}),
          });
          throw error;
        }
      },
    );

  const instrument = (executor: CapabilityExecutor): CapabilityExecutor =>
    Object.freeze({
      execute: <TOutput = unknown>(
        invocation: Readonly<CapabilityInvocation>,
      ) =>
        observe(invocation.capabilityId, () =>
          executor.execute<TOutput>(invocation),
        ),
    });

  return Object.freeze({
    logger,
    span,
    createCorrelationId,
    observe,
    instrument,
  });
}
