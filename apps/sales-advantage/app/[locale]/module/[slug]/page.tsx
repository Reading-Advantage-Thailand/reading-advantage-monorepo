"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@reading-advantage/ui";
import { Badge } from "@reading-advantage/ui";
import { Button } from "@reading-advantage/ui";
import { BookOpen, Mic, FileQuestion, CheckCircle2, ArrowLeft } from "lucide-react";
import { use } from "react";

export default function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const t = useTranslations("lesson");
  const { data: mod, isLoading } = trpc.sales.moduleBySlug.useQuery({ slug });

  if (isLoading || !mod) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
      <div className="mb-8">
        <Badge variant="secondary">{(mod as unknown as { phase?: string }).phase ?? ""}</Badge>
        <h1 className="mt-2 text-3xl font-bold">{mod.title}</h1>
        <p className="mt-2 text-muted-foreground">{mod.description}</p>
      </div>

      <div className="space-y-3">
        {(((mod as unknown as { lessons?: Array<{ id: string; title: string; type: string; completed?: boolean; bestScore?: number | null }> }).lessons) ?? []).map((lesson, idx) => {
          const Icon =
            lesson.type === "roleplay" ? Mic : lesson.type === "quiz" ? FileQuestion : BookOpen;
          const completed = lesson.completed;
          return (
            <Link key={lesson.id} href={`/lesson/${lesson.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    {completed ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Icon className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {idx + 1}. {lesson.title}
                    </CardTitle>
                    <CardDescription className="text-xs uppercase tracking-wide">
                      {lesson.type}
                    </CardDescription>
                  </div>
                  {lesson.bestScore != null && (
                    <Badge variant="outline">{lesson.bestScore}/100</Badge>
                  )}
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}