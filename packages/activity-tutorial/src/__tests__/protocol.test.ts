import { describe, expect, it, vi } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  issueTutorialCredential,
  createInMemoryTutorialReportStore,
  reportTutorialResult,
  runTutorialStep,
  scaffoldTutorialRepository,
  tutorialReportRequestSchema,
  uploadTutorialReport,
  tutorialManifestSchema,
  verifyAndConsumeTutorialCredential,
  type TutorialReportStore,
  type VerifiedTutorialReport,
} from "../index.js";
import { runTutorialCli } from "../cli.js";
import { createStorageTutorialReportQueue, enqueueTutorialReport, flushTutorialReportQueue } from "../offline.js";

const manifest = {
  schemaVersion: "activity-tutorial.v1", repositoryId: "repo-1", activityId: "activity-1",
  activityVersion: "1.0.0", graphVersion: "1.2.0", allowedFiles: ["src/game.ts"],
  allowedCommands: [{ commandId: "git.stage", profile: "git-status-porcelain" }],
  completionCriteria: { requiredStepIds: ["step.game"] },
  steps: [{ stepId: "step.game", order: 1, objectiveId: "objective.game", instruction: { en: "Implement the game state transition." },
    checks: [{ checkId: "file.game", kind: "file_contains", filePath: "src/game.ts", expected: "transition" }, { checkId: "git.stage", kind: "command", commandId: "git.stage", expected: "staged:src/game.ts" }],
    hints: [], reveals: [], resourceIds: ["diagram.game"], scaffoldLevel: 2 }],
} as const;
const secret = "server-secret-32-bytes-minimum-key";

