"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Button } from "@reading-advantage/ui";
import {
  BookOpen,
  Terminal,
  GitBranch,
  FileCode2,
  Braces,
  Type,
  FlaskConical,
  Layers,
  Globe,
  Database,
  Server,
  Lock,
  LockKeyhole,
  Languages,
  Sparkles,
  Package,
  Cloud,
  Rocket,
  GitPullRequest,
} from "lucide-react";
import { isModuleLocked } from "@/lib/module-utils";

const PHASE_ORDER = ["A", "B", "C", "D"] as const;

const PHASE_COLORS: Record<string, { border: string; badge: string }> = {
  A: { border: "border-l-green-500", badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  B: { border: "border-l-blue-500", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  C: { border: "border-l-purple-500", badge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  D: { border: "border-l-orange-500", badge: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
};

const PHASE_LABELS: Record<string, string> = {
  A: "Phase A",
  B: "Phase B",
  C: "Phase C",
  D: "Phase D",
};

export default function HomePage() {
  const t = useTranslations("dashboard");
  const { data: dashboard, isLoading } = trpc.codecamp.dashboard.useQuery();
  const { data: prReviews } = trpc.codecamp.prReviews.useQuery();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
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
      </div>
    );
  }

  const phases = dashboard?.phases ?? {};

  // Flatten all modules across phases for lock-state computation (computed once)
  const allModules = Object.values(phases).flatMap((p) => p.modules);

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

      {/* Overall stats — PR review summary */}
      {prReviews && prReviews.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          {["pending", "needs_changes", "approved"].map((status) => {
            const count = prReviews.filter((r) => r.reviewStatus === status).length;
            if (count === 0) return null;
            const labels: Record<string, string> = {
              pending: "Pending Review",
              needs_changes: "Needs Changes",
              approved: "Approved",
            };
            const colors: Record<string, string> = {
              pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
              needs_changes: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
              approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
            };
            return (
              <span key={status} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${colors[status]}`}>
                <GitPullRequest className="h-3.5 w-3.5" />
                {count} {labels[status]}
              </span>
            );
          })}
        </div>
      )}

      <div className="space-y-16">
        {PHASE_ORDER.map((phaseKey) => {
          const phase = phases[phaseKey];
          if (!phase) return null;

          const colors = PHASE_COLORS[phaseKey];

          if (phase.modules.length === 0) return null;

          return (
            <section key={phaseKey}>
              <div className="mb-6 flex items-center justify-between border-b pb-4">
                <div>
                  <div className="mb-1 flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.badge}`}>
                      {PHASE_LABELS[phaseKey]}
                    </span>
                    <h2 className="text-2xl font-bold">{phase.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{phase.description}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    Portfolio: {phase.portfolioProject}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {phase.completedLessons} / {phase.totalLessons} lessons
                  </p>
                  <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${phase.totalLessons > 0 ? Math.round((phase.completedLessons / phase.totalLessons) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {phase.modules.map((mod) => (
                  <ModuleCard
                    key={mod.id}
                    icon={getModuleIcon(mod.slug)}
                    title={mod.title}
                    description={mod.description}
                    slug={mod.slug}
                    progress={mod.progress}
                    completedLessons={mod.completedLessons}
                    lessonCount={mod.lessonCount}
                    phaseColor={colors.border}
                    isLocked={isModuleLocked(mod.id, allModules)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function getModuleIcon(slug: string) {
  if (slug.includes("dev-environment")) return <Terminal className="h-8 w-8" />;
  if (slug.includes("git")) return <GitBranch className="h-8 w-8" />;
  if (slug.includes("html") || slug.includes("css")) return <FileCode2 className="h-8 w-8" />;
  if (slug.includes("javascript")) return <Braces className="h-8 w-8" />;
  if (slug.includes("typescript")) return <Type className="h-8 w-8" />;
  if (slug.includes("vitest") || slug.includes("test")) return <FlaskConical className="h-8 w-8" />;
  if (slug.includes("react")) return <Layers className="h-8 w-8" />;
  if (slug.includes("api")) return <Globe className="h-8 w-8" />;
  if (slug.includes("nextjs")) return <BookOpen className="h-8 w-8" />;
  if (slug.includes("database") || slug.includes("orm")) return <Database className="h-8 w-8" />;
  if (slug.includes("trpc") || slug.includes("server-actions")) return <Server className="h-8 w-8" />;
  if (slug.includes("auth")) return <Lock className="h-8 w-8" />;
  if (slug.includes("i18n") || slug.includes("internationalization")) return <Languages className="h-8 w-8" />;
  if (slug.includes("ai")) return <Sparkles className="h-8 w-8" />;
  if (slug.includes("monorepo")) return <Package className="h-8 w-8" />;
  if (slug.includes("cloud") || slug.includes("docker")) return <Cloud className="h-8 w-8" />;
  if (slug.includes("real-world")) return <Rocket className="h-8 w-8" />;
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
  phaseColor,
  isLocked,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  slug: string;
  progress: number;
  completedLessons: number;
  lessonCount: number;
  phaseColor: string;
  isLocked?: boolean;
}) {
  const t = useTranslations("module");

  return (
    <div className={`rounded-lg border border-l-4 bg-card p-6 text-card-foreground shadow-sm transition-shadow hover:shadow-md ${phaseColor} ${isLocked ? "opacity-75" : ""}`}>
      <div className="mb-4 flex items-start justify-between">
        <div className="text-primary">{icon}</div>
        {isLocked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            <LockKeyhole className="h-3 w-3" />
            Locked
          </span>
        )}
      </div>
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
      {isLocked ? (
        <Button variant="outline" className="w-full" disabled aria-disabled="true">
          Complete previous module
        </Button>
      ) : (
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/module/${slug}`}>
            {t("start")}
          </Link>
        </Button>
      )}
    </div>
  );
}
