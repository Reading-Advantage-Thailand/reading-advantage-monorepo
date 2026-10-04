"use client";

import { useTranslations } from "next-intl";

/** Keys under `StudentSignIn.errors` in the message files. */
export type StudentErrorKey =
  | "codeFormat"
  | "codeInvalid"
  | "wrongPictures"
  | "locked"
  | "rateLimited"
  | "cardInvalid"
  | "cardMissing"
  | "generic";

/** A sign-in failure to show to a student: the message key and, for a wait, the minutes left. */
export interface StudentError {
  /** The message key under `StudentSignIn.errors`. */
  key: StudentErrorKey;
  /** Minutes to wait, for `locked` and `rateLimited`. */
  minutes?: number;
}

/**
 * Converts a wait in seconds, for example from a `Retry-After` header, to whole minutes.
 * @param seconds The wait in seconds. A missing value counts as 60.
 * @returns The minutes, rounded up, at least 1.
 */
export function waitMinutes(seconds: number | undefined): number {
  return Math.max(1, Math.ceil((seconds ?? 60) / 60));
}

/** Props of {@link StudentErrorMessage}. */
export interface StudentErrorMessageProps {
  /** The failure to show, or null to show nothing. */
  error: StudentError | null;
}

/**
 * Shows a sign-in failure to a student. The `alert` role makes screen readers announce it.
 * @param props The failure.
 * @returns The message, or null when there is no failure.
 */
export function StudentErrorMessage({ error }: StudentErrorMessageProps) {
  const t = useTranslations("StudentSignIn.errors");
  if (!error) return null;
  return (
    <p role="alert" className="text-destructive text-center text-base font-medium">
      {t(error.key, { minutes: error.minutes ?? 1 })}
    </p>
  );
}
