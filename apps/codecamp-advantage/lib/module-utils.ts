/**
 * Determine if a module should be locked based on prerequisite completion.
 * A module is locked if the highest-order published module before it exists
 * and is not 100% complete. This handles gaps in module ordering.
 */
export function isModuleLocked(
  moduleId: string,
  modules: { id: string; order: number; progress: number }[]
): boolean {
  const mod = modules.find((m) => m.id === moduleId);
  if (!mod) return false;
  if (mod.order <= 1) return false;

  const prevMod = modules
    .filter((m) => m.order < mod.order)
    .sort((a, b) => b.order - a.order)[0];
  if (!prevMod) return false;

  return prevMod.progress < 100;
}

/**
 * Get the title of the module that must be completed before this one.
 * Returns null if the module is not locked or has no prerequisite.
 */
export function getLockedByModuleTitle(
  moduleId: string,
  modules: { id: string; order: number; title: string }[]
): string | null {
  const mod = modules.find((m) => m.id === moduleId);
  if (!mod) return null;
  if (mod.order <= 1) return null;

  const prevMod = modules
    .filter((m) => m.order < mod.order)
    .sort((a, b) => b.order - a.order)[0];
  if (!prevMod) return null;

  return prevMod.title;
}

/** Editorial states persisted for a PR review. */
export type PrReviewStatus = "pending" | "reviewed" | "needs_changes" | "approved";

/** Queue-derived states shown when an editorial review is still pending. */
export type PrReviewOperationalStatus = "processing" | "retrying" | "failed";

/** A module PR review with optional durable worker state. */
export type ModulePrReview = {
  exerciseRepoId: string;
  moduleId: string;
  reviewStatus: PrReviewStatus;
  reviewJob?: {
    status: "pending" | "claimed" | "succeeded" | "failed" | "dead";
    attempts: number;
  } | null;
};

/**
 * Aggregate PR review status for a given module.
 * Queue failures take precedence over editorial states; within editorial
 * states the priority remains pending > needs_changes > reviewed > approved.
 */
export function getModulePrStatus(
  moduleId: string,
  reviews: ModulePrReview[],
): PrReviewStatus | PrReviewOperationalStatus | null {
  const moduleReviews = reviews.filter((r) => r.moduleId === moduleId);
  if (moduleReviews.length === 0) return null;

  const operationalStatuses = moduleReviews.map((review) => {
    if (review.reviewStatus !== "pending" || !review.reviewJob) return null;
    if (review.reviewJob.status === "claimed" || (review.reviewJob.status === "pending" && review.reviewJob.attempts === 0)) return "processing" as const;
    if (review.reviewJob.status === "pending") return "retrying" as const;
    if (review.reviewJob.status === "dead" || review.reviewJob.status === "failed") return "failed" as const;
    return null;
  });
  if (operationalStatuses.includes("processing")) return "processing";
  if (operationalStatuses.includes("retrying")) return "retrying";
  if (operationalStatuses.includes("failed")) return "failed";

  const statuses = new Set(moduleReviews.map((r) => r.reviewStatus));

  if (statuses.has("pending")) return "pending";
  if (statuses.has("needs_changes")) return "needs_changes";
  if (statuses.has("reviewed")) return "reviewed";
  return "approved";
}
