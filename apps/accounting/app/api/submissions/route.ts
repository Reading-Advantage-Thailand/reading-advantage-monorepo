/**
 * Accounting submissions API route.
 *
 * Thin HTTP boundary only: the session guard authorizes, the evidence bytes
 * reach storage exclusively through the `putPrivateEvidence` port, and all
 * validation, visibility, and persistence decisions live in the domain via
 * `@/app/lib/submissions`. The company scope always comes from the session's
 * organization identity — never from the request.
 */
import { requireAccountingSession } from "@/app/lib/auth";
import { actorFromUser, jsonResponse } from "@/app/lib/route-helpers";
import {
  deletePrivateEvidence,
  readPrivateEvidence,
  putPrivateEvidence,
} from "@/app/lib/private-evidence-storage";
import {
  listAccountingSubmissions,
  submitAccountingSubmissionWithOutcome,
} from "@/app/lib/submissions";
import { AccountingSubmissionError } from "@reading-advantage/backend/accounting";
import type {
  AccountingSubmissionInput,
} from "@reading-advantage/backend/accounting";
import {
  accountingSubmissionEvidenceReferenceSchema,
  accountingSubmissionIdempotencyKeySchema,
} from "@reading-advantage/backend/accounting";

type AccountingErrorSnapshot =
  | {
      readonly reason: "invalid-input";
      readonly message: string;
      readonly fieldErrors: Record<string, string[]>;
    }
  | {
      readonly reason: "conflict" | "forbidden";
      readonly message: string;
    }
  | { readonly reason: "unknown" };

/** Safely snapshots owned accounting error fields for route decisions. */
function snapshotAccountingError(error: unknown): AccountingErrorSnapshot {
  try {
    if (!(error instanceof AccountingSubmissionError)) {
      return { reason: "unknown" };
    }

    const name = error.name;
    const reason = (error as { readonly reason?: unknown }).reason;
    const message = error.message;
    if (
      name !== "AccountingSubmissionError" ||
      (reason !== "invalid-input" &&
        reason !== "conflict" &&
        reason !== "forbidden") ||
      typeof message !== "string"
    ) {
      return { reason: "unknown" };
    }

    if (reason === "invalid-input") {
      const rawFieldErrors = (error as { readonly fieldErrors?: unknown })
        .fieldErrors;
      if (
        typeof rawFieldErrors !== "object" ||
        rawFieldErrors === null ||
        Array.isArray(rawFieldErrors)
      ) {
        return { reason: "unknown" };
      }
      const fieldErrorEntries: Array<[string, string[]]> = [];
      for (const [field, messages] of Object.entries(rawFieldErrors)) {
        if (!Array.isArray(messages)) {
          return { reason: "unknown" };
        }
        const messageCount = messages.length;
        if (!Number.isSafeInteger(messageCount) || messageCount < 0) {
          return { reason: "unknown" };
        }
        const copiedMessages: string[] = [];
        for (let index = 0; index < messageCount; index += 1) {
          const messageValue = messages[index];
          if (typeof messageValue !== "string") {
            return { reason: "unknown" };
          }
          copiedMessages.push(messageValue);
        }
        fieldErrorEntries.push([field, copiedMessages]);
      }
      return {
        reason,
        message,
        fieldErrors: Object.fromEntries(fieldErrorEntries),
      };
    }

    return { reason, message };
  } catch {
    return { reason: "unknown" };
  }
}

/** Compares two evidence byte arrays without creating a derived artifact. */
function haveSameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

type ReconciliationEvent = "cleanup_failed" | "outcome_unresolved";

/** Returns a safe error name without exposing error details. */
function safeErrorName(): "Error" {
  return "Error";
}

/** Returns the opaque upload identifier from a generated evidence reference. */
function evidenceUploadId(evidenceReference: string): string {
  const parsed =
    accountingSubmissionEvidenceReferenceSchema.safeParse(evidenceReference);
  if (!parsed.success) return "unknown";
  return (
    parsed.data.slice("private-evidence://".length).split("/")[2] ?? "unknown"
  );
}

