"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { AuthEntry } from "@/components/auth-entry";
import { useAuth } from "@reading-advantage/auth-client";
import { Lock } from "lucide-react";
import dynamic from "next/dynamic";

const DashboardContent = dynamic(() => import("./dashboard-content"), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

/**
 * Renders an approved sign-in error from the current query.
 * @returns A localized alert or nothing.
 */
function SignInErrorMessage(): React.ReactNode {
  const t = useTranslations("login");
  const error = useSearchParams().get("error");
  const messageKey =
    error === "sso"
      ? "signInErrorSso"
      : error === "forbidden"
        ? "signInErrorForbidden"
        : error === "session_check_failed"
          ? "signInErrorSessionCheckFailed"
          : error === "legacy_auth_active"
            ? "signInErrorLegacyAuthActive"
            : undefined;

  return messageKey ? (
    <p role="alert" className="mb-4 text-sm text-destructive">
      {t(messageKey)}
    </p>
  ) : null;
}

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

/**
 * Renders the Codecamp landing page.
 * @returns The loading, sign-in, or dashboard view.
 */
export default function HomePage(): React.ReactNode {
  const t = useTranslations("dashboard");
  const tl = useTranslations("login");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: dashboard, isLoading } = trpc.codecamp.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

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
            <Suspense fallback={null}>
              <SignInErrorMessage />
            </Suspense>
            <AuthEntry variant="panel" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={null}>
        <SignInErrorMessage />
      </Suspense>
      <DashboardContent dashboard={dashboard} />
    </>
  );
}
