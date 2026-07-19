"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@reading-advantage/auth-client";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from "@reading-advantage/ui";
import { useTranslations } from "next-intl";

type AuthEntryVariant = "header" | "panel";

interface LegacyCredentialFormProps {
  readonly afterLogin?: () => void;
}

/**
 * Renders the product-local credential form used only during explicit rollback mode.
 * @param props Optional callback invoked after a successful legacy login.
 * @returns Bounded username/password form.
 */
function LegacyCredentialForm({
  afterLogin,
}: LegacyCredentialFormProps): React.ReactNode {
  const t = useTranslations("login");
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Submits one credential attempt through the active legacy adapter.
   * @param event Browser form submission.
   * @returns Nothing after local auth state settles.
   */
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password);
      setUsername("");
      setPassword("");
      afterLogin?.();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 text-left">
      <div className="space-y-2">
        <Label htmlFor="codecamp-legacy-username">{t("username")}</Label>
        <Input
          id="codecamp-legacy-username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="codecamp-legacy-password">{t("password")}</Label>
        <Input
          id="codecamp-legacy-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={submitting}>
        {t("login")}
      </Button>
    </form>
  );
}

/**
 * Renders an auth entry that reveals local credentials only in validated legacy mode.
 * @param props Header-dialog or inline-panel presentation.
 * @returns Fail-closed sign-in control for the active server mode.
 */
export function AuthEntry({
  variant,
}: {
  readonly variant: AuthEntryVariant;
}): React.ReactNode {
  const t = useTranslations("login");
  const [mode, setMode] = useState<"company" | "legacy" | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/mode")
      .then(async (response) => {
        if (!response.ok) throw new Error("Auth mode unavailable");
        const payload = (await response.json()) as { mode?: unknown };
        if (payload.mode !== "company" && payload.mode !== "legacy") {
          throw new Error("Auth mode is invalid");
        }
        return payload.mode;
      })
      .then((resolvedMode) => {
        if (active) setMode(resolvedMode);
      })
      .catch(() => {
        if (active) setMode("company");
      });
    return () => {
      active = false;
    };
  }, []);

  if (mode === null) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Checking sign-in mode
      </p>
    );
  }

  if (mode === "company") {
    return (
      <Button variant={variant === "header" ? "outline" : "default"} size={variant === "header" ? "sm" : "default"} className={variant === "panel" ? "mt-6" : undefined} asChild>
        <a href="/api/auth/company/start">{t("login")}</a>
      </Button>
    );
  }

  if (variant === "panel") {
    return (
      <div className="mx-auto mt-6 max-w-sm">
        <LegacyCredentialForm />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t("login")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("loginTitle")}</DialogTitle>
        </DialogHeader>
        <LegacyCredentialForm afterLogin={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
