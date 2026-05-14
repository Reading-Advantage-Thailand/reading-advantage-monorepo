"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@reading-advantage/auth-client";
import { trpc } from "@/lib/trpc";
import { Button } from "@reading-advantage/ui";
import { Progress } from "@reading-advantage/ui";
import { Badge } from "@reading-advantage/ui";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  GitPullRequest,
} from "lucide-react";

export default function InternDetailPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { user, isLoading: authLoading } = useAuth();
  const { data: intern, isLoading: dataLoading } =
    trpc.codecamp.getInternProgress.useQuery(
      { userId },
      { enabled: user?.role === "ADMIN" && !!userId }
    );

  if (authLoading || dataLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-8 h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You need admin privileges to view this page.
          </p>
          <Button asChild>
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!intern) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Button variant="ghost" className="mb-6" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Intern not found</h1>
        <p className="mt-2 text-muted-foreground">
          The intern with ID <code>{userId}</code> does not exist.
        </p>
      </div>
    );
  }

  const totalScore = intern.quizScores.reduce((s: number, q: { score: number }) => s + q.score, 0);
  const avgQuizScore =
    intern.quizScores.length > 0
      ? Math.round(totalScore / intern.quizScores.length)
      : 0;

  return (
    <div className="container mx-auto px-4 py-12">
      <Button variant="ghost" className="mb-6" asChild>
        <Link href="/admin">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{intern.name ?? intern.username}</h1>
        <p className="text-muted-foreground">@{intern.username}</p>
      </div>

      {/* Module Breakdown */}
      <div className="mb-8 rounded-lg border">
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Module Progress</h2>
          </div>
        </div>
        <div className="divide-y">
          {intern.moduleBreakdown.map((mod: {
            moduleId: string;
            title: string;
            completed: number;
            totalLessons: number;
            avgScore: number;
          }) => (
            <div
              key={mod.moduleId}
              className="flex items-center justify-between p-4"
            >
              <div className="flex-1">
                <p className="font-medium">{mod.title}</p>
                <div className="mt-2 flex items-center gap-3">
                  <Progress
                    value={
                      mod.totalLessons > 0
                        ? Math.round((mod.completed / mod.totalLessons) * 100)
                        : 0
                    }
                    className="h-2 w-32"
                  />
                  <span className="text-xs text-muted-foreground">
                    {mod.completed}/{mod.totalLessons} lessons
                  </span>
                </div>
              </div>
              <div className="ml-4 text-right">
                <Badge variant={mod.avgScore >= 80 ? "default" : "secondary"}>
                  Avg: {mod.avgScore}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Quiz Scores */}
        <div className="rounded-lg border">
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <h2 className="text-lg font-semibold">Quiz Scores</h2>
              </div>
              <Badge variant="outline">Avg: {avgQuizScore}%</Badge>
            </div>
          </div>
          {intern.quizScores.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No quiz submissions yet.
            </div>
          ) : (
            <div className="divide-y">
              {intern.quizScores.map((q: { lessonId: string; lessonTitle: string; score: number }) => (
                <div
                  key={q.lessonId}
                  className="flex items-center justify-between p-4"
                >
                  <span className="text-sm text-muted-foreground">
                    {q.lessonTitle}
                  </span>
                  <Badge
                    variant={q.score >= 80 ? "default" : q.score >= 60 ? "secondary" : "destructive"}
                  >
                    {q.score}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PR Reviews */}
        <div className="rounded-lg border">
          <div className="border-b p-4">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">PR Reviews</h2>
            </div>
          </div>
          {intern.prReviews.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No PR reviews yet.
            </div>
          ) : (
            <div className="divide-y">
              {intern.prReviews.map((review: {
                id: string;
                prUrl: string;
                reviewStatus: string;
                llmReviewSummary: string | null;
                reviewedAt: Date | null;
              }) => (
                <div key={review.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <a
                      href={review.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {review.prUrl.split("/").slice(-4).join("/")}
                    </a>
                    <Badge
                      variant={
                        review.reviewStatus === "approved"
                          ? "default"
                          : review.reviewStatus === "needs_changes"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {review.reviewStatus}
                    </Badge>
                  </div>
                  {review.llmReviewSummary && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {review.llmReviewSummary}
                    </p>
                  )}
                  {review.reviewedAt && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(review.reviewedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
