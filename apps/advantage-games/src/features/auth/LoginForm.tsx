"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { studentLoginInputSchema } from "@/lib/auth/contracts";
import { withBasePath } from "@/lib/basePath";

interface LoginFormProps {
  redirectTo?: string;
}

function readErrorMessage(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }
  return "Unable to sign in. Please try again.";
}

/** Renders the accessible first-party username/password sign-in form.
 * @param props Validated same-app destination used after authentication.
 * @returns The student credential form.
 */
export function LoginForm({
  redirectTo = "/en/student/arcade/dragon-flight",
}: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    const parsed = studentLoginInputSchema.safeParse({ username, password });
    if (!parsed.success) {
      setError("Enter your username and password.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(withBasePath("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(readErrorMessage(body));
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form aria-label="Student sign in" className="space-y-5" onSubmit={submit}>
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="username">
          Username
        </label>
        <input
          autoCapitalize="none"
          autoComplete="username"
          className="min-h-11 w-full rounded-lg border border-border bg-background px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          id="username"
          name="username"
          onChange={(event) => setUsername(event.target.value)}
          required
          spellCheck={false}
          value={username}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="min-h-11 w-full rounded-lg border border-border bg-background px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          id="password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="min-h-11 w-full rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:cursor-wait disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
