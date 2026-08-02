import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const enabled = vi.fn(); const session = vi.fn(); const tenantDb = vi.fn(); const deps = vi.fn(); const issue = vi.fn(); const attest = vi.fn(); const complete = vi.fn();
vi.mock("@/lib/dragon-rider-host-proof-config", () => ({ isDragonRiderHostProofEnabled: () => enabled() }));
vi.mock("@/lib/session", () => ({ getCurrentUser: () => session() }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: (...args: unknown[]) => tenantDb(...args) }));
vi.mock("@reading-advantage/domain/games", () => ({ createDragonRiderHostProofAttemptDependencies: (...args: unknown[]) => deps(...args), issueDragonRiderHostProofAttempt: (...args: unknown[]) => issue(...args), attestDragonRiderHostProofAction: (...args: unknown[]) => attest(...args), completeDragonRiderHostProofAttempt: (...args: unknown[]) => complete(...args) }));
import { POST as issuePOST } from "../../../app/api/host-proof/dragon-rider/attempts/route";
import { POST as actionPOST } from "../../../app/api/host-proof/dragon-rider/attempts/actions/route";
import { POST as completionPOST } from "../../../app/api/host-proof/dragon-rider/completions/route";

const user = { id: "u", username: "u", name: "U", role: "STUDENT", schoolId: "s", xp: 0, level: 1, cefrLevel: "A1" }; const id = "11111111-1111-4111-8111-111111111111";
/** Creates an isolated Dragon Rider JSON request. */
function request(body: unknown) { return new NextRequest("http://localhost/api/host-proof/dragon-rider", { method: "POST", body: JSON.stringify(body) }); }
describe("Primary Dragon Rider host-proof routes", () => {
  beforeEach(() => { vi.clearAllMocks(); enabled.mockReturnValue(true); session.mockResolvedValue(user); tenantDb.mockReturnValue({}); deps.mockReturnValue({}); process.env.HOST_PROOF_ATTEMPT_SECRET = "a".repeat(32); });
  it("fails closed for disabled, unauthenticated, and tenantless sessions", async () => { enabled.mockReturnValue(false); expect((await issuePOST(request({}))).status).toBe(404); enabled.mockReturnValue(true); session.mockResolvedValueOnce(null); expect((await issuePOST(request({ gameType: "dragon-rider", difficulty: "easy" }))).status).toBe(401); session.mockResolvedValueOnce({ ...user, schoolId: null }); expect((await issuePOST(request({ gameType: "dragon-rider", difficulty: "easy" }))).status).toBe(403); });
  it("rejects server-owned values and malformed signed evidence before calling title-local adapters", async () => { expect((await issuePOST(request({ gameType: "dragon-rider", difficulty: "easy", score: 1 }))).status).toBe(400); expect((await actionPOST(request({ attemptId: id, credential: "x", action: { sequence: 1, kind: "choose-gate", round: 1, gate: "left" }, serverElapsedMs: 1, input: [], seed: "x", xp: 1, victory: true }))).status).toBe(400); expect((await completionPOST(request({ attemptId: id, credential: "x", checkpoints: [], score: 1, victory: true }))).status).toBe(400); attest.mockRejectedValue(new Error("tampered credential checkpoint")); expect((await actionPOST(request({ attemptId: id, credential: "x", action: { sequence: 1, kind: "choose-gate", round: 1, gate: "left" } }))).status).toBe(400); expect(attest).toHaveBeenCalled(); });
  it("rejects former terminal actions before the title-local adapter", async () => {
    expect((await actionPOST(request({ attemptId: id, credential: "x", action: { sequence: 1, kind: "enter-boss" } }))).status).toBe(400);
    expect((await actionPOST(request({ attemptId: id, credential: "x", action: { sequence: 1, kind: "defeat-boss" } }))).status).toBe(400);
    expect(attest).not.toHaveBeenCalled();
  });
  it("uses only title-local adapters and maps unexpected failures to 5xx", async () => { issue.mockResolvedValue({ attemptId: id }); expect((await issuePOST(request({ gameType: "dragon-rider", difficulty: "easy" }))).status).toBe(201); expect(issue).toHaveBeenCalledWith({ userId: "u", schoolId: "s" }, { gameType: "dragon-rider", difficulty: "easy" }, {}); complete.mockRejectedValue(new Error("database down")); expect((await completionPOST(request({ attemptId: id, credential: "x" }))).status).toBe(500); });
});
