import { describe, expect, it, vi } from "vitest";
import {
  issueTutorialCredential,
  reportTutorialResult,
  runTutorialStep,
  tutorialManifestSchema,
  verifyAndConsumeTutorialCredential,
  type TutorialReportStore,
  type VerifiedTutorialReport,
} from "../index.js";
import { createStorageTutorialReportQueue, enqueueTutorialReport, flushTutorialReportQueue } from "../offline.js";

const manifest = {
  schemaVersion: "activity-tutorial.v1", repositoryId: "repo-1", activityId: "activity-1",
  activityVersion: "1.0.0", graphVersion: "1.2.0", allowedFiles: ["src/game.ts"],
  allowedCommands: [{ commandId: "git.stage", profile: "git-status-porcelain" }],
  steps: [{ stepId: "step.game", order: 1, objectiveId: "objective.game", instruction: { en: "Implement the game state transition." },
    checks: [{ checkId: "file.game", kind: "file_contains", filePath: "src/game.ts", expected: "transition" }, { checkId: "git.stage", kind: "command", commandId: "git.stage", expected: "staged:src/game.ts" }],
    hints: [], reveals: [], resourceIds: ["diagram.game"], scaffoldLevel: 2 }],
} as const;
const secret = "server-secret-32-bytes-minimum-key";
const attempt = { attemptNumber: 1, submittedAt: "2026-07-10T00:01:00Z", hintsUsed: 0, revealsUsed: 0, interventionLevel: 0, evidenceConfidence: 0.9, timingMs: 1000 };

