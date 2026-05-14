"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@reading-advantage/ui";
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

const STEPS = [
  {
    icon: <GitBranch className="h-5 w-5" />,
    title: "Fork the repository",
    description: "Click the fork button on GitHub to create your own copy.",
  },
  {
    icon: <Terminal className="h-5 w-5" />,
    title: "Clone your fork",
    description: "Copy the repository to your local machine.",
  },
  {
    icon: <GitBranch className="h-5 w-5" />,
    title: "Create a branch",
    description: "Make a new branch for your changes.",
  },
  {
    icon: <Copy className="h-5 w-5" />,
    title: "Complete the exercise",
    description: "Make your changes following the instructions.",
  },
  {
    icon: <ArrowRight className="h-5 w-5" />,
    title: "Push and open a PR",
    description: "Push your branch and open a Pull Request to the original repo.",
  },
];

function getPrRepoName(prUrl: string): string {
  try {
    const url = new URL(prUrl);
    const parts = url.pathname.split("/");
    // Expected: /owner/repo/pull/123
    if (parts.length >= 5) {
      return `${parts[1]}/${parts[2]}/pull/${parts[4]}`;
    }
  } catch {
    // ignore
  }
  return prUrl;
}

export function ForkInstruction({ repoUrl, repoDescription, exerciseRepoId }: ForkInstructionProps) {
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
        {STEPS.map((step, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            <div className="mt-0.5 text-primary">{step.icon}</div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {idx + 1}. {step.title}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
              {idx === 0 && (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open {repoDescription} on GitHub
                </a>
              )}
              {idx === 1 && (
                <code className="mt-2 block rounded bg-muted px-2 py-1 text-xs font-mono">
                  git clone {repoUrl.replace(/\.git$/, "").replace("https://github.com/", "git@github.com:")}.git
                </code>
              )}
              {idx === 2 && (
                <code className="mt-2 block rounded bg-muted px-2 py-1 text-xs font-mono">
                  git checkout -b feature/{repoDescription.toLowerCase().replace(/\s+/g, "-")}
                </code>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* PR URL input */}
      <div className="rounded-lg border p-4">
        <h4 className="text-sm font-semibold">Submit your Pull Request</h4>
        <p className="text-xs text-muted-foreground">
          Paste the URL of your Pull Request to track review status.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="url"
            value={prUrl}
            onChange={(e) => {
              setPrUrl(e.target.value);
              setSubmitted(false);
            }}
            placeholder="https://github.com/owner/repo/pull/123"
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
            <span className="ml-1.5">{submitted ? "Submitted" : "Track PR"}</span>
          </Button>
        </div>
        {prUrl && !isValidPrUrl && (
          <p className="mt-2 text-xs text-red-600">
            Please enter a valid GitHub Pull Request URL.
          </p>
        )}

        {/* Review status */}
        {(existingReview || submitted) && (
          <div className="mt-3 rounded-lg bg-muted p-3">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{getPrRepoName(prUrl)}</span>
              {existingReview && (
                <PrReviewStatusBadge status={existingReview.reviewStatus} />
              )}
              {submitted && !existingReview && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Pending
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
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    reviewed: "bg-blue-100 text-blue-800",
    needs_changes: "bg-red-100 text-red-800",
    approved: "bg-green-100 text-green-800",
  };
  const labels: Record<string, string> = {
    pending: "Pending",
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
