import { describe, expect, it, vi } from "vitest";
import { captureRegisteredTutorialRepository, type TutorialCapturePorts } from "../tutorial-repository-capture";

const input = { tenantKey: "codecamp", learnerId: "learner-1", sessionId: "00000000-0000-4000-8000-000000000001", repositoryId: "repo.apk.guided", allowedFiles: ["src/cartridge.ts", "src/game-state.ts"] };

function ports(overrides: Partial<TutorialCapturePorts> = {}): TutorialCapturePorts {
  return {
    getGithubUsername: vi.fn().mockResolvedValue("learner-one"),
    clone: vi.fn().mockResolvedValue({ checkoutRoot: "/checkout", cleanup: vi.fn() }),
    readFixtureFile: vi.fn().mockImplementation(async (_root, path) => `content:${path}`),
    gitStatus: vi.fn().mockResolvedValue(""), now: () => "2026-07-11T00:00:00Z", ...overrides,
  };
}

describe("tutorial repository capture worker", () => {
  it("derives the fork URL and captures only the authored allowlist", async () => {
    const adapter = ports();
    await expect(captureRegisteredTutorialRepository(input, adapter)).resolves.toEqual({ files: { "src/cartridge.ts": "content:src/cartridge.ts", "src/game-state.ts": "content:src/game-state.ts" }, gitStatus: "", capturedAt: "2026-07-11T00:00:00.000Z" });
    expect(adapter.clone).toHaveBeenCalledWith("https://github.com/learner-one/reading-advantage-monorepo.git");
  });

  it("rejects client path expansion and unregistered identities", async () => {
    await expect(captureRegisteredTutorialRepository({ ...input, allowedFiles: [...input.allowedFiles, ".env"] }, ports())).rejects.toThrow("allowlist mismatch");
    await expect(captureRegisteredTutorialRepository(input, ports({ getGithubUsername: vi.fn().mockResolvedValue("bad/name") }))).rejects.toThrow("not registered");
  });
});
