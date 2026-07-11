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

const manifest = {
  schemaVersion: "activity-tutorial.v1", repositoryId: "repo-1", activityId: "activity-1",
  activityVersion: "1.0.0", graphVersion: "1.2.0", allowedFiles: ["src/game.ts"],
  allowedCommands: [{ commandId: "test.game", executable: "pnpm", args: ["test", "--", "game"] }],
  steps: [{ stepId: "step.game", order: 1, objectiveId: "objective.game", instruction: { en: "Implement the game state transition." },
    checks: [{ checkId: "file.game", kind: "file_contains", filePath: "src/game.ts", expected: "transition" }, { checkId: "test.game", kind: "command", commandId: "test.game", expected: "passed" }],
    hints: [], reveals: [], resourceIds: ["diagram.game"], scaffoldLevel: 2 }],
} as const;

describe("tutorial repository protocol", () => {
  it("emits deterministic secret-free evidence for allowlisted checks", async () => {
    const ports = { readAllowedFile: vi.fn().mockResolvedValue("transition SECRET=value"), runAllowedCommand: vi.fn().mockResolvedValue("passed token=secret"), now: () => "2026-07-10T00:00:00Z" };
    const first = await runTutorialStep(manifest, "step.game", ports);
    const second = await runTutorialStep(manifest, "step.game", ports);
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).not.toContain("SECRET");
    expect(JSON.stringify(first)).not.toContain("token=secret");
    expect(first.passed).toBe(true);
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
    const claims = { tokenId: "token-1", sessionId: "session-1", activityId: "activity-1", learnerId: "learner-1", tenantKey: "school-1", allowedStepIds: ["step.game"], issuedAt: "2026-07-10T00:00:00Z", expiresAt: "2026-07-10T00:05:00Z", nonce: "nonce-1234567890abcdef" };
    const token = issueTutorialCredential(claims, "server-secret");
    const consumeOnce = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(verifyAndConsumeTutorialCredential(token, "server-secret", "step.game", "2026-07-10T00:01:00Z", { consumeOnce })).resolves.toEqual(claims);
    await expect(verifyAndConsumeTutorialCredential(token, "server-secret", "step.game", "2026-07-10T00:01:00Z", { consumeOnce })).rejects.toThrow("replayed");
    await expect(verifyAndConsumeTutorialCredential(`${token}x`, "server-secret", "step.game", "2026-07-10T00:01:00Z", { consumeOnce })).rejects.toThrow("signature");
    await expect(verifyAndConsumeTutorialCredential(token, "server-secret", "wrong", "2026-07-10T00:01:00Z", { consumeOnce })).rejects.toThrow("not authorized");
    await expect(verifyAndConsumeTutorialCredential(token, "server-secret", "step.game", "2026-07-10T00:06:00Z", { consumeOnce })).rejects.toThrow("expired");
    await expect(verifyAndConsumeTutorialCredential(token, "server-secret", "step.game", claims.expiresAt, { consumeOnce })).rejects.toThrow("expired");
    await expect(verifyAndConsumeTutorialCredential(token, "server-secret", "step.game", "2026-07-09T23:59:59Z", { consumeOnce })).rejects.toThrow("not active");
  });

  it("ignores forged local correctness, reruns server checks, and scopes identity", async () => {
    const claims = { tokenId: "token-1", sessionId: "session-1", activityId: "activity-1", learnerId: "learner-1", tenantKey: "school-1", allowedStepIds: ["step.game"], issuedAt: "2026-07-10T00:00:00Z", expiresAt: "2026-07-10T00:05:00Z", nonce: "nonce-1234567890abcdef" };
    const localResult = await runTutorialStep(manifest, "step.game", { readAllowedFile: async () => "transition", runAllowedCommand: async () => "passed", now: () => "2026-07-10T00:00:30Z" });
    const request = { submissionId: "submission-1", credential: issueTutorialCredential(claims, "server-secret"), repositoryStateId: "snapshot-1", localResult };
    const complete = vi.fn();
    const store: TutorialReportStore = { begin: vi.fn().mockResolvedValue({ kind: "execute" }), complete };
    const verifier = { verify: vi.fn().mockResolvedValue({ ...localResult, passed: false, checks: localResult.checks.map((check) => ({ ...check, passed: false })) }) };
    const dependencies = { secret: "server-secret", now: () => "2026-07-10T00:01:00Z", loadManifest: async () => tutorialManifestSchema.parse(manifest), verifier, store };

    await expect(reportTutorialResult({ learnerId: "attacker", tenantKey: "school-1" }, request, dependencies)).rejects.toThrow("identity mismatch");
    const verified = await reportTutorialResult({ learnerId: "learner-1", tenantKey: "school-1" }, request, dependencies);
    expect(verified).toMatchObject({ passed: false, sessionId: "session-1", stepId: "step.game" });
    expect(verifier.verify).toHaveBeenCalledWith(expect.anything(), "step.game", "snapshot-1", expect.objectContaining({ learnerId: "learner-1" }));
    expect(complete).toHaveBeenCalledWith("submission-1", verified);
  });

  it("returns a cached result for an identical retry without rerunning checks", async () => {
    const claims = { tokenId: "token-2", sessionId: "session-2", activityId: "activity-1", learnerId: "learner-1", tenantKey: "school-1", allowedStepIds: ["step.game"], issuedAt: "2026-07-10T00:00:00Z", expiresAt: "2026-07-10T00:05:00Z", nonce: "nonce-2234567890abcdef" };
    const localResult = await runTutorialStep(manifest, "step.game", { readAllowedFile: async () => "transition", runAllowedCommand: async () => "passed", now: () => "2026-07-10T00:00:30Z" });
    const cached: VerifiedTutorialReport = { submissionId: "submission-2", sessionId: "session-2", activityId: "activity-1", stepId: "step.game", passed: true, checks: [{ checkId: "file.game", passed: true }, { checkId: "test.game", passed: true }], verifiedAt: "2026-07-10T00:01:00Z" };
    const verifier = { verify: vi.fn() };
    const result = await reportTutorialResult({ learnerId: "learner-1", tenantKey: "school-1" }, {
      submissionId: "submission-2", credential: issueTutorialCredential(claims, "server-secret"), repositoryStateId: "snapshot-2", localResult,
    }, {
      secret: "server-secret", now: () => "2026-07-10T00:01:30Z", loadManifest: async () => tutorialManifestSchema.parse(manifest), verifier,
      store: { begin: async () => ({ kind: "replay", result: cached }), complete: vi.fn() },
    });
    expect(result).toEqual(cached);
    expect(verifier.verify).not.toHaveBeenCalled();
  });
});
