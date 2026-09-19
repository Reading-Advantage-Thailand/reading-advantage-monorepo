"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@reading-advantage/ui";

type Submission = {
  readonly id: string;
  readonly status: "pending" | "approved" | "rejected";
  readonly submittedAt: string;
  readonly kind: "expense" | "bill";
  readonly payee: string;
  readonly category: string;
  readonly money: {
    readonly amountMinor: string;
    readonly currency: string;
  };
  readonly evidenceReference: string;
  readonly settledThbAmount?: string;
};

type FieldErrors = Record<string, readonly string[]>;

type FormMessage = {
  readonly kind: "success" | "error";
  readonly text: string;
};

const controlClassName =
  "flex min-h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const invalidControlClassName = "border-destructive";

/** Checks whether an unknown value is a record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Checks whether an unknown value matches the displayed submission shape. */
function isSubmission(value: unknown): value is Submission {
  if (!isRecord(value) || !isRecord(value.money)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    (value.status === "pending" ||
      value.status === "approved" ||
      value.status === "rejected") &&
    typeof value.submittedAt === "string" &&
    (value.kind === "expense" || value.kind === "bill") &&
    typeof value.payee === "string" &&
    typeof value.category === "string" &&
    typeof value.money.amountMinor === "string" &&
    typeof value.money.currency === "string" &&
    typeof value.evidenceReference === "string" &&
    (value.settledThbAmount === undefined ||
      typeof value.settledThbAmount === "string")
  );
}

/** Reads a JSON response without exposing a parser exception to the UI. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** Returns a safe message from an API error body or a local fallback. */
function messageFromBody(body: unknown, fallback: string): string {
  if (isRecord(body) && typeof body.message === "string" && body.message) {
    return body.message;
  }
  return fallback;
}

/** Converts a validated API field error object into the local field-error map. */
function fieldErrorsFromBody(body: unknown): FieldErrors {
  if (!isRecord(body) || !isRecord(body.fieldErrors)) {
    return {};
  }

  const fieldErrors: FieldErrors = {};
  for (const [field, messages] of Object.entries(body.fieldErrors)) {
    if (
      Array.isArray(messages) &&
      messages.every((message) => typeof message === "string")
    ) {
      fieldErrors[field] = messages;
    }
  }
  return fieldErrors;
}

/** Maps an API response status to a user-facing access or request message. */
function responseErrorMessage(
  status: number,
  body: unknown,
  fallback: string,
): string {
  if (status === 401) {
    return "Your session has expired. Sign in again to continue.";
  }
  if (status === 403) {
    return "You do not have permission to use the accounting workspace.";
  }
  return messageFromBody(body, fallback);
}

/** Maps a stored submission status to a success message. */
function successMessage(status: Submission["status"]): string {
  if (status === "approved") return "Submission already approved.";
  if (status === "rejected") return "Submission already rejected.";
  return "Submission received. It is pending review.";
}

/** Returns all server errors that correspond to one form control. */
function errorsForField(
  field: string,
  fieldErrors: FieldErrors,
): readonly string[] {
  const keys =
    field === "amountMinor"
      ? ["amountMinor", "money.amountMinor"]
      : field === "currency"
        ? ["currency", "money.currency"]
        : [field];
  return keys.flatMap((key) => fieldErrors[key] ?? []);
}

/** Renders accessible messages for one invalid form control. */
function FieldError({
  field,
  fieldErrors,
}: {
  readonly field: string;
  readonly fieldErrors: FieldErrors;
}) {
  const messages = errorsForField(field, fieldErrors);
  if (messages.length === 0) {
    return null;
  }

  return (
    <p id={`${field}-error`} role="alert" className="text-sm text-destructive">
      {messages.join(" ")}
    </p>
  );
}

/**
 * Renders the client island that submits a new expense or bill.
 * @returns The new-submission form card.
 */