describe("tutorial repository protocol", () => {
  it("emits deterministic secret-free evidence for allowlisted checks", async () => {
    const ports = { readAllowedFile: vi.fn().mockResolvedValue("transition SECRET=value"), runAllowedCommand: vi.fn().mockResolvedValue("M  src/game.ts\ntoken=secret"), now: () => "2026-07-10T00:00:00Z" };
    const first = await runTutorialStep(manifest, "step.game", ports);
    const second = await runTutorialStep(manifest, "step.game", ports);
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).not.toContain("SECRET");
    expect(JSON.stringify(first)).not.toContain("token=secret");
    expect(first.passed).toBe(true);
  });

  it("rejects repository-authored executables and duplicate manifest identities", () => {
    const executable = structuredClone(manifest) as unknown as { allowedCommands: unknown[] };
    executable.allowedCommands = [{ commandId: "escape", executable: "node", args: ["-e", "process.exit()"] }];
    expect(tutorialManifestSchema.safeParse(executable).success).toBe(false);
    const duplicate = structuredClone(manifest);
    duplicate.steps.push(structuredClone(duplicate.steps[0]));
    expect(tutorialManifestSchema.safeParse(duplicate).success).toBe(false);
  });

  it("rejects traversal, undeclared files, commands, and unknown fields", () => {
    type MutableManifest = { allowedFiles: string[]; steps: Array<{ checks: Array<{ filePath?: string; commandId?: string; unexpected?: boolean }> }> };
    const mutations: Array<(input: MutableManifest) => void> = [
      (input) => { input.allowedFiles = ["../.env"]; },
      (input) => { input.steps[0]!.checks[0]!.filePath = ".env"; },
      (input) => { input.steps[0]!.checks[1]!.commandId = "shell.any"; },
      (input) => { input.steps[0]!.checks[0]!.unexpected = true; },
    ];
    for (const mutate of mutations) {
      const input = structuredClone(manifest) as unknown as MutableManifest; mutate(input);
      expect(tutorialManifestSchema.safeParse(input).success).toBe(false);
    }
  });

  it("binds short-lived credentials and rejects forgery, expiry, wrong steps, and replay", async () => {
    const claims = { tokenId: "token-1", sessionId: "session-1", activityId: "activity-1", repositoryId: "repo-1", activityVersion: "1.0.0", graphVersion: "1.2.0", purpose: "tutorial-report", learnerId: "learner-1", tenantKey: "school-1", allowedStepIds: ["step.game"], issuedAt: "2026-07-10T00:00:00Z", expiresAt: "2026-07-10T00:05:00Z", nonce: "nonce-1234567890abcdef" } as const;
    const token = issueTutorialCredential(claims, secret);
    const consumeOnce = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(verifyAndConsumeTutorialCredential(token, secret, "step.game", "2026-07-10T00:01:00Z", { consumeOnce })).resolves.toEqual(claims);
    await expect(verifyAndConsumeTutorialCredential(token, secret, "step.game", "2026-07-10T00:01:00Z", { consumeOnce })).rejects.toThrow("replayed");
    await expect(verifyAndConsumeTutorialCredential(`${token}x`, secret, "step.game", "2026-07-10T00:01:00Z", { consumeOnce })).rejects.toThrow("signature");
    await expect(verifyAndConsumeTutorialCredential(token, secret, "wrong", "2026-07-10T00:01:00Z", { consumeOnce })).rejects.toThrow("not authorized");
    await expect(verifyAndConsumeTutorialCredential(token, secret, "step.game", "2026-07-10T00:06:00Z", { consumeOnce })).rejects.toThrow("expired");
    await expect(verifyAndConsumeTutorialCredential(token, secret, "step.game", claims.expiresAt, { consumeOnce })).rejects.toThrow("expired");
    await expect(verifyAndConsumeTutorialCredential(token, secret, "step.game", "2026-07-09T23:59:59Z", { consumeOnce })).rejects.toThrow("not active");
    expect(() => issueTutorialCredential(claims, "short")).toThrow("at least 32 bytes");
  });

  it("ignores forged local correctness, reruns server checks, and scopes identity", async () => {
    const claims = { tokenId: "token-1", sessionId: "session-1", activityId: "activity-1", repositoryId: "repo-1", activityVersion: "1.0.0", graphVersion: "1.2.0", purpose: "tutorial-report", learnerId: "learner-1", tenantKey: "school-1", allowedStepIds: ["step.game"], issuedAt: "2026-07-10T00:00:00Z", expiresAt: "2026-07-10T00:05:00Z", nonce: "nonce-1234567890abcdef" } as const;
    const localResult = await runTutorialStep(manifest, "step.game", { readAllowedFile: async () => "transition", runAllowedCommand: async () => "passed", now: () => "2026-07-10T00:00:30Z" });
    const request = { submissionId: "submission-1", credential: issueTutorialCredential(claims, secret), repositoryStateId: "snapshot-1", localResult, attempt };
    const complete = vi.fn();
    const store: TutorialReportStore = { begin: vi.fn().mockResolvedValue({ kind: "execute", claimId: "claim-1" }), complete, fail: vi.fn() };
    const verifier = { verify: vi.fn().mockResolvedValue({ ...localResult, passed: false, checks: localResult.checks.map((check) => ({ ...check, passed: false })) }) };
    const dependencies = { secret, now: () => "2026-07-10T00:01:00Z", loadManifest: async () => tutorialManifestSchema.parse(manifest), verifier, store };

    await expect(reportTutorialResult({ learnerId: "attacker", tenantKey: "school-1" }, request, dependencies)).rejects.toThrow("identity mismatch");
    const verified = await reportTutorialResult({ learnerId: "learner-1", tenantKey: "school-1" }, request, dependencies);
    expect(verified).toMatchObject({ passed: false, sessionId: "session-1", stepId: "step.game" });
    expect(verifier.verify).toHaveBeenCalledWith(expect.anything(), "step.game", "snapshot-1", expect.objectContaining({ learnerId: "learner-1" }));
    expect(complete).toHaveBeenCalledWith("claim-1", verified);
  });

  it("returns a cached result for an identical retry without rerunning checks", async () => {
    const claims = { tokenId: "token-2", sessionId: "session-2", activityId: "activity-1", repositoryId: "repo-1", activityVersion: "1.0.0", graphVersion: "1.2.0", purpose: "tutorial-report", learnerId: "learner-1", tenantKey: "school-1", allowedStepIds: ["step.game"], issuedAt: "2026-07-10T00:00:00Z", expiresAt: "2026-07-10T00:05:00Z", nonce: "nonce-2234567890abcdef" } as const;
    const localResult = await runTutorialStep(manifest, "step.game", { readAllowedFile: async () => "transition", runAllowedCommand: async () => "passed", now: () => "2026-07-10T00:00:30Z" });
    const cached: VerifiedTutorialReport = { submissionId: "submission-2", sessionId: "session-2", activityId: "activity-1", activityVersion: "1.0.0", graphVersion: "1.2.0", repositoryId: "repo-1", learnerId: "learner-1", tenantKey: "school-1", stepId: "step.game", passed: true, checks: [{ checkId: "file.game", passed: true }, { checkId: "git.stage", passed: true }], verifiedAt: "2026-07-10T00:01:00Z", attempt };
    const verifier = { verify: vi.fn() };
    const result = await reportTutorialResult({ learnerId: "learner-1", tenantKey: "school-1" }, {
      submissionId: "submission-2", credential: issueTutorialCredential(claims, secret), repositoryStateId: "snapshot-2", localResult, attempt,
    }, {
      secret, now: () => "2026-07-10T00:01:30Z", loadManifest: async () => tutorialManifestSchema.parse(manifest), verifier,
      store: { begin: async () => ({ kind: "replay", result: cached }), complete: vi.fn(), fail: vi.fn() },
    });
    expect(result).toEqual(cached);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it("durably queues an offline report and retries it without duplicating delivery", async () => {
    const claims = { tokenId: "token-3", sessionId: "session-3", activityId: "activity-1", repositoryId: "repo-1", activityVersion: "1.0.0", graphVersion: "1.2.0", purpose: "tutorial-report", learnerId: "learner-1", tenantKey: "school-1", allowedStepIds: ["step.game"], issuedAt: "2026-07-10T00:00:00Z", expiresAt: "2026-07-10T00:05:00Z", nonce: "nonce-3234567890abcdef" } as const;
    const localResult = await runTutorialStep(manifest, "step.game", { readAllowedFile: async () => "transition", runAllowedCommand: async () => "M  src/game.ts", now: () => "2026-07-10T00:00:30Z" });
    const memory = new Map<string, string>();
    const queue = createStorageTutorialReportQueue({ getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => { memory.set(key, value); } });
    const request = { submissionId: "submission-3", credential: issueTutorialCredential(claims, secret), repositoryStateId: "snapshot-3", localResult, attempt };
    await enqueueTutorialReport(queue, "/activity/tutorial", request, "2026-07-10T00:01:00Z");
    await expect(flushTutorialReportQueue(queue, "2026-07-10T00:01:00Z", async () => { throw new Error("offline"); })).resolves.toEqual({ uploaded: [], failed: 1 });
    const response: VerifiedTutorialReport = { submissionId: "submission-3", sessionId: "session-3", activityId: "activity-1", activityVersion: "1.0.0", graphVersion: "1.2.0", repositoryId: "repo-1", learnerId: "learner-1", tenantKey: "school-1", stepId: "step.game", passed: true, checks: [{ checkId: "file.game", passed: true }, { checkId: "git.stage", passed: true }], verifiedAt: "2026-07-10T00:01:00Z", attempt };
    await expect(flushTutorialReportQueue(queue, "2026-07-10T00:01:03Z", async () => response)).resolves.toEqual({ uploaded: [response], failed: 0 });
    await expect(queue.due("2026-07-10T00:10:00Z")).resolves.toEqual([]);
  });
});
