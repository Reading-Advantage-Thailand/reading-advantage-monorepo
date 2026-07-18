"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@reading-advantage/auth-client";
import { Button } from "@reading-advantage/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@reading-advantage/ui";
import { Mic } from "lucide-react";

export function LoginForm() {
  const t = useTranslations("login");
  const { login } = useAuth();
  const [legacyMode, setLegacyMode] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/mode")
      .then(async (response) => {
        if (!response.ok) throw new Error("Auth mode unavailable");
        return response.json() as Promise<{ mode: string }>;
      })
      .then(({ mode }) => {
        if (active) setLegacyMode(mode === "legacy-school");
      })
      .catch(() => {
        if (active) setLegacyMode(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submitLegacy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password);
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Login failed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center">
            <Mic className="h-5 w-5 text-primary" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {legacyMode === null ? (
            <p role="status" className="text-sm text-muted-foreground">
              Checking sign-in mode&
            </p>
          ) : legacyMode ? (
            <form className="space-y-4" onSubmit={submitLegacy}>
              <label className="block text-sm">
                Username
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  name="username"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>
              <label className="block text-sm">
                Password
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button className="w-full" type="submit" disabled={submitting}>
                {t("submit")}
              </Button>
            </form>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Use your Reading Advantage company account to continue.
              </p>
              <Button asChild className="w-full">
                <a href="/api/auth/company/start">{t("submit")}</a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
