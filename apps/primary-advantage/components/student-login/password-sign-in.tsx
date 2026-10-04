"use client";

import { useId, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudentErrorMessage, waitMinutes, type StudentError } from "./errors";
import { STUDENT_HOME, useEnterAfterSignIn } from "./use-student-home";

/** Maps a failed response of the shared login route to the message for the student. */
function errorFor(response: Response): StudentError {
  if (response.status === 429) {
    return { key: "rateLimited", minutes: waitMinutes(Number(response.headers.get("Retry-After")) || undefined) };
  }
  if (response.status === 400 || response.status === 401) return { key: "wrongPassword" };
  return { key: "generic" };
}

/**
 * Username and password sign-in for students (FR-6). It is the only way to sign in away from the
 * classroom. It posts to the shared login route, so the shared lockout and rate limits apply.
 * A student goes to the student home. Any other role goes to the sign-in page, where the proxy
 * sends the user to the home page of the role.
 * @returns The form.
 */
export function PasswordSignIn() {
  const t = useTranslations("StudentSignIn.password");
  const enter = useEnterAfterSignIn();
  const usernameId = useId();
  const passwordId = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<StudentError | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (response.ok) {
        const data = (await response.json().catch(() => null)) as { user?: { role?: string } } | null;
        await enter(data?.user?.role === "STUDENT" ? STUDENT_HOME : "/auth/signin");
        return;
      }
      setError(errorFor(response));
    } catch {
      setError({ key: "generic" });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-base">{t("help")}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={usernameId} className="text-base">
          {t("username")}
        </Label>
        <Input
          id={usernameId}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={busy}
          className="h-12 text-lg"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={passwordId} className="text-base">
          {t("password")}
        </Label>
        <Input
          id={passwordId}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          disabled={busy}
          className="h-12 text-lg"
        />
      </div>
      <StudentErrorMessage error={error} />
      <Button
        type="submit"
        size="lg"
        className="min-h-12 w-full text-lg motion-reduce:transition-none"
        disabled={busy || !username.trim() || !password}
      >
        {busy ? t("signingIn") : t("submit")}
      </Button>
    </form>
  );
}
