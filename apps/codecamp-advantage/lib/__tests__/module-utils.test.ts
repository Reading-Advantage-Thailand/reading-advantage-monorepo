import { describe, it, expect } from "vitest";
import { isModuleLocked, getModulePrStatus } from "../module-utils";

describe("isModuleLocked", () => {
  it("returns false for the first module (order 1)", () => {
    const modules = [{ id: "m1", order: 1, progress: 0 }];
    expect(isModuleLocked("m1", modules)).toBe(false);
  });

  it("returns false when previous module is 100% complete", () => {
    const modules = [
      { id: "m1", order: 1, progress: 100 },
      { id: "m2", order: 2, progress: 0 },
    ];
    expect(isModuleLocked("m2", modules)).toBe(false);
  });

  it("returns true when previous module is not 100% complete", () => {
    const modules = [
      { id: "m1", order: 1, progress: 50 },
      { id: "m2", order: 2, progress: 0 },
    ];
    expect(isModuleLocked("m2", modules)).toBe(true);
  });

  it("returns false when there is no previous module", () => {
    const modules = [{ id: "m1", order: 5, progress: 0 }];
    expect(isModuleLocked("m1", modules)).toBe(false);
  });

  it("handles gaps in module order when previous is complete", () => {
    const modules = [
      { id: "m1", order: 1, progress: 100 },
      { id: "m3", order: 3, progress: 0 },
    ];
    // m1 is the highest preceding module and is complete, so m3 is not locked
    expect(isModuleLocked("m3", modules)).toBe(false);
  });

  it("locks module when preceding module with gap is incomplete", () => {
    const modules = [
      { id: "m1", order: 1, progress: 50 },
      { id: "m3", order: 3, progress: 0 },
    ];
    // m1 is the highest preceding module and is incomplete, so m3 is locked
    expect(isModuleLocked("m3", modules)).toBe(true);
  });
});

describe("getModulePrStatus", () => {
  it("returns null when no PR reviews exist for the module", () => {
    const reviews = [
      { exerciseRepoId: "repo1", moduleId: "m2", reviewStatus: "approved" as const },
    ];
    expect(getModulePrStatus("m1", reviews)).toBeNull();
  });

  it("returns pending when any review is pending", () => {
    const reviews = [
      { exerciseRepoId: "repo1", moduleId: "m1", reviewStatus: "pending" as const },
      { exerciseRepoId: "repo2", moduleId: "m1", reviewStatus: "approved" as const },
    ];
    expect(getModulePrStatus("m1", reviews)).toBe("pending");
  });

  it("returns needs_changes when any review needs changes and none pending", () => {
    const reviews = [
      { exerciseRepoId: "repo1", moduleId: "m1", reviewStatus: "needs_changes" as const },
      { exerciseRepoId: "repo2", moduleId: "m1", reviewStatus: "approved" as const },
    ];
    expect(getModulePrStatus("m1", reviews)).toBe("needs_changes");
  });

  it("returns approved when all reviews are approved", () => {
    const reviews = [
      { exerciseRepoId: "repo1", moduleId: "m1", reviewStatus: "approved" as const },
      { exerciseRepoId: "repo2", moduleId: "m1", reviewStatus: "approved" as const },
    ];
    expect(getModulePrStatus("m1", reviews)).toBe("approved");
  });

  it("returns reviewed when all are reviewed but not approved/needs_changes", () => {
    const reviews = [
      { exerciseRepoId: "repo1", moduleId: "m1", reviewStatus: "reviewed" as const },
    ];
    expect(getModulePrStatus("m1", reviews)).toBe("reviewed");
  });
});
