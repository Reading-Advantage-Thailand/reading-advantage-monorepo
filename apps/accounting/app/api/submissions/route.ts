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
import type { accountingSessionUser } from "@/app/lib/company-oidc";
import {
  deletePrivateEvidence,
  readPrivateEvidence,
  putPrivateEvidence,
} from "@/app/lib/private-evidence-storage";
import {
  listAccountingSubmissions,
  submitAccountingSubmission,
} from "@/app/lib/submissions";
import type {
  AccountingActor,
  AccountingSubmissionInput,
} from "@reading-advantage/backend/accounting";
import { z } from "zod";

/** Session user projection produced by the accounting guard. */
type AccountingSessionUser = NonNullable<
  ReturnType<typeof accountingSessionUser>
>;

/**
 * Maps the guard's session user to a domain actor; the company scope derives
 * from the session's organization identity, never from request input.
 * @param user Verified accounting session user.
 * @returns Domain actor carrying account, company, and role.
 */
function actorFromUser(user: AccountingSessionUser): AccountingActor {
  return {
    accountId: user.id,
    companyId: user.organizationId,
    role: user.role,
  };
}

/**
 * Serializes a JSON response body.
 * @param body Response payload.
 * @param status HTTP status code.
 * @returns JSON response with a no-store-friendly content type.
 */
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Narrows an unknown thrown value to the route-ready domain `invalid-input`
 * rejection produced by `@/app/lib/submissions`.
 * @param error Unknown thrown value.
 * @returns True when the error carries a `fieldErrors` map to return as 400.
 */
function isInvalidInputError(
  error: unknown,
): error is Error & { readonly fieldErrors: Record<string, string[]> } {
  return (
    error instanceof Error &&
    error.name === "AccountingSubmissionError" &&
    (error as { readonly reason?: unknown }).reason === "invalid-input" &&
    typeof (error as { readonly fieldErrors?: unknown }).fieldErrors ===
      "object"
  );
}

/** Checks whether a thrown value carries one known accounting rejection reason. */
function hasAccountingReason(
  error: unknown,
  reason: "conflict" | "forbidden",
): boolean {
  return (
    error instanceof Error &&
    error.name === "AccountingSubmissionError" &&
    (error as { readonly reason?: unknown }).reason === reason
  );
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
function safeErrorName(error: unknown): string {
  return error instanceof Error && error.name ? error.name : "UnknownError";
}

/** Emits one structured reconciliation record without exposing request data. */
function logReconciliation(input: {
  readonly event: ReconciliationEvent;
  readonly companyId: string;
  readonly idempotencyKey: string;
  readonly evidenceReference: string;
  readonly error: unknown;
  readonly secondaryError?: unknown;
}): void {
  const record = {
    level: "error",
    event: `accounting_submission_${input.event === "cleanup_failed" ? "cleanup_failed" : "outcome_unresolved"}`,
    operation: "submit_accounting_submission",
    companyId: input.companyId,
    idempotencyKey: input.idempotencyKey,
    evidenceReference: input.evidenceReference,
    errorName: safeErrorName(input.error),
    ...(input.secondaryError === undefined
      ? {}
      : { secondaryErrorName: safeErrorName(input.secondaryError) }),
  };
  try {
    console.error(JSON.stringify(record));
  } catch {
    // Logging must not replace the primary route result.
  }
}

/** Deletes unused evidence without masking the primary route result. */
async function cleanupUploadedEvidence(input: {
  readonly companyId: string;
  readonly idempotencyKey: string;
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

const idempotencyKeySchema = z.string().uuid();

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
 * @param request Multipart form request with a valid UUID Idempotency-Key header.
 * @returns 201 with the stored submission, the guard's 401/403, or 400 with
 *   `{ message, fieldErrors }` for missing evidence or invalid input.
 */
export async function POST(request: Request): Promise<Response> {
  const guard = await requireAccountingSession(request);
  if (!guard.ok) return guard.response;
  const actor = actorFromUser(guard.session.user);

  const parsedIdempotencyKey = idempotencyKeySchema.safeParse(
    request.headers.get("idempotency-key"),
  );
  if (!parsedIdempotencyKey.success) {
    return jsonResponse(
      {
        message: "A valid UUID idempotency key is required",
        fieldErrors: {
          idempotencyKey: [
            "Send a valid UUID in the Idempotency-Key header",
          ],
        },
      },
      400,
    );
  }
  const idempotencyKey = parsedIdempotencyKey.data;

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
    fileName: evidence.name,
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
    submitAccountingSubmission({
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

  let submission: Awaited<ReturnType<typeof submitAccountingSubmission>>;
  try {
    submission = await submit();
  } catch (error) {
    if (isInvalidInputError(error)) {
      await cleanupUploadedEvidence({
        companyId: actor.companyId,
        idempotencyKey,
        evidenceReference,
      });
      return jsonResponse(
        { message: error.message, fieldErrors: error.fieldErrors },
        400,
      );
    }
    if (hasAccountingReason(error, "conflict")) {
      await cleanupUploadedEvidence({
        companyId: actor.companyId,
        idempotencyKey,
        evidenceReference,
      });
      return idempotencyConflictResponse();
    }
    if (hasAccountingReason(error, "forbidden")) {
      await cleanupUploadedEvidence({
        companyId: actor.companyId,
        idempotencyKey,
        evidenceReference,
      });
      throw error;
    }

    try {
      submission = await submit();
    } catch (resolutionError) {
      if (hasAccountingReason(resolutionError, "conflict")) {
        await cleanupUploadedEvidence({
          companyId: actor.companyId,
          idempotencyKey,
          evidenceReference,
        });
        return idempotencyConflictResponse();
      }
      logReconciliation({
        event: "outcome_unresolved",
        companyId: actor.companyId,
        idempotencyKey,
        evidenceReference,
        error,
        secondaryError: resolutionError,
      });
      throw error;
    }
  }

  if (submission.evidenceReference !== evidenceReference) {
    await cleanupUploadedEvidence({
      companyId: actor.companyId,
      idempotencyKey,
      evidenceReference,
    });
  }
  return jsonResponse(submission, 201);
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
