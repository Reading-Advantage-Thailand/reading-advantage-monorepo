"use client";

import { CheckCircle, Circle, Loader2, GitPullRequest, GitBranch, GitMerge, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

interface WorkflowStep {
  id: string;
  label: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
}

interface WorkflowTrackerProps {
  issueTitle: string;
  issueNumber: number;
  steps: WorkflowStep[];
}

const STEP_ICONS: Record<string, ReactNode> = {
  claim: <MessageSquare className="h-5 w-5" />,
  branch: <GitBranch className="h-5 w-5" />,
  pr: <GitPullRequest className="h-5 w-5" />,
  review: <MessageSquare className="h-5 w-5" />,
  merge: <GitMerge className="h-5 w-5" />,
};

export function WorkflowTracker({ issueTitle, issueNumber, steps }: WorkflowTrackerProps) {
  const t = useTranslations("workflow");
  const allCompleted = steps.length > 0 && steps.every((s) => s.status === "completed");

  return (
    <div className="space-y-4">
      {/* Issue header */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
        <GitPullRequest className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium">
            {t("issueLabel", { number: issueNumber, title: issueTitle })}
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const icon = STEP_ICONS[step.id] ?? <Circle className="h-5 w-5" />;

          return (
            <div
              key={step.id}
              data-step-id={step.id}
              data-status={step.status}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                step.status === "in_progress"
                  ? "border-primary bg-primary/5"
                  : step.status === "completed"
                  ? "border-green-200 bg-green-50/50"
                  : "border-muted bg-muted/30"
              }`}
              aria-label={
                step.status === "in_progress"
                  ? `in progress: ${step.label}`
                  : step.status === "completed"
                  ? `completed: ${step.label}`
                  : `pending: ${step.label}`
              }
            >
              <div className="mt-0.5 shrink-0" aria-hidden="true">
                {step.status === "completed" ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : step.status === "in_progress" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{icon}</span>
                  <p className="text-sm font-medium">{step.label}</p>
                </div>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {!isLast && step.status === "completed" && (
                <div className="hidden sm:block" aria-hidden="true">
                  <div className="h-full w-px bg-green-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {allCompleted && (
        <div className="rounded-lg bg-green-50 p-3 text-center text-sm font-medium text-green-800">
          {t("allCompleted")}
        </div>
      )}
    </div>
  );
}
