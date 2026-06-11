"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Button, Input, Label } from "@reading-advantage/ui";
import { useAuth } from "@reading-advantage/auth-client";
import { Lock } from "lucide-react";
import dynamic from "next/dynamic";

const DashboardContent = dynamic(() => import("./dashboard-content"), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

function DashboardSkeleton() {
  return (
    <div className="space-y-16">
      {Array.from({ length: 2 }).map((_, sectionIdx) => (
        <div key={sectionIdx}>
          <div className="mb-6 flex items-center justify-between border-b pb-4">
            <div className="space-y-2">
              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-72 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, cardIdx) => (
              <div key={cardIdx} className="h-48 animate-pulse rounded-lg border bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations("dashboard");
  const tl = useTranslations("login");
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { data: dashboard, isLoading } = trpc.codecamp.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  async function handleInlineLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      await login(username, password);
      setUsername("");
      setPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  }

  if (authLoading || (isAuthenticated && isLoading)) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mb-8 text-lg text-muted-foreground">{t("subtitle")}</p>
          <div className="rounded-lg border bg-card p-8 text-card-foreground">
            <Lock className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">{tl("loginTitle")}</h2>
            <form onSubmit={handleInlineLogin} className="mx-auto mt-6 max-w-sm space-y-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="dashboard-username">{tl("username")}</Label>
                <Input
                  id="dashboard-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="intern1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dashboard-password">{tl("password")}</Label>
                <Input
                  id="dashboard-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              {loginError && (
                <p className="text-sm text-destructive" role="alert">{loginError}</p>
              )}
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {tl("login")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <DashboardContent dashboard={dashboard} />;
}
