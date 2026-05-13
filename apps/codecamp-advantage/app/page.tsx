"use client";

import { useTranslations } from "next-intl";
import { Button } from "@reading-advantage/ui";
import { BookOpen, MessageCircle, Code2, GraduationCap } from "lucide-react";

export default function HomePage() {
  const t = useTranslations("dashboard");

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          icon={<BookOpen className="h-8 w-8" />}
          title="Next.js App Router & RSC"
          description="Master Server Components, async pages, and the App Router patterns used across all monorepo apps."
          slug="nextjs-app-router"
        />
        <ModuleCard
          icon={<Code2 className="h-8 w-8" />}
          title="tRPC & Domain Functions"
          description="Learn the thin-router / thick-domain architecture that powers the shared backend."
          slug="trpc-domain"
        />
        <ModuleCard
          icon={<GraduationCap className="h-8 w-8" />}
          title="Drizzle ORM"
          description="Schema definition, multi-tenant queries, and migration patterns with Drizzle."
          slug="drizzle-orm"
        />
        <ModuleCard
          icon={<MessageCircle className="h-8 w-8" />}
          title="Auth & Multi-Tenancy"
          description="Cookie sessions, role-based permissions, assertCan(), and tenant scoping."
          slug="auth-multitenancy"
        />
        <ModuleCard
          icon={<BookOpen className="h-8 w-8" />}
          title="Monorepo Patterns"
          description="Workspace structure, shared packages, Turborepo pipelines, and cross-app code sharing."
          slug="monorepo-patterns"
        />
      </div>
    </div>
  );
}

function ModuleCard({
  icon,
  title,
  description,
  slug,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  slug: string;
}) {
  const t = useTranslations("module");

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <Button variant="outline" className="w-full" asChild>
        <a href={`/module/${slug}`}>{t("start")}</a>
      </Button>
    </div>
  );
}
