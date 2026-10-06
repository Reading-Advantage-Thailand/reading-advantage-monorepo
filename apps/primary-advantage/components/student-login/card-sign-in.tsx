"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ClassLoginApiError, postStudentLogin } from "@/components/teacher/class-login/api";
import { StudentErrorMessage, waitMinutes, type StudentError } from "./errors";
import { useEnterAfterSignIn } from "./use-student-home";

/** Maps a failed QR sign-in to the message for the student. */
function errorFor(caught: unknown): StudentError {
  if (!(caught instanceof ClassLoginApiError)) return { key: "generic" };
  if (caught.status === 429) return { key: "rateLimited", minutes: waitMinutes(caught.retryAfterSeconds) };
  if (caught.status === 400 || caught.status === 401) return { key: "cardInvalid" };
  return { key: "generic" };
}

/**
 * QR card sign-in (FR-5). The printed card opens `/auth/card#<token>`. The page reads the token
 * from the URL fragment and removes it from the address bar and the history before any other
 * work, so a shared device does not keep the token. Then it posts the token to the QR route and
 * opens the student home. A failure shows a message and a link to the class code sign-in.
 * @returns The sign-in status or the failure message.
 */
export function CardSignIn() {
  const t = useTranslations("StudentSignIn.card");
  const enter = useEnterAfterSignIn();
  const [error, setError] = useState<StudentError | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // StrictMode runs effects twice in development. The token is read and sent only once.
    if (started.current) return;
    started.current = true;
    const token = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    if (!token) {
      setError({ key: "cardMissing" });
      return;
    }
    postStudentLogin("qr", { token })
      .then(() => enter())
      .catch((caught: unknown) => setError(errorFor(caught)));
  }, [enter]);

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 p-4 text-center">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {error ? (
        <>
          <StudentErrorMessage error={error} />
          <Button asChild size="lg" className="min-h-12 text-lg motion-reduce:transition-none">
            <Link href="/auth/signin">{t("useCode")}</Link>
          </Button>
        </>
      ) : (
        <p role="status" className="text-lg">
          {t("signingIn")}
        </p>
      )}
    </div>
  );
}
