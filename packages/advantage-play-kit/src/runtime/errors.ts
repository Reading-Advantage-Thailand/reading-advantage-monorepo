/** Stable error codes emitted by the APK runtime boundary. */
export type APKRuntimeErrorCode =
  | "INVALID_GAME_INPUT"
  | "INVALID_GAME_RESULTS"
  | "INVALID_EDITION"
  | "INCOMPATIBLE_RUNTIME"
  | "MISSING_ASSET_SLOT"
  | "MISSING_EDITION"
  | "MOUNT_FAILED"
  | "RUNTIME_DESTROYED";

/** Structured error raised by runtime, edition, and asset boundaries. */
export class APKRuntimeError extends Error {
  /** Machine-readable error category. */
  readonly code: APKRuntimeErrorCode;

  /** Optional structured context safe for diagnostics. */
  readonly details?: Readonly<Record<string, unknown>>;

  /**
   * Creates a structured APK runtime error.
   * @param code Machine-readable error category.
   * @param message Human-readable failure description.
   * @param details Optional structured context.
   */
  constructor(
    code: APKRuntimeErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "APKRuntimeError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Converts an unknown error into an APK runtime error.
 * @param error Unknown thrown value.
 * @param fallbackCode Code to use when the value is not already structured.
 * @param fallbackMessage Message to use when the value is not an Error.
 * @returns A structured APK runtime error.
 */
export function toAPKRuntimeError(
  error: unknown,
  fallbackCode: APKRuntimeErrorCode,
  fallbackMessage: string,
): APKRuntimeError {
  if (error instanceof APKRuntimeError) return error;
  const message = error instanceof Error ? error.message : fallbackMessage;
  return new APKRuntimeError(fallbackCode, message, { cause: error });
}
