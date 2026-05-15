"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { useAuth } from "@reading-advantage/auth-client";
import { trpc } from "@/lib/trpc";
import { Button } from "@reading-advantage/ui";
import { Input } from "@reading-advantage/ui";
import { Label } from "@reading-advantage/ui";
import { useTranslations } from "next-intl";
import { ArrowLeft, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";

export default function NewInternPage() {
  const t = useTranslations("admin");
  const { user, isLoading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createIntern = trpc.codecamp.createIntern.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setUsername("");
      setName("");
      setPassword("");
      setError(null);
    },
    onError: (err: { message: string }) => {
      setError(err.message);
    },
  });

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-8 h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold">{t("accessDenied")}</h1>
          <p className="text-muted-foreground">
            {t("noPrivileges")}
          </p>
          <Button asChild>
            <Link href="/">{t("backToDashboard")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 8) {
      setError(t("form.passwordMinLength"));
      return;
    }

    createIntern.mutate({ username, name, password });
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <Button variant="ghost" className="mb-6" asChild>
        <Link href="/admin">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToAdmin")}
        </Link>
      </Button>

      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <UserPlus className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">{t("createIntern")}</h1>
        </div>
        <p className="text-muted-foreground">
          {t("createInternDescription")}
        </p>
      </div>

      {success && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle2 className="h-5 w-5" />
          <p>{t("toast.createSuccess")}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="username">{t("username")}</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="intern1"
            required
            minLength={3}
            maxLength={50}
          />
          <p className="text-xs text-muted-foreground">
            {t("usernameHint")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">{t("displayName")}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Intern One"
            required
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("initialPassword")}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            {t("passwordHint")}
          </p>
        </div>

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={createIntern.isPending}
            className="w-full"
          >
            {createIntern.isPending ? t("creating") : t("createIntern")}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin">{t("cancel")}</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
