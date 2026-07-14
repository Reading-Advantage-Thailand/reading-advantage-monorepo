"use client";

import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@reading-advantage/auth-client";
import { trpc } from "@/lib/trpc";
import { getPrDisplayName } from "@/lib/pr-url";
import { Button } from "@reading-advantage/ui";
import { Progress } from "@reading-advantage/ui";
import { Badge } from "@reading-advantage/ui";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { formatDate } from "@/lib/i18n-format";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  GitPullRequest,
  ExternalLink,
} from "lucide-react";

export default function InternDetailPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const reviewT = useTranslations("review");
  const statusBadgeLabels: Record<string, string> = {
    pending: reviewT("statusPending"),
    reviewed: reviewT("statusReviewedBadge"),
    needs_changes: reviewT("statusNeedsChangesBadge"),
    approved: reviewT("statusApprovedBadge"),
  };
  const params = useParams();
  const userId = params.userId as string;
  const { user, isLoading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const { data: intern, isLoading: dataLoading } =
    trpc.codecamp.getInternProgress.useQuery(
      { userId },
      { enabled: user?.role === "ADMIN" && !!userId }
    );
  const [githubUsername, setGithubUsername] = useState(intern?.githubUsername ?? "");
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, { disposition: "pass" | "revise"; reason: string }>>({});
  const updateGithub = trpc.codecamp.updateInternGithubUsername.useMutation({
    onSuccess: () => utils.codecamp.getInternProgress.invalidate(),
  });
  const recordPrReviewOverride = trpc.codecamp.recordPrReviewOverride.useMutation({
    onSuccess: (_event, input) => {
      setOverrideDrafts((drafts) => {
        const next = { ...drafts };
        delete next[input.attemptId];
        return next;
      });
      return utils.codecamp.getInternProgress.invalidate({ userId });
    },
  });

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
          <h1 className="text-2xl font-bold">{t("accessDenied")}</h1>
          <p className="text-muted-foreground">
            {t("noPrivileges")}
          </p>
          <Button asChild>
            <Link href="/">{t("backToDashboard")}</Link>
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
            {t("backToAdmin")}
          </Link>
        </Button>

        <h1 className="text-2xl font-bold">{t("internNotFound")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("internNotFound")}: <code>{userId}</code>
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
          {t("backToAdmin")}
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{intern.name ?? intern.username}</h1>
        <p className="text-muted-foreground">@{intern.username}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("githubUsername")}:</span>
          <input
            className="rounded border px-2 py-1 text-sm"
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            placeholder="github-handle"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={updateGithub.isPending}
            onClick={() => updateGithub.mutate({ userId: intern.userId, githubUsername: githubUsername || null })}
          >
            {updateGithub.isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>

      <div className="mb-8 rounded-lg border">
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t("moduleProgress")}</h2>
          </div>
        </div>
        <div className="divide-y">
          {intern.moduleBreakdown.map((mod: {
            moduleId: string;
            title: string;
            completed: number;
            totalLessons: number;
            avgScore: number;
            reviewExpected: boolean;
            reviewReceived: boolean;
            latestPrUrl: string | null;
            latestPrReviewStatus: string | null;
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
                    {mod.completed}/{mod.totalLessons} {t("lessonsLabel")}
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {!mod.reviewExpected ? (
                    <span>{t("noAiReviewExpected")}</span>
                  ) : mod.latestPrUrl ? (
                    <a
                      href={mod.latestPrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {t("reviewReceived")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span>{t("awaitingPrReview")}</span>
                  )}
                </div>
              </div>
              <div className="ml-4 text-right">
                <Badge variant={mod.avgScore >= 80 ? "default" : "secondary"}>
                  {t("avgLabel")} {mod.avgScore}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="mb-8 rounded-lg border" aria-labelledby="tutor-support-heading">
        <div className="border-b p-4">
          <h2 id="tutor-support-heading" className="text-lg font-semibold">{t("tutorSupport")}</h2>
        </div>
        {intern.tutorSupport.totalInterventions === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("tutorNoSupport")}</p>
        ) : (
          <div className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div><p className="text-sm text-muted-foreground">{t("tutorInterventions")}</p><p className="text-2xl font-semibold">{intern.tutorSupport.totalInterventions}</p></div>
              <div><p className="text-sm text-muted-foreground">{t("tutorVerifiedFollowUps")}</p><p className="text-2xl font-semibold">{intern.tutorSupport.verifiedFollowUps}</p></div>
              <div><p className="text-sm text-muted-foreground">{t("tutorResourceUses")}</p><p className="text-2xl font-semibold">{intern.tutorSupport.resourceUses}</p></div>
            </div>
            {intern.tutorSupport.misconceptionTags.length > 0 ? <div>
              <p className="mb-2 text-sm text-muted-foreground">{t("tutorMisconceptions")}</p>
              <div className="flex flex-wrap gap-2">{intern.tutorSupport.misconceptionTags.map((item: { tag: string; count: number }) => <Badge key={item.tag} variant="secondary">{item.tag} × {item.count}</Badge>)}</div>
            </div> : null}
          </div>
        )}
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="rounded-lg border">
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <h2 className="text-lg font-semibold">{t("quizScores")}</h2>
              </div>
              <Badge variant="outline">{t("avgLabel")} {avgQuizScore}%</Badge>
            </div>
          </div>
          {intern.quizScores.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t("empty.noQuizzes")}
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

        <div className="rounded-lg border">
          <div className="border-b p-4">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{t("prReviews")}</h2>
            </div>
          </div>
          {intern.prReviews.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t("empty.noPrReviews")}
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
                      {getPrDisplayName(review.prUrl)}
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
                      {statusBadgeLabels[review.reviewStatus]}
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
                      {formatDate(review.reviewedAt, locale)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="mt-8 rounded-lg border" aria-labelledby="pr-evidence-heading">
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-primary" />
            <h2 id="pr-evidence-heading" className="text-lg font-semibold">{t("prEvidence")}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("prEvidenceHint")}</p>
        </div>
        {intern.prReviewAttempts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("noPrEvidence")}</p>
        ) : (
          <div className="divide-y">
            {intern.prReviewAttempts.map((attempt: {
              id: string;
              headSha: string;
              attemptStatus: "advisory" | "validated" | "failed";
              evidenceAuthority: "advisory_model" | "trusted_deterministic";
              modelAlias: string | null;
              resolvedModel: string | null;
              createdAt: Date;
              objectives: Array<{ objectiveId: string; variantKey: string; score: number; confidence: number; evidenceState: "advisory" | "validated" | "rejected" }>;
              overrides: Array<{ id: string; correctedDisposition: "pass" | "revise"; reason: string; createdAt: Date }>;
            }) => {
              const draft = overrideDrafts[attempt.id] ?? { disposition: "revise" as const, reason: "" };
              return <div key={attempt.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-xs">{attempt.headSha.slice(0, 12)}</code>
                  <Badge variant={attempt.attemptStatus === "validated" ? "default" : attempt.attemptStatus === "failed" ? "destructive" : "secondary"}>{t(`prAttemptStatus.${attempt.attemptStatus}`)}</Badge>
                  <Badge variant="outline">{t(`prEvidenceAuthority.${attempt.evidenceAuthority}`)}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(attempt.createdAt, locale)}</span>
                </div>
                {attempt.resolvedModel || attempt.modelAlias ? <p className="text-xs text-muted-foreground">{t("prResolvedModel")}: {attempt.resolvedModel ?? attempt.modelAlias}</p> : null}
                <div className="space-y-1 text-sm">
                  {attempt.objectives.length === 0 ? <p className="text-muted-foreground">{t("noPrObjectives")}</p> : attempt.objectives.map((objective) => <p key={`${objective.objectiveId}:${objective.variantKey}`}><code>{objective.objectiveId}</code> · {objective.score}% · {t("prConfidence")}: {objective.confidence}% · {t(`prEvidenceState.${objective.evidenceState}`)}</p>)}
                </div>
                {attempt.overrides.length > 0 ? <div className="rounded bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{t("prCorrections")}</p>
                  {attempt.overrides.map((override) => <p key={override.id} className="mt-1 text-muted-foreground">{t(`prCorrectionDisposition.${override.correctedDisposition}`)} — {override.reason}</p>)}
                </div> : null}
                <div className="grid gap-2 rounded border p-3 sm:grid-cols-[auto_1fr_auto]">
                  <select
                    aria-label={t("prCorrectionDispositionLabel")}
                    className="rounded border bg-background px-2 py-1 text-sm"
                    value={draft.disposition}
                    onChange={(event) => setOverrideDrafts((drafts) => ({ ...drafts, [attempt.id]: { ...draft, disposition: event.target.value as "pass" | "revise" } }))}
                  >
                    <option value="pass">{t("prCorrectionDisposition.pass")}</option>
                    <option value="revise">{t("prCorrectionDisposition.revise")}</option>
                  </select>
                  <input
                    aria-label={t("prCorrectionReasonLabel")}
                    className="rounded border bg-background px-2 py-1 text-sm"
                    value={draft.reason}
                    onChange={(event) => setOverrideDrafts((drafts) => ({ ...drafts, [attempt.id]: { ...draft, reason: event.target.value } }))}
                    placeholder={t("prCorrectionReasonPlaceholder")}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={recordPrReviewOverride.isPending || draft.reason.trim().length < 10}
                    onClick={() => recordPrReviewOverride.mutate({ attemptId: attempt.id, correctedDisposition: draft.disposition, reason: draft.reason, correctedObjectives: [] })}
                  >
                    {recordPrReviewOverride.isPending ? t("saving") : t("recordPrCorrection")}
                  </Button>
                </div>
              </div>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
