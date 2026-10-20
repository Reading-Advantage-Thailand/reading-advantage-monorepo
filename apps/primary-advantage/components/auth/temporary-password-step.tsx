"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@reading-advantage/ui";
import { FormError } from "../form-error";
import { useTranslations } from "next-intl";

/** Shortest new password, as the server's password rule. */
const MIN_LENGTH = 8;

/**
 * The second sign-in step for a temporary password from the cutover hand-out list (FR-5): the
 * user sets a new password, and the parent then signs in with it.
 * @param props.username The sign-in name.
 * @param props.temporaryPassword The temporary password the user just typed.
 * @param props.onChanged Called with the new password after the server stored it.
 * @returns The form.
 */
export function TemporaryPasswordStep({
  username,
  temporaryPassword,
  onChanged,
}: {
  username: string;
  temporaryPassword: string;
  onChanged: (newPassword: string) => Promise<void>;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const t = useTranslations("AuthPage.temporary");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    if (newPassword.length < MIN_LENGTH) return setError(t("tooShort", { min: MIN_LENGTH }));
    if (newPassword !== confirm) return setError(t("mismatch"));
    if (newPassword === temporaryPassword) return setError(t("sameAsTemporary"));
    setIsSaving(true);
    try {
      const res = await fetch("/api/auth/temporary-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: temporaryPassword, newPassword }),
      });
      // The server text is English: show the translated text (defect 2, 2026-10-20).
      if (!res.ok) return setError(t("notChanged"));
      await onChanged(newPassword);
    } catch {
      setError(t("notChanged"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm text-balance">{t("help")}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-password">{t("newPassword")}</Label>
        <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} disabled={isSaving} onChange={(e) => setNewPassword(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm-password">{t("confirm")}</Label>
        <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} disabled={isSaving} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <FormError message={error} />
      <Button type="submit" className="w-full" disabled={isSaving}>
        {isSaving ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
