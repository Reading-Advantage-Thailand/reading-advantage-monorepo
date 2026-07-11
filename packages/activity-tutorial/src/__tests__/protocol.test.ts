import { describe, expect, it, vi } from "vitest";
import { issueTutorialCredential, runTutorialStep, tutorialManifestSchema, verifyAndConsumeTutorialCredential } from "../index.js";

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
  });
});
