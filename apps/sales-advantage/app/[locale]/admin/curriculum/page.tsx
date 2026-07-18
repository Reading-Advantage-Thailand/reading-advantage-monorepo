"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@reading-advantage/ui";
import { Button } from "@reading-advantage/ui";
import { Badge } from "@reading-advantage/ui";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

/** Renders the localized curriculum review workflow for Sales administrators. */
export default function CurriculumPage() {
  const t = useTranslations("admin");
  const utils = trpc.useUtils();
  const { data: curriculum } = trpc.sales.admin.curriculum.useQuery();
  const approve = trpc.sales.admin.approveContent.useMutation({
    onSuccess: async () => {
      await utils.sales.admin.curriculum.invalidate();
    },
  });

  return (
    <div className="mx-auto max-w-4xl p-8">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("backToAdmin")}
      </Link>
      <h1 className="mb-6 text-3xl font-bold">{t("curriculum")}</h1>
      <div className="space-y-4">
        {(curriculum?.modules ?? []).map((module) => (
          <Card key={module.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{module.title}</CardTitle>
                <Badge variant="secondary">{module.phase}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {module.lessons.map((lesson) => (
                  <ReviewRow
                    key={lesson.id}
                    title={lesson.title}
                    detail={t(lesson.type)}
                    reviewStatus={lesson.reviewStatus}
                    onApprove={() => approve.mutate({ lessonId: lesson.id })}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <CardTitle>{t("rubrics")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(curriculum?.rubrics ?? []).map((rubric) => (
                <ReviewRow
                  key={rubric.id}
                  title={rubric.name}
                  detail={t("rubric")}
                  reviewStatus={rubric.reviewStatus}
                  onApprove={() => approve.mutate({ rubricId: rubric.id })}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReviewRow({
  title,
  detail,
  reviewStatus,
  onApprove,
}: {
  title: string;
  detail: string;
  reviewStatus: "draft" | "reviewed" | "approved";
  onApprove: () => void;
}) {
  const t = useTranslations("admin");
  return (
    <div className="flex items-center justify-between rounded border p-3 text-sm">
      <div>
        <span className="font-medium">{title}</span>
        <span className="ml-2 text-xs text-muted-foreground">({detail})</span>
      </div>
      <div className="flex items-center gap-2">
        {reviewStatus === "approved" ? (
          <Badge className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> {t("approved")}
          </Badge>
        ) : (
          <>
            <Badge variant="outline">{t(reviewStatus)}</Badge>
            <Button size="sm" onClick={onApprove}>
              {t("approve")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
