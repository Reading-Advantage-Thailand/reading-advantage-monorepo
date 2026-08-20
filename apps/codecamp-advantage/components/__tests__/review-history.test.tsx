import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewHistory } from "../review-history";
import enMessages from "../../messages/en.json";
import thMessages from "../../messages/th.json";

/**
 * Phase 2 (Red) tests for the learner-visible review statuses (FR-1).
 *
 * Behavior lands in Phase 3. The current `ReviewHistory` only knows the
 * four editorial statuses, so the new-state and i18n-key assertions
 * are RED.
 *
 * New i18n key names chosen to follow the existing `review.statusXxx`
 * convention in `apps/codecamp-advantage/messages/{en,th}.json`:
 *
 *   review.statusFailed
 *   review.statusFailedMsg
 *   review.statusFailedRetryAction
 *   review.statusSkipped
 *   review.statusSkippedMsg
 *   review.statusSkippedPathsLabel
 *   review.statusProcessing
 *   review.statusProcessingMsg
 *   review.statusRetrying
 *   review.statusRetryingMsg
 */

const NEW_KEYS = [
  "review.statusFailed",
  "review.statusFailedMsg",
  "review.statusFailedRetryAction",
  "review.statusSkipped",
  "review.statusSkippedMsg",
  "review.statusSkippedPathsLabel",
  "review.statusProcessing",
  "review.statusProcessingMsg",
  "review.statusRetrying",
  "review.statusRetryingMsg",
] as const;

/** Reads a nested messages bundle to a flat dotted-key map. */
function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      Object.assign(out, flatten(v as Record<string, unknown>, key));
    } else {
      out[key] = String(v ?? "");
    }
  }
  return out;
}

describe("ReviewHistory learner-visible operational statuses (FR-1)", () => {
  it("renders failed with a plain-language reason and a retry action when the job is dead", () => {
    const props = {
      prUrl: "https://github.com/org/repo/pull/5",
      reviewStatus: "failed",
      summary: null,
      failureReason: "Review model timed out after retries.",
      onRequestAnotherReview: () => {},
    };
    render(
      // Cast: Phase 3 extends the `reviewStatus` union and props.
      <ReviewHistory {...(props as unknown as Parameters<typeof ReviewHistory>[0])} />,
    );

    expect(screen.getByText("statusFailed")).toBeInTheDocument();
    expect(screen.getByText("statusFailedMsg")).toBeInTheDocument();
    expect(screen.getByText("statusFailedRetryAction")).toBeInTheDocument();
    expect(screen.getByText(/Review model timed out after retries\./)).toBeInTheDocument();
  });

  it("renders skipped with the removed paths when the outcome is skipped_generated", () => {
    const props = {
      prUrl: "https://github.com/org/repo/pull/5",
      reviewStatus: "skipped",
      summary: null,
      removedPaths: ["dist/bundle.js", "build/out.js"],
    };
    render(
      <ReviewHistory {...(props as unknown as Parameters<typeof ReviewHistory>[0])} />,
    );

    expect(screen.getByText("statusSkipped")).toBeInTheDocument();
    expect(screen.getByText("statusSkippedMsg")).toBeInTheDocument();
    expect(screen.getByText("statusSkippedPathsLabel")).toBeInTheDocument();
    expect(screen.getByText(/dist\/bundle\.js/)).toBeInTheDocument();
    expect(screen.getByText(/build\/out\.js/)).toBeInTheDocument();
  });

  it("renders the processing state when the worker has claimed the job", () => {
    const props = {
      prUrl: "https://github.com/org/repo/pull/5",
      reviewStatus: "processing",
      summary: null,
    };
    render(
      <ReviewHistory {...(props as unknown as Parameters<typeof ReviewHistory>[0])} />,
    );

    expect(screen.getByText("statusProcessing")).toBeInTheDocument();
    expect(screen.getByText("statusProcessingMsg")).toBeInTheDocument();
  });

  it("renders the retrying state when the worker has scheduled a backoff attempt", () => {
    const props = {
      prUrl: "https://github.com/org/repo/pull/5",
      reviewStatus: "retrying",
      summary: null,
    };
    render(
      <ReviewHistory {...(props as unknown as Parameters<typeof ReviewHistory>[0])} />,
    );

    expect(screen.getByText("statusRetrying")).toBeInTheDocument();
    expect(screen.getByText("statusRetryingMsg")).toBeInTheDocument();
  });

  it("never renders pending for a dead job (FR-1: true learner-visible state)", () => {
    const props = {
      prUrl: "https://github.com/org/repo/pull/5",
      reviewStatus: "failed",
      summary: null,
      failureReason: "Review dead-lettered — model timed out.",
    };
    render(
      <ReviewHistory {...(props as unknown as Parameters<typeof ReviewHistory>[0])} />,
    );

    expect(screen.queryByText("statusPending")).not.toBeInTheDocument();
    expect(screen.queryByText("statusPendingMsg")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/review timeline: pending/i)).not.toBeInTheDocument();
  });
});

describe("ReviewHistory i18n key parity for new operational statuses (FR-1)", () => {
  const enKeys = flatten(enMessages as Record<string, unknown>);
  const thKeys = flatten(thMessages as Record<string, unknown>);

  for (const key of NEW_KEYS) {
    it(`en.json carries ${key}`, () => {
      expect(enKeys[key], `en.json must define ${key}`).toBeTruthy();
    });
    it(`th.json carries ${key}`, () => {
      expect(thKeys[key], `th.json must define ${key}`).toBeTruthy();
    });
    it(`th.json ${key} differs from en.json ${key} (no English fallback)`, () => {
      const en = enKeys[key] ?? "";
      const th = thKeys[key] ?? "";
      expect(th.trim(), `Thai value for ${key} must not be byte-identical to English`).not.toBe(en.trim());
    });
  }
});