export function NewSubmissionForm() {
  const router = useRouter();
  const [currency, setCurrency] = useState("THB");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  const isNonThbCurrency = currency.length === 3 && currency !== "THB";

  /** Sends one submission as multipart form data to the existing API route. */
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    setFormMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    if (formData.get("description") === "") {
      formData.delete("description");
    }
    if (!isNonThbCurrency) {
      formData.delete("settledThbAmount");
    }
    const idempotencyKey =
      idempotencyKeyRef.current ??
      (idempotencyKeyRef.current = globalThis.crypto.randomUUID());

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "idempotency-key": idempotencyKey },
        body: formData,
      });
      const body = await readJson(response);

      if (response.ok) {
        if (!isSubmission(body)) {
          setFormMessage({
            kind: "error",
            text: "We could not submit this record. Please try again.",
          });
          return;
        }
        setFormMessage({
          kind: "success",
          text: successMessage(body.status),
        });
        setFieldErrors({});
        router.refresh();
        form.reset();
        setCurrency("THB");
        idempotencyKeyRef.current = null;
        return;
      }

      if (response.status === 400) {
        setFieldErrors(fieldErrorsFromBody(body));
        setFormMessage({
          kind: "error",
          text: messageFromBody(body, "Please correct the highlighted fields."),
        });
        return;
      }

      if (response.status === 409) {
        idempotencyKeyRef.current = null;
        setFormMessage({
          kind: "error",
          text: "This submission conflicts with an earlier request. Submit again to start a separate submission.",
        });
        return;
      }

      setFormMessage({
        kind: "error",
        text: responseErrorMessage(
          response.status,
          body,
          "We could not submit this record. Please try again.",
        ),
      });
    } catch {
      setFormMessage({
        kind: "error",
        text: "We could not submit this record. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New submission</CardTitle>
        <CardDescription>
          Enter the original amount and attach the receipt or invoice.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          aria-label="Submission form"
          className="space-y-6"
          onSubmit={handleSubmit}
        >
          {formMessage ? (
            <p
              id="submission-form-status"
              role={formMessage.kind === "error" ? "alert" : "status"}
              aria-label={formMessage.text}
              className={
                formMessage.kind === "error"
                  ? "rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                  : "rounded-md border border-green-600/30 bg-green-50 p-3 text-sm text-green-800"
              }
            >
              {formMessage.text}
            </p>
          ) : null}

          <fieldset className="space-y-4">
            <legend className="mb-4 text-sm font-semibold">
              Submission details
            </legend>

            <div className="space-y-2">
              <Label htmlFor="kind">Submission kind</Label>
              <select
                id="kind"
                name="kind"
                defaultValue="expense"
                className={controlClassName}
              >
                <option value="expense">Expense</option>
                <option value="bill">Bill</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payee">Payee</Label>
                <Input
                  id="payee"
                  name="payee"
                  required
                  autoComplete="organization"
                  aria-describedby={
                    errorsForField("payee", fieldErrors).length > 0
                      ? "payee-error"
                      : undefined
                  }
                  aria-invalid={errorsForField("payee", fieldErrors).length > 0}
                  className={
                    errorsForField("payee", fieldErrors).length > 0
                      ? invalidControlClassName
                      : undefined
                  }
                />
                <FieldError field="payee" fieldErrors={fieldErrors} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  required
                  aria-describedby={
                    errorsForField("category", fieldErrors).length > 0
                      ? "category-error"
                      : undefined
                  }
                  aria-invalid={
                    errorsForField("category", fieldErrors).length > 0
                  }
                  className={
                    errorsForField("category", fieldErrors).length > 0
                      ? invalidControlClassName
                      : undefined
                  }
                />
                <FieldError field="category" fieldErrors={fieldErrors} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amountMinor">Amount in minor units</Label>
                <Input
                  id="amountMinor"
                  name="amountMinor"
                  required
                  inputMode="numeric"
                  pattern="[1-9][0-9]*"
                  aria-describedby={
                    errorsForField("amountMinor", fieldErrors).length > 0
                      ? "amountMinor-error"
                      : undefined
                  }
                  aria-invalid={
                    errorsForField("amountMinor", fieldErrors).length > 0
                  }
                  className={
                    errorsForField("amountMinor", fieldErrors).length > 0
                      ? invalidControlClassName
                      : undefined
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Use the smallest currency unit, such as satang for THB.
                </p>
                <FieldError field="amountMinor" fieldErrors={fieldErrors} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency (3-letter code)</Label>
                <Input
                  id="currency"
                  name="currency"
                  required
                  value={currency}
                  maxLength={3}
                  autoCapitalize="characters"
                  autoComplete="currency"
                  pattern="[A-Z]{3}"
                  onChange={(event) =>
                    setCurrency(event.target.value.toUpperCase())
                  }
                  aria-describedby={
                    errorsForField("currency", fieldErrors).length > 0
                      ? "currency-error"
                      : undefined
                  }
                  aria-invalid={
                    errorsForField("currency", fieldErrors).length > 0
                  }
                  className={
                    errorsForField("currency", fieldErrors).length > 0
                      ? invalidControlClassName
                      : undefined
                  }
                />
                <FieldError field="currency" fieldErrors={fieldErrors} />
              </div>
            </div>

            {isNonThbCurrency ? (
              <div className="space-y-2">
                <Label htmlFor="settledThbAmount">
                  Settled THB amount in minor units
                </Label>
                <Input
                  id="settledThbAmount"
                  name="settledThbAmount"
                  required
                  inputMode="numeric"
                  pattern="[1-9][0-9]*"
                  aria-describedby={
                    errorsForField("settledThbAmount", fieldErrors).length > 0
                      ? "settledThbAmount-error"
                      : undefined
                  }
                  aria-invalid={
                    errorsForField("settledThbAmount", fieldErrors).length > 0
                  }
                  className={
                    errorsForField("settledThbAmount", fieldErrors).length > 0
                      ? invalidControlClassName
                      : undefined
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Enter the THB total settled by the bank or card.
                </p>
                <FieldError
                  field="settledThbAmount"
                  fieldErrors={fieldErrors}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className={controlClassName}
                aria-describedby={
                  errorsForField("description", fieldErrors).length > 0
                    ? "description-error"
                    : undefined
                }
                aria-invalid={
                  errorsForField("description", fieldErrors).length > 0
                }
              />
              <FieldError field="description" fieldErrors={fieldErrors} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidence">Evidence file</Label>
              <Input
                id="evidence"
                name="evidence"
                type="file"
                required
                accept=".pdf,image/*"
                aria-describedby={
                  errorsForField("evidence", fieldErrors).length > 0
                    ? "evidence-error"
                    : undefined
                }
                aria-invalid={
                  errorsForField("evidence", fieldErrors).length > 0
                }
                className={
                  errorsForField("evidence", fieldErrors).length > 0
                    ? invalidControlClassName
                    : undefined
                }
              />
              <p className="text-xs text-muted-foreground">
                Attach one receipt or invoice. The file stays private.
              </p>
              <FieldError field="evidence" fieldErrors={fieldErrors} />
            </div>
          </fieldset>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Submitting…" : "Submit for review"}
          </Button>
          {isSubmitting ? (
            <p role="status" className="text-sm text-muted-foreground">
              Submitting your record…
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
