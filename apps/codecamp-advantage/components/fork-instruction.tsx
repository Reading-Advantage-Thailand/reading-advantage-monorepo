"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getPrDisplayName } from "@/lib/pr-url";
import { Button } from "@reading-advantage/ui";
import { useTranslations } from "next-intl";
import {
  GitBranch,
  Copy,
  CheckCircle,
  GitPullRequest,
  ExternalLink,
  Terminal,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface ForkInstructionProps {
  repoUrl: string;
  repoDescription: string;
  exerciseRepoId: string;
}

export function ForkInstruction({ repoUrl, repoDescription, exerciseRepoId }: ForkInstructionProps) {
  const t = useTranslations("fork");
  const [prUrl, setPrUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const createPrReview = trpc.codecamp.createPrReview.useMutation();
  const { data: existingReview } = trpc.codecamp.prReviewByPrUrl.useQuery(
    { prUrl },
    { enabled: !!prUrl && prUrl.startsWith("https://github.com/") }
  );

  const isValidPrUrl =
    prUrl.startsWith("https://github.com/") && /\/pull\/\d+$/.test(prUrl);

  const handleSubmitPr = async () => {
    if (!isValidPrUrl) return;
    await createPrReview.mutateAsync({ exerciseRepoId, prUrl });
    setSubmitted(true);
  };

  return (
    <div className="space-y-6">
      {/* Step-by-step instructions */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((stepNum) => {
          const idx = stepNum - 1;
          const icons = [
            <GitBranch key="step1-icon" className="h-5 w-5" />,
            <Terminal key="step2-icon" className="h-5 w-5" />,
            <GitBranch key="step3-icon" className="h-5 w-5" />,
            <Copy key="step4-icon" className="h-5 w-5" />,
            <ArrowRight key="step5-icon" className="h-5 w-5" />,
          ];
          return (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              <div className="mt-0.5 text-primary">{icons[idx]}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {stepNum}. {t(`step${stepNum}Title`)}
                </p>
                <p className="text-xs text-muted-foreground">{t(`step${stepNum}Desc`)}</p>
                {idx === 0 && (
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t("openOnGitHub", { description: repoDescription })}
                  </a>
                )}
                {idx === 1 && (
                  <div className="mt-2 space-y-1">
                    <code className="block rounded bg-muted px-2 py-1 text-xs font-mono">
                      git clone {repoUrl.replace(/\.git$/, "")}.git
                    </code>
                    <p className="text-xs text-muted-foreground">
                      {t("cloneCommand")} <code className="text-xs">git clone {repoUrl.replace(/\.git$/, "").replace("https://github.com/", "git@github.com:")}.git</code>
                    </p>
                  </div>
                )}
                {idx === 2 && (
                  <code className="mt-2 block rounded bg-muted px-2 py-1 text-xs font-mono">
                    git checkout -b feature/{repoDescription.toLowerCase().replace(/\s+/g, "-")}
                  </code>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* PR URL input */}
      <div className="rounded-lg border p-4">
        <h4 className="text-sm font-semibold">{t("submitTitle")}</h4>
        <p className="text-xs text-muted-foreground">
          {t("prUrlHint")}
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="url"
            value={prUrl}
            onChange={(e) => {
              setPrUrl(e.target.value);
              setSubmitted(false);
            }}
            placeholder={t("prUrlPlaceholder")}
            aria-label="Pull request URL"
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <Button
            size="sm"
            onClick={handleSubmitPr}
            disabled={!isValidPrUrl || createPrReview.isPending || submitted}
          >
            {createPrReview.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : submitted ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <GitPullRequest className="h-4 w-4" />
            )}
            <span className="ml-1.5">{submitted ? t("submitted") : t("trackPr")}</span>
          </Button>
        </div>
        {prUrl && !isValidPrUrl && (
          <p className="mt-2 text-xs text-red-600">
            {t("invalidPrUrl")}
          </p>
        )}

        {/* Review status */}
        {(existingReview || submitted) && (
          <div className="mt-3 rounded-lg bg-muted p-3">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{getPrDisplayName(prUrl)}</span>
              {existingReview && (
                <PrReviewStatusBadge status={existingReview.reviewStatus} />
              )}
              {submitted && !existingReview && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("pending")}
                </span>
              )}
            </div>
            {existingReview?.llmReviewSummary && (
              <p className="mt-2 text-xs text-muted-foreground">
                {existingReview.llmReviewSummary}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PrReviewStatusBadge({
  status,
}: {
  status: "pending" | "reviewed" | "needs_changes" | "approved";
}) {
  const t = useTranslations("fork");
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    reviewed: "bg-blue-100 text-blue-800",
    needs_changes: "bg-red-100 text-red-800",
    approved: "bg-green-100 text-green-800",
  };
  const labels: Record<string, string> = {
    pending: t("pending"),
    reviewed: "Reviewed",
    needs_changes: "Needs Changes",
    approved: "Approved",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
