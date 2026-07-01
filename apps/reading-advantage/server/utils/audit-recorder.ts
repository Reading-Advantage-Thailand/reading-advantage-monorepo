/**
 * Audit Event Recorder (Lazy-Loaded Wrapper)
 *
 * Why this exists:
 * - The reading-advantage test suite uses a top-level `const` mock for
 *   `recordAuditEvent` in `audit-events.test.ts`. The mock factory captures
 *   that const by name, and Jest's module-mock setup has known interactions
 *   with TDZ-resolved bindings when the module under test imports
 *   `@reading-advantage/auth` eagerly at the top.
 * - To keep the existing test (and the original `recordAuditEvent` contract)
 *   intact, we resolve `recordAuditEvent` lazily on first use. The wrapper
 *   holds a single Promise so the cost is paid once per process.
 *
 * The wrapper:
 *   - Exposes an `invoke()` that mirrors `recordAuditEvent(ctx, payload)`.
 *   - Caches the resolved function after first call.
 *   - Falls back gracefully if the auth package cannot be loaded.
 */

type AuditContext = {
  actorUserId: string | null;
  actorRole: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

type AuditPayload = {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

type RecordAuditEventFn = (
  ctx: AuditContext,
  payload: AuditPayload
) => Promise<void>;

let cachedFn: RecordAuditEventFn | null = null;
let cachedPromise: Promise<RecordAuditEventFn | null> | null = null;

async function loadRecordAuditEvent(): Promise<RecordAuditEventFn | null> {
  if (cachedFn) return cachedFn;
  if (cachedPromise) return cachedPromise;
  cachedPromise = (async () => {
    try {
      const mod: any = await import("@reading-advantage/auth");
      const fn: RecordAuditEventFn | undefined = mod?.recordAuditEvent;
      if (typeof fn !== "function") {
        return null;
      }
      cachedFn = fn;
      return fn;
    } catch (error) {
      console.error("Failed to load @reading-advantage/auth:", error);
      return null;
    }
  })();
  return cachedPromise;
}

/**
 * Records an audit event, swallowing errors so the caller's main flow is
 * unaffected. Errors are logged but never bubble up — audit failures must
 * not block legitimate destructive ops.
 */
export async function recordAuditEventSafe(
  ctx: AuditContext,
  payload: AuditPayload
): Promise<void> {
  const fn = await loadRecordAuditEvent();
  if (!fn) {
    console.warn("recordAuditEvent unavailable — skipping audit emission");
    return;
  }
  try {
    await fn(ctx, payload);
  } catch (error) {
    console.error(
      `recordAuditEvent failed for action=${payload?.action ?? "?"}:`,
      error
    );
  }
}