/** Emits one structured reconciliation record without exposing request data. */
function logReconciliation(input: {
  readonly event: ReconciliationEvent;
  readonly companyId: string;
  readonly evidenceReference: string;
  readonly error: unknown;
  readonly secondaryError?: unknown;
}): void {
  try {
    const record = {
      level: "error",
      event: `accounting_submission_${input.event === "cleanup_failed" ? "cleanup_failed" : "outcome_unresolved"}`,
      operation: "submit_accounting_submission",
      companyId: input.companyId,
      requestId: evidenceUploadId(input.evidenceReference),
      errorName: safeErrorName(),
      ...(input.secondaryError === undefined
        ? {}
        : { secondaryErrorName: safeErrorName() }),
    };
    console.error(JSON.stringify(record));
  } catch {
    // Logging must not replace the primary route result.
  }
}

/** Deletes unused evidence without masking the primary route result. */
async function cleanupUploadedEvidence(input: {
  readonly companyId: string;
  readonly evidenceReference: string;
}): Promise<void> {
  try {
    await deletePrivateEvidence({
      companyId: input.companyId,
      evidenceReference: input.evidenceReference,
    });
  } catch (error) {
    logReconciliation({ event: "cleanup_failed", ...input, error });
  }
}

/** Returns a 409 response for a key that conflicts with stored content. */
function idempotencyConflictResponse(): Response {
  return jsonResponse(
    { message: "The idempotency key is already used for different content" },
    409,
  );
}

/**
 * Reads one scalar form field as a string.
 * @param form Parsed multipart form.
 * @param name Exact field name.
 * @returns The field value, or undefined when absent or a file part.
 */
function textField(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === "string" ? value : undefined;
}

/** Checks whether an uploaded evidence file declares a supported MIME type. */
function isSupportedEvidenceType(contentType: string): boolean {
  const normalizedContentType = contentType.toLowerCase();
  return (
    normalizedContentType === "application/pdf" ||
    normalizedContentType.startsWith("image/")
  );
}

/**
 * Handles POST /api/submissions: multipart submission intake with exactly one
 * required evidence file. Evidence is stored through the private-evidence
 * port and the domain receives only the storage-issued reference; any
 * caller-supplied `evidenceReference` form field is ignored.
 * @param request Multipart form request with an optional idempotency key header.
 * @returns 201 for a new submission, 200 for a replay, the guard's 401/403, or 400 with
 *   `{ message, fieldErrors }` for missing evidence or invalid input.
 */
