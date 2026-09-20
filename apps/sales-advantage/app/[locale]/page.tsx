"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@reading-advantage/auth-client";
import { trpc } from "@/lib/trpc";
import { LoginForm } from "@/components/login-form";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@reading-advantage/ui";
import { Badge } from "@reading-advantage/ui";
import { BookOpen, Lock } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function HomePage() {
  const t = useTranslations("dashboard");
  const lessonT = useTranslations("lesson");
  const loginT = useTranslations("login");
  const signInError = useSearchParams().get("error");
  const { isAuthenticated, isForbidden, isLoading: authLoading } = useAuth();
  const { data, isLoading, error } = trpc.sales.dashboard.useQuery(undefined, {
    enabled: isAuthenticated && !isForbidden,
  });
  const messageKey =
    signInError === "sso"
      ? "errorSso"
      : signInError === "forbidden"
        ? "errorForbidden"
        : null;

  if (messageKey) {
    return (
      <>
        <p role="alert" className="mx-auto mt-6 max-w-sm text-destructive">
          {loginT(messageKey)}
        </p>
        <LoginForm />
      </>
    );
  }

  if (isForbidden) {
    return (
      <>
        <p role="alert" className="mx-auto mt-6 max-w-sm text-destructive">
          {loginT("errorForbidden")}
        </p>
        <LoginForm />
      </>
    );
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-8" role="alert">
        <h1 className="text-2xl font-bold">{t("unavailableTitle")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("unavailableDescription")}
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  const modules = data ?? [];
  const completedLessons = modules.reduce(
    (total, module) => total + module.completedLessons,
    0,
  );
  const totalLessons = modules.reduce(
    (total, module) => total + module.lessonCount,
    0,
  );
  const dashboardSummary =
    completedLessons > 0
      ? t("progressLabel", {
          completed: completedLessons,
          total: totalLessons,
        })
      : t("noProgress");

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{dashboardSummary}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const locked = module.isLocked;
          const lockedReason = module.prerequisiteModuleSlug
            ? t("completeModuleFirst", {
                module: module.prerequisiteModuleSlug,
              })
            : lessonT("lockedModuleDescription");
          const progressLabel = t("progressLabel", {
            completed: module.completedLessons,
            total: module.lessonCount,
          });
          const card = (
            <Card
              className={
                locked
                  ? "h-full opacity-50"
                  : "h-full transition-shadow hover:shadow-lg"
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{module.phase}</Badge>
                  {locked ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <BookOpen className="h-4 w-4 text-primary" />
                  )}
                </div>
                <CardTitle className="mt-3 text-lg">{module.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {module.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <BookOpen className="h-3 w-3" /> {module.lessonCount}{" "}
                      {t("lessons")}
                    </span>
                    <span className="text-muted-foreground">
                      {module.completedLessons}/{module.lessonCount}
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={module.progress}
                    aria-label={progressLabel}
                  >
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${module.progress}%` }}
                    />
                  </div>
                  {locked && (
                    <p className="text-xs text-muted-foreground">
                      {lockedReason}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
          return locked ? (
            <button
              key={module.id}
              type="button"
              aria-disabled="true"
              className="block h-full w-full cursor-default rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {card}
            </button>
          ) : (
            <Link key={module.id} href={`/module/${module.slug}`}>
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
