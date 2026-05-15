"use client";

import {
  GitPullRequest,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  ExternalLink,
  Circle,
} from "lucide-react";
import { getPrDisplayName } from "@/lib/pr-url";
import { useTranslations } from "next-intl";

interface ReviewHistoryProps {
  prUrl: string;
  reviewStatus: "pending" | "reviewed" | "needs_changes" | "approved";
  summary: string | null;
}

function getStatusConfig(status: ReviewHistoryProps["reviewStatus"], t: ReturnType<typeof useTranslations>) {
  switch (status) {
    case "pending":
      return {
        label: t("statusPending"),
        className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
        icon: <Clock className="h-4 w-4" />,
        message: t("statusPendingMsg"),
      };
    case "reviewed":
      return {
        label: t("statusReviewed"),
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        icon: <CheckCircle className="h-4 w-4" />,
        message: t("statusReviewedMsg"),
      };
    case "needs_changes":
      return {
        label: t("statusNeedsChanges"),
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        icon: <AlertCircle className="h-4 w-4" />,
        message: t("statusNeedsChangesMsg"),
      };
    case "approved":
      return {
        label: t("statusApproved"),
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        icon: <CheckCircle className="h-4 w-4" />,
        message: t("statusApprovedMsg"),
      };
  }
}

function getTimelineStepStatus(
  stepId: string,
  reviewStatus: ReviewHistoryProps["reviewStatus"]
): "pending" | "completed" | "active" {
  const statusOrder = ["pending", "reviewed", "needs_changes", "approved"];
  const currentIndex = statusOrder.indexOf(reviewStatus);

  const stepIndex = ["submitted", "first_review", "revisions", "approved"].indexOf(stepId);

  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "active";
  return "pending";
}

export function ReviewHistory({ prUrl, reviewStatus, summary }: ReviewHistoryProps) {
  const t = useTranslations("review");
  const config = getStatusConfig(reviewStatus, t);

  const timelineSteps = [
    { id: "submitted", label: t("prSubmitted"), description: t("prSubmittedDesc") },
    { id: "first_review", label: t("firstReview"), description: t("firstReviewDesc") },
    { id: "revisions", label: t("revisions"), description: t("revisionsDesc") },
    { id: "approved", label: t("approved"), description: t("approvedDesc") },
  ];

  return (
    <div className="space-y-4">
      {/* Header with PR link and current status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <a
          href={prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
        >
          <GitPullRequest className="h-4 w-4" />
          {getPrDisplayName(prUrl)}
          <ExternalLink className="h-3 w-3" />
        </a>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
        >
          {config.icon}
          {config.label}
        </span>
      </div>

      {/* Status message */}
      <p className="text-sm text-muted-foreground">{config.message}</p>

      {/* Review summary */}
      {summary && (
        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-sm font-medium">{t("feedback")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
        </div>
      )}

      {/* Timeline */}
      <div>
        <p className="mb-2 text-sm font-medium">{t("history")}</p>
        <div className="space-y-2" aria-label={`review timeline: ${reviewStatus}`}>
          {timelineSteps.map((step) => {
            const stepStatus = getTimelineStepStatus(step.id, reviewStatus);
            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 rounded-md border p-2.5 ${
                  stepStatus === "active"
                    ? "border-primary bg-primary/5"
                    : stepStatus === "completed"
                    ? "border-green-200 bg-green-50/30"
                    : "border-muted bg-muted/20 opacity-70"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {stepStatus === "completed" ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : stepStatus === "active" ? (
                    <RotateCcw className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