describe("tutorial repository protocol", () => {
  it("scaffolds and checks a real Git repository without executing authored commands", async () => {
    const root = await mkdtemp(join(tmpdir(), "activity-tutorial-"));
    try {
      await scaffoldTutorialRepository(manifest, root, { readStarterFile: async () => "export const transition = true;\n" });
      const run = promisify(execFile);
      await run("git", ["init", "--quiet"], { cwd: root });
      await run("git", ["add", "src/game.ts"], { cwd: root });
      const outputs: string[] = [];
      await expect(runTutorialCli(["--step", "step.game"], root, (output) => outputs.push(output))).resolves.toBe(0);
      expect(JSON.parse(outputs[0] ?? "{}")).toMatchObject({ passed: true, stepId: "step.game" });
      await expect(scaffoldTutorialRepository(manifest, root, { readStarterFile: async () => "" })).rejects.toThrow("must be empty");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
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
    const unknownCompletion = structuredClone(manifest);
    unknownCompletion.completionCriteria.requiredStepIds = ["missing.step"];
    expect(tutorialManifestSchema.safeParse(unknownCompletion).success).toBe(false);
    const increasingScaffold = structuredClone(manifest);
    increasingScaffold.steps.push({ ...structuredClone(increasingScaffold.steps[0]), stepId: "step.two", order: 3, scaffoldLevel: 3 });
    increasingScaffold.completionCriteria.requiredStepIds.push("step.two");
    expect(tutorialManifestSchema.safeParse(increasingScaffold).success).toBe(false);
  });

  it("does not mistake an unstaged worktree change for a staged file", async () => {
    const result = await runTutorialStep(manifest, "step.game", { readAllowedFile: async () => "transition", runAllowedCommand: async () => " M src/game.ts", now: () => "2026-07-10T00:00:00Z" });
    expect(result.passed).toBe(false);
    expect(result.checks.find(({ checkId }) => checkId === "git.stage")).toMatchObject({ passed: false });
  });

  it("rejects comment-only TypeScript object-shape matches without executing repository code", async () => {
    const objectManifest = structuredClone(manifest);
    objectManifest.steps[0]!.checks = [{ checkId: "manifest.shape", kind: "typescript_object_shape", filePath: "src/game.ts", exportName: "cartridgeManifest", requiredProperties: ["id", "title", "capabilities"], propertyContracts: [{ property: "id", kind: "string", format: "nonempty" }, { property: "title", kind: "string", format: "nonempty" }, { property: "capabilities", kind: "string_array", minItems: 1 }] }] as never;
    const commentOnly = "export const cartridgeManifest = { cartridgeId: 'starter' }; // id title capabilities";
    await expect(runTutorialStep(objectManifest, "step.game", { readAllowedFile: async () => commentOnly, runAllowedCommand: async () => "", now: () => "2026-07-10T00:00:00Z" })).resolves.toMatchObject({ passed: false, checks: [{ checkId: "manifest.shape", passed: false }] });
    const valid = "export const cartridgeManifest = { id: 'game', title: 'Game', capabilities: ['keyboard'] } as const;";
    await expect(runTutorialStep(objectManifest, "step.game", { readAllowedFile: async () => valid, runAllowedCommand: async () => "", now: () => "2026-07-10T00:00:00Z" })).resolves.toMatchObject({ passed: true, checks: [{ checkId: "manifest.shape", passed: true }] });
    const wrongTypes = "export const cartridgeManifest = { id: true, title: false, capabilities: { keyboard: true } };";
    await expect(runTutorialStep(objectManifest, "step.game", { readAllowedFile: async () => wrongTypes, runAllowedCommand: async () => "", now: () => "2026-07-10T00:00:00Z" })).resolves.toMatchObject({ passed: false, checks: [{ checkId: "manifest.shape", passed: false }] });
    const invalidSyntax = "export const cartridgeManifest = { id: 'game', title: 'Game', capabilities: ['keyboard']";
    await expect(runTutorialStep(objectManifest, "step.game", { readAllowedFile: async () => invalidSyntax, runAllowedCommand: async () => "", now: () => "2026-07-10T00:00:00Z" })).resolves.toMatchObject({ passed: false, checks: [{ checkId: "manifest.shape", passed: false }] });
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
    const claims = { tokenId: "token-1", sessionId: "session-1", submissionId: "submission-1", activityId: "activity-1", repositoryId: "repo-1", repositoryStateId: "snapshot-1", repositoryCapturedAt: "2026-07-10T00:00:00Z", activityVersion: "1.0.0", graphVersion: "1.2.0", purpose: "tutorial-report", learnerId: "learner-1", tenantKey: "school-1", allowedStepIds: ["step.game"], issuedAt: "2026-07-10T00:00:00Z", expiresAt: "2026-07-10T00:05:00Z", nonce: "nonce-1234567890abcdef" } as const;
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
    const claims = { tokenId: "token-1", sessionId: "session-1", submissionId: "submission-1", activityId: "activity-1", repositoryId: "repo-1", repositoryStateId: "snapshot-1", repositoryCapturedAt: "2026-07-10T00:00:00Z", activityVersion: "1.0.0", graphVersion: "1.2.0", purpose: "tutorial-report", learnerId: "learner-1", tenantKey: "school-1", allowedStepIds: ["step.game"], issuedAt: "2026-07-10T00:00:00Z", expiresAt: "2026-07-10T00:05:00Z", nonce: "nonce-1234567890abcdef" } as const;
    const localResult = await runTutorialStep(manifest, "step.game", { readAllowedFile: async () => "transition", runAllowedCommand: async () => "passed", now: () => "2026-07-10T00:00:30Z" });
    const request = { submissionId: "submission-1", credential: issueTutorialCredential(claims, secret), repositoryStateId: "snapshot-1", localResult };
    const complete = vi.fn();
    const store: TutorialReportStore = { begin: vi.fn().mockResolvedValue({ kind: "execute", claimId: "claim-1" }), complete, fail: vi.fn() };
    const verifier = { verify: vi.fn().mockResolvedValue({ ...localResult, passed: false, checks: localResult.checks.map((check) => ({ ...check, passed: false })) }) };
    const dependencies = { secret, now: () => "2026-07-10T00:01:00Z", loadManifest: async () => tutorialManifestSchema.parse(manifest), verifier, store };

    await expect(reportTutorialResult({ learnerId: "attacker", tenantKey: "school-1" }, request, dependencies)).rejects.toThrow("identity mismatch");
    const verified = await reportTutorialResult({ learnerId: "learner-1", tenantKey: "school-1" }, request, dependencies);
    expect(verified).toMatchObject({ passed: false, sessionId: "session-1", stepId: "step.game" });
    expect(verifier.verify).toHaveBeenCalledWith(expect.anything(), "step.game", "snapshot-1", expect.objectContaining({ learnerId: "learner-1" }));
    expect(complete).toHaveBeenCalledWith("claim-1", verified);
    await expect(reportTutorialResult({ learnerId: "learner-1", tenantKey: "school-1" }, request, { ...dependencies, store: { begin: async () => ({ kind: "conflict" }), complete: vi.fn(), fail: vi.fn() } })).rejects.toThrow("replay conflict");
    await expect(reportTutorialResult({ learnerId: "learner-1", tenantKey: "school-1" }, request, { ...dependencies, store: { begin: async () => ({ kind: "busy", retryAt: "2026-07-10T00:02:00Z" }), complete: vi.fn(), fail: vi.fn() } })).rejects.toThrow("already processing");
    const fail = vi.fn();
    await expect(reportTutorialResult({ learnerId: "learner-1", tenantKey: "school-1" }, request, { ...dependencies, verifier: { verify: async () => ({ ...localResult, passed: true, checks: [...localResult.checks].reverse() }) }, store: { begin: async () => ({ kind: "execute", claimId: "claim-bad" }), complete: vi.fn(), fail } })).rejects.toThrow("mismatched tutorial checks");
    expect(fail).toHaveBeenCalledWith("claim-bad", expect.any(String), expect.stringContaining("mismatched"));
  });

  it("returns a cached result for an identical retry without rerunning checks", async () => {
    const claims = { tokenId: "token-2", sessionId: "session-2", submissionId: "submission-2", activityId: "activity-1", repositoryId: "repo-1", repositoryStateId: "snapshot-2", repositoryCapturedAt: "2026-07-10T00:00:00Z", activityVersion: "1.0.0", graphVersion: "1.2.0", purpose: "tutorial-report", learnerId: "learner-1", tenantKey: "school-1", allowedStepIds: ["step.game"], issuedAt: "2026-07-10T00:00:00Z", expiresAt: "2026-07-10T00:05:00Z", nonce: "nonce-2234567890abcdef" } as const;
    const localResult = await runTutorialStep(manifest, "step.game", { readAllowedFile: async () => "transition", runAllowedCommand: async () => "passed", now: () => "2026-07-10T00:00:30Z" });
    const cached: VerifiedTutorialReport = { submissionId: "submission-2", sessionId: "session-2", activityId: "activity-1", activityVersion: "1.0.0", graphVersion: "1.2.0", repositoryId: "repo-1", learnerId: "learner-1", tenantKey: "school-1", stepId: "step.game", passed: true, checks: [{ checkId: "file.game", passed: true }, { checkId: "git.stage", passed: true }], verifiedAt: "2026-07-10T00:01:00Z" };
    const verifier = { verify: vi.fn() };
    const result = await reportTutorialResult({ learnerId: "learner-1", tenantKey: "school-1" }, {
      submissionId: "submission-2", credential: issueTutorialCredential(claims, secret), repositoryStateId: "snapshot-2", localResult,
    }, {
      secret, now: () => "2026-07-10T00:06:00Z", loadManifest: async () => tutorialManifestSchema.parse(manifest), verifier,
      store: { begin: async () => ({ kind: "replay", result: cached }), complete: vi.fn(), fail: vi.fn() },
    });
    expect(result).toEqual(cached);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it("fences in-memory claims across busy, failure, retry, replay, and conflict paths", async () => {
    let now = "2026-07-10T00:00:00Z";
    const store = createInMemoryTutorialReportStore(() => now);
    const input = { scopedKey: "school\u0000learner\u0000session\u0000submission", nonce: "nonce-7234567890abcdef", requestDigest: "digest-1", expiresAt: "2026-07-10T00:10:00Z", leaseUntil: "2026-07-10T00:01:00Z" };
    const first = await store.begin(input);
    expect(first).toMatchObject({ kind: "execute" });
    await expect(store.begin(input)).resolves.toMatchObject({ kind: "busy" });
    if (first.kind !== "execute") throw new Error("Expected executable claim");
    await store.fail(first.claimId, "2026-07-10T00:00:30Z", "temporary");
    now = "2026-07-10T00:00:31Z";
    const retry = await store.begin({ ...input, nonce: "nonce-8234567890abcdef" });
    if (retry.kind !== "execute") throw new Error("Expected retry claim");
    const result: VerifiedTutorialReport = { submissionId: "submission", sessionId: "session", activityId: "activity-1", activityVersion: "1.0.0", graphVersion: "1.2.0", repositoryId: "repo-1", learnerId: "learner", tenantKey: "school", stepId: "step.game", passed: true, checks: [{ checkId: "file.game", passed: true }, { checkId: "git.stage", passed: true }], verifiedAt: now };
    await store.complete(retry.claimId, result);
    await expect(store.begin({ ...input, nonce: "nonce-9234567890abcdef" })).resolves.toEqual({ kind: "replay", result });
    await expect(store.begin({ ...input, requestDigest: "changed" })).resolves.toEqual({ kind: "conflict" });
    await expect(store.begin({ ...input, scopedKey: "school\u0000other\u0000session\u0000submission" })).resolves.toEqual({ kind: "conflict" });
    await expect(store.complete("missing", result)).rejects.toThrow("Unknown");
    await expect(store.fail("missing", now, "error")).rejects.toThrow("Unknown");
  });

  it("validates upload requests and server responses at the network boundary", async () => {
    const claims = { tokenId: "token-7", sessionId: "session-7", submissionId: "submission-7", activityId: "activity-1", repositoryId: "repo-1", repositoryStateId: "snapshot-7", repositoryCapturedAt: "2026-07-10T00:00:00Z", activityVersion: "1.0.0", graphVersion: "1.2.0", purpose: "tutorial-report", learnerId: "learner-1", tenantKey: "school-1", allowedStepIds: ["step.game"], issuedAt: "2026-07-10T00:00:00Z", expiresAt: "2026-07-10T00:05:00Z", nonce: "nonce-a234567890abcdef" } as const;
    const localResult = await runTutorialStep(manifest, "step.game", { readAllowedFile: async () => "transition", runAllowedCommand: async () => "M  src/game.ts", now: () => "2026-07-10T00:00:30Z" });
    const request = { submissionId: "submission-7", credential: issueTutorialCredential(claims, secret), repositoryStateId: "snapshot-7", localResult };
    const response: VerifiedTutorialReport = { submissionId: "submission-7", sessionId: "session-7", activityId: "activity-1", activityVersion: "1.0.0", graphVersion: "1.2.0", repositoryId: "repo-1", learnerId: "learner-1", tenantKey: "school-1", stepId: "step.game", passed: true, checks: [{ checkId: "file.game", passed: true }, { checkId: "git.stage", passed: true }], verifiedAt: "2026-07-10T00:01:00Z" };
    await expect(uploadTutorialReport("/activity/tutorial", request, async (endpoint, body) => endpoint === "/activity/tutorial" && tutorialReportRequestSchema.parse(body) ? response : null)).resolves.toEqual(response);
    await expect(uploadTutorialReport("/activity/tutorial", request, async () => ({ forged: true }))).rejects.toThrow();
  });

  it("durably queues an offline report and retries it without duplicating delivery", async () => {
    const claims = { tokenId: "token-3", sessionId: "session-3", submissionId: "submission-3", activityId: "activity-1", repositoryId: "repo-1", repositoryStateId: "snapshot-3", repositoryCapturedAt: "2026-07-10T00:00:00Z", activityVersion: "1.0.0", graphVersion: "1.2.0", purpose: "tutorial-report", learnerId: "learner-1", tenantKey: "school-1", allowedStepIds: ["step.game"], issuedAt: "2026-07-10T00:00:00Z", expiresAt: "2026-07-10T00:05:00Z", nonce: "nonce-3234567890abcdef" } as const;
    const localResult = await runTutorialStep(manifest, "step.game", { readAllowedFile: async () => "transition", runAllowedCommand: async () => "M  src/game.ts", now: () => "2026-07-10T00:00:30Z" });
    const memory = new Map<string, string>();
    const queue = createStorageTutorialReportQueue({ getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => { memory.set(key, value); } });
    const request = { submissionId: "submission-3", credential: issueTutorialCredential(claims, secret), repositoryStateId: "snapshot-3", localResult };
    await enqueueTutorialReport(queue, "/activity/tutorial", request, "2026-07-10T00:01:00Z");
    await expect(flushTutorialReportQueue(queue, "2026-07-10T00:01:00Z", async () => { throw new Error("offline"); })).resolves.toEqual({ uploaded: [], failed: 1, expired: 0 });
    const response: VerifiedTutorialReport = { submissionId: "submission-3", sessionId: "session-3", activityId: "activity-1", activityVersion: "1.0.0", graphVersion: "1.2.0", repositoryId: "repo-1", learnerId: "learner-1", tenantKey: "school-1", stepId: "step.game", passed: true, checks: [{ checkId: "file.game", passed: true }, { checkId: "git.stage", passed: true }], verifiedAt: "2026-07-10T00:01:00Z" };
    await expect(flushTutorialReportQueue(queue, "2026-07-10T00:01:03Z", async () => response)).resolves.toEqual({ uploaded: [response], failed: 0, expired: 0 });
    await expect(queue.due("2026-07-10T00:10:00Z")).resolves.toEqual([]);
  });

  it("discards an expired queued credential or replaces it through an authenticated refresh", async () => {
    const claims = { tokenId: "token-4", sessionId: "session-4", submissionId: "submission-4", activityId: "activity-1", repositoryId: "repo-1", repositoryStateId: "snapshot-4", repositoryCapturedAt: "2026-07-10T00:00:00Z", activityVersion: "1.0.0", graphVersion: "1.2.0", purpose: "tutorial-report", learnerId: "learner-1", tenantKey: "school-1", allowedStepIds: ["step.game"], issuedAt: "2026-07-10T00:00:00Z", expiresAt: "2026-07-10T00:01:00Z", nonce: "nonce-4234567890abcdef" } as const;
    const localResult = await runTutorialStep(manifest, "step.game", { readAllowedFile: async () => "transition", runAllowedCommand: async () => "M  src/game.ts", now: () => "2026-07-10T00:00:30Z" });
    const memory = new Map<string, string>();
    const queue = createStorageTutorialReportQueue({ getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => { memory.set(key, value); } });
    const request = { submissionId: "submission-4", credential: issueTutorialCredential(claims, secret), repositoryStateId: "snapshot-4", localResult };
    await enqueueTutorialReport(queue, "/activity/tutorial", request, "2026-07-10T00:00:30Z");
    await expect(flushTutorialReportQueue(queue, "2026-07-10T00:01:00Z", vi.fn())).resolves.toEqual({ uploaded: [], failed: 0, expired: 1 });
    await expect(queue.due("2026-07-10T01:00:00Z")).resolves.toEqual([]);
  });

  it("refreshes an expired queued credential without changing submission idempotency", async () => {
    const expiredClaims = { tokenId: "token-5", sessionId: "session-5", submissionId: "submission-5", activityId: "activity-1", repositoryId: "repo-1", repositoryStateId: "snapshot-5", repositoryCapturedAt: "2026-07-10T00:00:00Z", activityVersion: "1.0.0", graphVersion: "1.2.0", purpose: "tutorial-report", learnerId: "learner-1", tenantKey: "school-1", allowedStepIds: ["step.game"], issuedAt: "2026-07-10T00:00:00Z", expiresAt: "2026-07-10T00:01:00Z", nonce: "nonce-5234567890abcdef" } as const;
    const refreshedClaims = { ...expiredClaims, tokenId: "token-6", issuedAt: "2026-07-10T00:01:00Z", expiresAt: "2026-07-10T00:06:00Z", nonce: "nonce-6234567890abcdef" } as const;
    const localResult = await runTutorialStep(manifest, "step.game", { readAllowedFile: async () => "transition", runAllowedCommand: async () => "M  src/game.ts", now: () => "2026-07-10T00:00:30Z" });
    const memory = new Map<string, string>();
    const queue = createStorageTutorialReportQueue({ getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => { memory.set(key, value); } });
    const request = { submissionId: "submission-5", credential: issueTutorialCredential(expiredClaims, secret), repositoryStateId: "snapshot-5", localResult };
    const refreshed = { ...request, credential: issueTutorialCredential(refreshedClaims, secret) };
    const response: VerifiedTutorialReport = { submissionId: "submission-5", sessionId: "session-5", activityId: "activity-1", activityVersion: "1.0.0", graphVersion: "1.2.0", repositoryId: "repo-1", learnerId: "learner-1", tenantKey: "school-1", stepId: "step.game", passed: true, checks: [{ checkId: "file.game", passed: true }, { checkId: "git.stage", passed: true }], verifiedAt: "2026-07-10T00:01:00Z" };
    await enqueueTutorialReport(queue, "/activity/tutorial", request, "2026-07-10T00:00:30Z");
    const send = vi.fn().mockResolvedValue(response);
    await expect(flushTutorialReportQueue(queue, "2026-07-10T00:01:00Z", send, async () => refreshed)).resolves.toEqual({ uploaded: [response], failed: 0, expired: 0 });
    expect(send).toHaveBeenCalledWith("/activity/tutorial", expect.objectContaining({ submissionId: "submission-5", credential: refreshed.credential }));
    await expect(queue.due("2026-07-10T01:00:00Z")).resolves.toEqual([]);
  });
});
