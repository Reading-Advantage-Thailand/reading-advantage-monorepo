"use client";

import { trpc } from "@/lib/trpc";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@reading-advantage/ui";
import { Button } from "@reading-advantage/ui";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { RoleplayRecorder } from "@/components/roleplay-recorder";
import { QuizComponent } from "@/components/quiz-component";
import { ChatTutor } from "@/components/chat-tutor";
import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { LessonContent } from "@/components/lesson-content";

export default function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("lesson");
  const {
    data: lesson,
    isLoading,
    error,
    refetch,
  } = trpc.sales.lesson.useQuery({ lessonId: id });
  const [marked, setMarked] = useState(false);
  const utils = trpc.useUtils();
  const markComplete = trpc.sales.markTheoryLessonComplete.useMutation({
    onSuccess: async () => {
      setMarked(true);
      await Promise.all([
        utils.sales.lesson.invalidate({ lessonId: id }),
        utils.sales.dashboard.invalidate(),
      ]);
      await refetch();
    },
  });

  if (error) {
    const locked = error.data?.code === "BAD_REQUEST";
    return (
      <div className="mx-auto max-w-4xl p-8" role="alert">
        <Card>
          <CardHeader>
            <CardTitle>
              {locked ? t("lockedLessonTitle") : t("unavailableTitle")}
            </CardTitle>
            <CardDescription>
              {locked
                ? t("lockedLessonDescription")
                : t("unavailableDescription")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading || !lesson) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <Link
        href={`/module/${lesson.moduleSlug}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("backToModule")}
      </Link>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{lesson.title}</h1>
      </div>

      {lesson.type === "theory" && (
        <Card>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none pt-6">
            <LessonContent content={lesson.content} />
            <div className="mt-6">
              {marked || lesson.completed ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{t("completed")}</span>
                </div>
              ) : (
                <Button
                  onClick={() => markComplete.mutate({ lessonId: id })}
                  disabled={markComplete.isPending}
                >
                  {t("markComplete")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {lesson.type === "roleplay" && lesson.scenarios && (
        <div className="space-y-6">
          {lesson.scenarios.map((scenario) => (
            <RoleplayRecorder key={scenario.id} scenario={scenario} />
          ))}
        </div>
      )}

      {lesson.type === "quiz" && lesson.quizQuestions && (
        <QuizComponent lessonId={id} questions={lesson.quizQuestions} />
      )}

      <div className="mt-12 border-t pt-8">
        <ChatTutor lessonId={id} moduleId={lesson.moduleId} />
      </div>
    </div>
  );
}
