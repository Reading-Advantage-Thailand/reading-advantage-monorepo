"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@reading-advantage/ui";
import {
  BookOpen,
  CheckCircle,
  Circle,
  ArrowLeft,
  GitBranch,
  GitPullRequest,
  Trophy,
} from "lucide-react";
import { ForkInstruction } from "@/components/fork-instruction";

export default function ModulePage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: moduleData, isLoading } = trpc.codecamp.moduleBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );
  const { data: exerciseRepos } = trpc.codecamp.exerciseRepos.useQuery(
    { moduleId: moduleData?.id ?? "" },
    { enabled: !!moduleData?.id }
  );
  const { data: prReviews } = trpc.codecamp.prReviews.useQuery();

  if (isLoading) {
    return <div className="container py-12">Loading...</div>;
  }

  if (!moduleData) {
    return (
      <div className="container py-12">
        <h1 className="text-2xl font-bold">Module not found</h1>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/">← Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  // Compute module quiz average from lesson scores
  const scoredLessons = moduleData.lessons.filter((l) => l.userScore !== null && l.userScore > 0);
  const quizAverage =
    scoredLessons.length > 0
      ? Math.round(
          scoredLessons.reduce((sum, l) => sum + (l.userScore ?? 0), 0) / scoredLessons.length
        )
      : null;

  // Map PR reviews to exercise repos for this module
  const repoPrStatus = new Map<string, NonNullable<typeof prReviews>[number]>();
  if (prReviews && exerciseRepos) {
    for (const repo of exerciseRepos) {
      const review = prReviews.find((r) => r.exerciseRepoId === repo.id);
      if (review) repoPrStatus.set(repo.id, review);
    }
  }

  return (
    <div className="container py-12">
      <Button variant="ghost" className="mb-6" asChild>
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{moduleData.title}</h1>
        <p className="mt-2 text-muted-foreground">{moduleData.description}</p>
        <div className="mt-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${moduleData.progress}%` }}
          />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {moduleData.completedLessons} / {moduleData.lessonCount} lessons completed
        </p>
        {quizAverage !== null && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
            <Trophy className="h-4 w-4" />
            Quiz average: {quizAverage}%
          </p>
        )}
      </div>

      {/* Exercise Repos */}
      {exerciseRepos && exerciseRepos.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Exercise Repositories</h2>
          {exerciseRepos.map((repo) => {
            const review = repoPrStatus.get(repo.id);
            return (
              <div key={repo.id} className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-primary" />
                  <span className="font-medium">{repo.description}</span>
                  {review && <PrStatusBadge status={review.reviewStatus} />}
                </div>
                <ForkInstruction
                  repoUrl={repo.repoUrl}
                  repoDescription={repo.description}
                  exerciseRepoId={repo.id}
                />
                {review?.llmReviewSummary && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    <span className="font-medium">Review:</span>{" "}
                    {review.llmReviewSummary}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-4">
        <h2 className="text-xl font-semibold">Lessons</h2>
        {moduleData.lessons && moduleData.lessons.length > 0 ? (
          moduleData.lessons.map((lesson) => (
            <LessonItem
              key={lesson.id}
              title={lesson.title}
              description={lesson.description}
              status={lesson.userStatus ?? "not_started"}
              score={lesson.userScore}
              href={`/lesson/${lesson.id}`}
            />
          ))
        ) : (
          <p className="text-muted-foreground">No lessons available for this module yet.</p>
        )}
      </div>
    </div>
  );
}

function PrStatusBadge({
  status,
}: {
  status: "pending" | "reviewed" | "needs_changes" | "approved";
}) {
  const config: Record<
    string,
    { label: string; className: string }
  > = {
    pending: {
      label: "Pending",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    },
    reviewed: {
      label: "Reviewed",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
    needs_changes: {
      label: "Needs Changes",
      className:
        "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    },
    approved: {
      label: "Approved",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    },
  };

  const c = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}
    >
      <GitPullRequest className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function LessonItem({
  title,
  description,
  status,
  score,
  href,
}: {
  title: string;
  description: string;
  status: "not_started" | "in_progress" | "completed";
  score: number | null;
  href: string;
}) {
  const icons = {
    not_started: <Circle className="h-5 w-5 text-muted-foreground" />,
    in_progress: <BookOpen className="h-5 w-5 text-primary" />,
    completed: <CheckCircle className="h-5 w-5 text-green-500" />,
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
    >
      {icons[status]}
      <div className="flex-1">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {score !== null && score > 0 && (
        <span className="text-sm font-medium text-amber-600">{score}%</span>
      )}
      <Button variant="outline" size="sm">
        {status === "completed" ? "Review" : "Start"}
      </Button>
    </Link>
  );
}
