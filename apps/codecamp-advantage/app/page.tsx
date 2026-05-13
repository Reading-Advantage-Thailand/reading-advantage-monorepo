"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Button } from "@reading-advantage/ui";
import { BookOpen, MessageCircle, Code2, GraduationCap } from "lucide-react";

export default function HomePage() {
  const t = useTranslations("dashboard");
  const { data: dashboard, isLoading } = trpc.codecamp.dashboard.useQuery();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const modules = dashboard?.modules ?? [];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
        {dashboard && (
          <div className="mt-6 inline-flex items-center gap-4 rounded-lg border bg-card px-6 py-3">
            <div className="text-center">
              <p className="text-2xl font-bold">{dashboard.overallProgress}%</p>
              <p className="text-xs text-muted-foreground">Overall Progress</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold">{dashboard.completedLessons}</p>
              <p className="text-xs text-muted-foreground">Lessons Completed</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold">{dashboard.totalLessons}</p>
              <p className="text-xs text-muted-foreground">Total Lessons</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => (
          <ModuleCard
            key={mod.id}
            icon={getModuleIcon(mod.slug)}
            title={mod.title}
            description={mod.description}
            slug={mod.slug}
            progress={mod.progress}
            completedLessons={mod.completedLessons}
            lessonCount={mod.lessonCount}
          />
        ))}
      </div>
    </div>
  );
}

function getModuleIcon(slug: string) {
  if (slug.includes("nextjs") || slug.includes("app-router")) return <BookOpen className="h-8 w-8" />;
  if (slug.includes("trpc") || slug.includes("domain")) return <Code2 className="h-8 w-8" />;
  if (slug.includes("drizzle") || slug.includes("orm")) return <GraduationCap className="h-8 w-8" />;
  if (slug.includes("auth")) return <MessageCircle className="h-8 w-8" />;
  return <BookOpen className="h-8 w-8" />;
}

function ModuleCard({
  icon,
  title,
  description,
  slug,
  progress,
  completedLessons,
  lessonCount,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  slug: string;
  progress: number;
  completedLessons: number;
  lessonCount: number;
}) {
  const t = useTranslations("module");

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <div className="mb-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {completedLessons} / {lessonCount} lessons
        </p>
      </div>
      <Button variant="outline" className="w-full" asChild>
        <a href={`/module/${slug}`}>{t("start")}</a>
      </Button>
    </div>
  );
}
