/**
 * Base error class for all AIClient errors. Carries a machine-readable
 * `code` string so callers can branch on error type without parsing
 * message text.
 */
export class AIClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AIClientError";
  }
}

/**
 * Thrown when the requested provider is not configured (missing API key
 * or unsupported provider identifier).
 */
export class ProviderNotConfiguredError extends AIClientError {
  constructor(provider: string, detail?: string) {
    const msg = detail
      ? `AI provider '${provider}' is not configured: ${detail}`
      : `AI provider '${provider}' is not configured`;
    super(msg, "PROVIDER_NOT_CONFIGURED");
    this.name = "ProviderNotConfiguredError";
  }
}

/**
 * Thrown when generated output fails Zod schema validation.
 */
export class SchemaValidationError extends AIClientError {
  constructor(
    public readonly schemaName: string,
    public readonly validationErrors: unknown
  ) {
    super(
      `Generated output failed '${schemaName}' schema validation`,
      "SCHEMA_VALIDATION_ERROR"
    );
    this.name = "SchemaValidationError";
  }
}

/**
 * Thrown when a method is not supported by the configured provider
 * (e.g. `generateObjectFromMedia` on a text-only provider). Callers can
 * branch on the `UNSUPPORTED` code to surface a configuration hint.
 */
export class UnsupportedError extends AIClientError {
  constructor(message: string) {
    super(message, "UNSUPPORTED");
    this.name = "UnsupportedError";
  }
}
