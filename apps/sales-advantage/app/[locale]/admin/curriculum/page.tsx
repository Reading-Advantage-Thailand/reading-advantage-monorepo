"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@reading-advantage/ui";
import { Button } from "@reading-advantage/ui";
import { Badge } from "@reading-advantage/ui";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function CurriculumPage() {
  const t = useTranslations("admin");
  const { data: modules, refetch } = trpc.sales.modules.useQuery();
  const approve = trpc.sales.admin.approveContent.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <div className="mx-auto max-w-4xl p-8">
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Admin
      </Link>
      <h1 className="mb-6 text-3xl font-bold">{t("curriculum")}</h1>
      <div className="space-y-4">
        {((modules ?? []) as unknown as Array<{ id: string; title: string; phase: string; slug: string }>).map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{m.title}</CardTitle>
                <Badge variant="secondary">{m.phase}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ModuleLessons moduleSlug={m.slug} onApprove={(lessonId) => approve.mutate({ lessonId })} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ModuleLessons({ moduleSlug, onApprove }: { moduleSlug: string; onApprove: (id: string) => void }) {
  const { data } = trpc.sales.moduleBySlug.useQuery({ slug: moduleSlug });
  const lessons = ((data as unknown as { lessons?: Array<{ id: string; title: string; type: string; reviewStatus: string }> })?.lessons) ?? [];
  return (
    <div className="space-y-2">
      {lessons.map((l) => (
        <div key={l.id} className="flex items-center justify-between rounded border p-3 text-sm">
          <div>
            <span className="font-medium">{l.title}</span>
            <span className="ml-2 text-xs text-muted-foreground">({l.type})</span>
          </div>
          <div className="flex items-center gap-2">
            {l.reviewStatus === "approved" ? (
              <Badge className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> approved
              </Badge>
            ) : (
              <>
                <Badge variant="outline">{l.reviewStatus}</Badge>
                <Button size="sm" onClick={() => onApprove(l.id)}>Approve</Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}