export async function POST(request: Request): Promise<Response> {
  const guard = await requireAccountingSession(request);
  if (!guard.ok) return guard.response;
  const actor = actorFromUser(guard.session.user);

  const rawIdempotencyKey = request.headers.get("idempotency-key");
  let idempotencyKey: string | undefined;
  if (rawIdempotencyKey !== null) {
    const parsedIdempotencyKey =
      accountingSubmissionIdempotencyKeySchema.safeParse(rawIdempotencyKey);
    if (!parsedIdempotencyKey.success) {
      return jsonResponse(
        {
          message: "The idempotency key is invalid",
          fieldErrors: {
            idempotencyKey: [
              "Send a nonblank idempotency key with at most 256 characters",
            ],
          },
        },
        400,
      );
    }
    idempotencyKey = parsedIdempotencyKey.data;
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse(
      {
        message: "A multipart/form-data body is required",
        fieldErrors: { body: ["Send multipart/form-data"] },
      },
      400,
    );
  }

  const evidenceFiles = form.getAll("evidence");
  const evidence = evidenceFiles.length === 1 ? evidenceFiles[0] : undefined;
  if (
    !(evidence instanceof File) ||
    evidence.size === 0 ||
    !isSupportedEvidenceType(evidence.type)
  ) {
    return jsonResponse(
      {
        message: "An evidence file is required",
        fieldErrors: { evidence: ["Attach exactly one evidence file"] },
      },
      400,
    );
  }

  const evidenceBody = new Uint8Array(await evidence.arrayBuffer());
  const { evidenceReference } = await putPrivateEvidence({
    companyId: actor.companyId,
    contentType: evidence.type || "application/octet-stream",
    body: evidenceBody,
  });

  const description = textField(form, "description");
  const settledThbAmount = textField(form, "settledThbAmount");
  // Missing or malformed scalars stay raw here; the domain schema is the
  // validation authority and rejects them as `invalid-input` field errors.
  const input = {
    kind: textField(form, "kind") ?? "",
    payee: textField(form, "payee") ?? "",
    category: textField(form, "category") ?? "",
    ...(description === undefined ? {} : { description }),
    money: {
      amountMinor: textField(form, "amountMinor") ?? "",
      currency: textField(form, "currency") ?? "",
    },
    evidenceReference,
    ...(settledThbAmount === undefined ? {} : { settledThbAmount }),
  } as AccountingSubmissionInput;

  const submit = () =>
    submitAccountingSubmissionWithOutcome({
      actor,
      input,
      idempotencyKey,
      compareEvidence: async ({
        candidateEvidenceReference,
        storedEvidenceReference,
      }) => {
        if (candidateEvidenceReference !== evidenceReference) return false;
        const originalEvidence = await readPrivateEvidence({
          companyId: actor.companyId,
          evidenceReference: storedEvidenceReference,
        });
        return haveSameBytes(evidenceBody, originalEvidence);
      },
    });

  let submissionResult: Awaited<
    ReturnType<typeof submitAccountingSubmissionWithOutcome>
  >;
  try {
    submissionResult = await submit();
  } catch (error) {
    const errorSnapshot = snapshotAccountingError(error);
    if (errorSnapshot.reason === "invalid-input") {
      await cleanupUploadedEvidence({
        companyId: actor.companyId,
        evidenceReference,
      });
      return jsonResponse(
        {
          message: errorSnapshot.message,
          fieldErrors: errorSnapshot.fieldErrors,
        },
        400,
      );
    }
    if (errorSnapshot.reason === "conflict") {
      await cleanupUploadedEvidence({
        companyId: actor.companyId,
        evidenceReference,
      });
      return idempotencyConflictResponse();
    }
    if (errorSnapshot.reason === "forbidden") {
      await cleanupUploadedEvidence({
        companyId: actor.companyId,
        evidenceReference,
      });
      throw error;
    }
    if (idempotencyKey === undefined) {
      logReconciliation({
        event: "outcome_unresolved",
        companyId: actor.companyId,
        evidenceReference,
        error,
      });
      throw error;
    }

    try {
      submissionResult = await submit();
    } catch (resolutionError) {
      const resolutionSnapshot = snapshotAccountingError(resolutionError);
      if (resolutionSnapshot.reason === "conflict") {
        await cleanupUploadedEvidence({
          companyId: actor.companyId,
          evidenceReference,
        });
        return idempotencyConflictResponse();
      }
      logReconciliation({
        event: "outcome_unresolved",
        companyId: actor.companyId,
        evidenceReference,
        error,
        secondaryError: resolutionError,
      });
      throw error;
    }
  }

  if (submissionResult.submission.evidenceReference !== evidenceReference) {
    await cleanupUploadedEvidence({
      companyId: actor.companyId,
      evidenceReference,
    });
  }
  return jsonResponse(
    submissionResult.submission,
    submissionResult.outcome === "created" ? 201 : 200,
  );
}

/**
 * Handles GET /api/submissions: returns the submissions visible to the
 * session actor. The STAFF/OWNER/ACCOUNTANT visibility rule is enforced by
 * the domain; the route only forwards the actor.
 * @param request Route request carrying the session cookie.
 * @returns 200 with `{ submissions: [...] }` or the guard's 401/403.
 */
export async function GET(request: Request): Promise<Response> {
  const guard = await requireAccountingSession(request);
  if (!guard.ok) return guard.response;
  const actor = actorFromUser(guard.session.user);
  const submissions = await listAccountingSubmissions({ actor });
  return jsonResponse({ submissions }, 200);
}
