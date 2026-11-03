import { describe, expect, it } from "vitest";
import { getLockedByModuleTitle, getModulePrStatus, isModuleLocked, type ModulePrReview } from "../module-utils";

const modules = [
  { id: "m1", order: 1, title: "Intro", progress: 100 },
  { id: "m3", order: 3, title: "Hooks", progress: 40 },
  { id: "m5", order: 5, title: "State", progress: 0 },
];

describe("module progress gating", () => {
  it("never locks an unknown module", () => {
    expect(isModuleLocked("missing", modules)).toBe(false);
  });

  it("locks at 99% and unlocks at exactly 100% of the previous module", () => {
    expect(isModuleLocked("b", [{ id: "a", order: 1, progress: 99 }, { id: "b", order: 2, progress: 0 }])).toBe(true);
    expect(isModuleLocked("b", [{ id: "a", order: 1, progress: 100 }, { id: "b", order: 2, progress: 0 }])).toBe(false);
  });

  it("uses only the nearest lower-order module, not earlier ones", () => {
    expect(isModuleLocked("m5", modules)).toBe(true);
    expect(isModuleLocked("m5", [{ id: "a", order: 1, progress: 0 }, { id: "b", order: 4, progress: 100 }, { id: "m5", order: 5, progress: 0 }])).toBe(false);
  });

  it("does not lock a module whose order is zero or negative", () => {
    expect(isModuleLocked("z", [{ id: "z", order: 0, progress: 0 }, { id: "neg", order: -1, progress: 0 }])).toBe(false);
  });
});

describe("getLockedByModuleTitle", () => {
  it("returns null for an unknown, first, or prerequisite-less module", () => {
    expect(getLockedByModuleTitle("missing", modules)).toBeNull();
    expect(getLockedByModuleTitle("m1", modules)).toBeNull();
    expect(getLockedByModuleTitle("only", [{ id: "only", order: 2, title: "Only" }])).toBeNull();
  });

  it("names the nearest lower-order module across order gaps", () => {
    expect(getLockedByModuleTitle("m3", modules)).toBe("Intro");
    expect(getLockedByModuleTitle("m5", modules)).toBe("Hooks");
  });

  it("names the prerequisite even when it is complete", () => {
    expect(getLockedByModuleTitle("m3", modules)).toBe("Intro");
    expect(isModuleLocked("m3", modules)).toBe(false);
  });
});

/** Builds one PR review for the given module and status. */
function review(overrides: Partial<ModulePrReview>): ModulePrReview {
  return { exerciseRepoId: "repo", moduleId: "m1", reviewStatus: "pending", ...overrides };
}

describe("getModulePrStatus grading states", () => {
  it("ignores reviews of other modules", () => {
    expect(getModulePrStatus("m2", [review({ reviewStatus: "approved" })])).toBeNull();
  });

  it("maps a dead or failed job on a pending review to failed", () => {
    expect(getModulePrStatus("m1", [review({ reviewJob: { status: "dead", attempts: 5 } })])).toBe("failed");
    expect(getModulePrStatus("m1", [review({ reviewJob: { status: "failed", attempts: 1 } })])).toBe("failed");
  });

  it("treats a succeeded job on a pending review as editorial pending", () => {
    expect(getModulePrStatus("m1", [review({ reviewJob: { status: "succeeded", attempts: 1 } })])).toBe("pending");
  });

  it("ignores worker state once an editorial status is recorded", () => {
    expect(getModulePrStatus("m1", [review({ reviewStatus: "approved", reviewJob: { status: "dead", attempts: 3 } })])).toBe("approved");
    expect(getModulePrStatus("m1", [review({ reviewStatus: "needs_changes", reviewJob: { status: "claimed", attempts: 1 } })])).toBe("needs_changes");
  });

  it("ranks processing over retrying over failed across reviews", () => {
    const failed = review({ exerciseRepoId: "a", reviewJob: { status: "dead", attempts: 3 } });
    const retrying = review({ exerciseRepoId: "b", reviewJob: { status: "pending", attempts: 2 } });
    const processing = review({ exerciseRepoId: "c", reviewJob: { status: "claimed", attempts: 1 } });

    expect(getModulePrStatus("m1", [failed, retrying, processing])).toBe("processing");
    expect(getModulePrStatus("m1", [failed, retrying])).toBe("retrying");
    expect(getModulePrStatus("m1", [failed, review({ exerciseRepoId: "d", reviewStatus: "approved" })])).toBe("failed");
  });

  it("treats a null review job as no worker state", () => {
    expect(getModulePrStatus("m1", [review({ reviewJob: null })])).toBe("pending");
  });

  it("ranks needs_changes over reviewed over approved", () => {
    expect(getModulePrStatus("m1", [review({ reviewStatus: "approved" }), review({ reviewStatus: "reviewed" }), review({ reviewStatus: "needs_changes" })])).toBe("needs_changes");
    expect(getModulePrStatus("m1", [review({ reviewStatus: "approved" }), review({ reviewStatus: "reviewed" })])).toBe("reviewed");
  });
});
