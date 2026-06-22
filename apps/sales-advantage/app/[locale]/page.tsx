"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@reading-advantage/auth-client";
import { trpc } from "@/lib/trpc";
import { LoginForm } from "@/components/login-form";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@reading-advantage/ui";
import { Badge } from "@reading-advantage/ui";
import { BookOpen, Mic, Trophy, Lock } from "lucide-react";

export default function HomePage() {
  const t = useTranslations("dashboard");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data, isLoading } = trpc.sales.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

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

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const modules = data ?? [];

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("noProgress")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod, idx) => {
          const m = mod as typeof mod & {
            lessonCount?: number;
            completedLessons?: number;
            bestRoleplayScore?: number | null;
            previousModuleCompleted?: boolean;
          };
          const locked = idx > 0 && !m.previousModuleCompleted;
          return (
            <Link
              key={m.id}
              href={locked ? "/" : `/module/${m.slug}`}
              className={locked ? "pointer-events-none opacity-50" : ""}
            >
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{m.phase ?? `Module ${idx + 1}`}</Badge>
                    {locked ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <BookOpen className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <CardTitle className="mt-3 text-lg">{m.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{m.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <BookOpen className="h-3 w-3" /> {m.lessonCount ?? 0} lessons
                      </span>
                      <span className="text-muted-foreground">
                        {m.completedLessons ?? 0}/{m.lessonCount ?? 0}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${Math.round(((m.completedLessons ?? 0) / Math.max(1, m.lessonCount ?? 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    {m.bestRoleplayScore != null && (
                      <div className="flex items-center justify-between pt-2 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Trophy className="h-3 w-3" /> {t("bestScore")}
                        </span>
                        <span className="font-medium">{m.bestRoleplayScore}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}