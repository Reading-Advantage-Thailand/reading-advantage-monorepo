/** Primitive fields that can add safe context to a structured error. */
export type StructuredErrorFields = Readonly<
  Record<string, string | number | boolean | null>
>;

/** Input for one structured error event. */
export interface StructuredErrorInput {
  /** Stable event name. */
  event: string;
  /** Optional request correlation identifier. */
  requestId?: string | null;
  /** Thrown value used only to derive an error name. */
  error?: unknown;
  /** Additional safe fields for the event. */
  fields?: StructuredErrorFields;
}

/** Receives one serialized structured error. */
export type StructuredErrorWriter = (message: string) => void;

/** Writes one redacted JSON error through the shared logging boundary.
 * @param input Event identity and safe diagnostic context.
 * @param write Output adapter for the serialized event.
 * @returns Nothing.
 */
export function logStructuredError(
  input: StructuredErrorInput,
  write: StructuredErrorWriter = console.error,
): void {
  const record: Record<string, string | number | boolean | null> = {
    ...input.fields,
    level: "error",
    event: input.event,
  };
  if (input.requestId !== undefined) record.requestId = input.requestId;
  if ("error" in input) {
    record.errorName = input.error instanceof Error
      ? input.error.name
      : "UnknownError";
  }
  write(JSON.stringify(record));
}
