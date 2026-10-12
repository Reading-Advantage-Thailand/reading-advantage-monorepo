// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const chain: any = new Proxy(function () {}, {
    get: (_t, prop) => (prop === "then" ? (res: (v: unknown) => void) => res([]) : chain),
    apply: () => chain,
  });
  return { writes: vi.fn(), reads: vi.fn(), chain, user: { current: null as unknown } };
});

vi.mock("@/lib/session", () => {
  const user = async () => mocks.user.current;
  return {
    currentUser: user,
    getCurrentUser: user,
    currentRole: async () => (mocks.user.current as { role?: string } | null)?.role ?? null,
    getCurrentSession: async () => (mocks.user.current ? { user: mocks.user.current, authStrength: "password" } : null),
  };
});
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    db: {
      select: (...a: unknown[]) => (mocks.reads(...a), mocks.chain),
      insert: (...a: unknown[]) => (mocks.writes("insert", ...a), mocks.chain),
      update: (...a: unknown[]) => (mocks.writes("update", ...a), mocks.chain),
      delete: (...a: unknown[]) => (mocks.writes("delete", ...a), mocks.chain),
      transaction: (...a: unknown[]) => (mocks.writes("transaction", ...a), Promise.resolve(undefined)),
    },
  };
});
vi.mock("@/lib/primary-evidence-queue", () => ({ enqueuePrimaryEvidenceJob: (...a: unknown[]) => mocks.writes("evidence", ...a) }));
vi.mock("@/server/controllers/classBookController", () => ({ recordLessonStep: (...a: unknown[]) => mocks.writes("lesson-step", ...a) }));
vi.mock("@/server/models/lessonModel", () => ({
  getArticleForLesson: vi.fn(),
  updateStandaloneLessonProgress: (...a: unknown[]) => mocks.writes("lesson-progress", ...a),
}));
vi.mock("@/server/controllers/assignmentController", () => ({
  fetchAssignmentById: vi.fn(),
  postUserLessonProgress: (...a: unknown[]) => mocks.writes("assignment-progress", ...a),
}));
vi.mock("@/server/controllers/avatarController", () => ({
  avatarState: (...a: unknown[]) => mocks.writes("avatar-state", ...a),
  buyAvatarItem: (...a: unknown[]) => mocks.writes("avatar-buy", ...a),
  wearAvatarItem: (...a: unknown[]) => mocks.writes("avatar-wear", ...a),
}));
vi.mock("@/server/controllers/questController", () => ({ postQuestHeartbeat: (...a: unknown[]) => mocks.writes("heartbeat", ...a) }));
vi.mock("@/server/controllers/voiceController", () => ({
  startVoice: (...a: unknown[]) => mocks.writes("voice-start", ...a),
  voiceConnected: (...a: unknown[]) => mocks.writes("voice-connected", ...a),
  endVoice: (...a: unknown[]) => mocks.writes("voice-end", ...a),
  studentVoiceSessions: vi.fn(),
}));
vi.mock("@/server/controllers/userController", () => ({ handleUpdateUserActivity: (...a: unknown[]) => mocks.writes("user-activity", ...a) }));
vi.mock("@reading-advantage/domain/games", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  recordGameCompletion: (...a: unknown[]) => mocks.writes("game-completion", ...a),
}));
vi.mock("@reading-advantage/domain/rpg", () => ({
  getMyRpgState: vi.fn(),
  equipMyRpgCosmetic: (...a: unknown[]) => mocks.writes("rpg-equip", ...a),
}));
vi.mock("@reading-advantage/api/routes/apk-challenges", () => ({
  createApkChallengeRunRoute: () => ({ POST: (...a: unknown[]) => (mocks.writes("challenge-run", ...a), Response.json({ ok: true })) }),
  createApkChallengeRoute: () => ({ GET: vi.fn(), POST: vi.fn() }),
}));
vi.mock("@/lib/apk/challenge-dependencies", () => ({ apkChallengeDependencies: {} }));

vi.setConfig({ testTimeout: 60_000 });

const req = (method = "POST") => new NextRequest("http://localhost/api/x", { method, body: method === "GET" ? undefined : "{}" });
const ctx = (p: Record<string, string>) => ({ params: Promise.resolve(p) });

type Case = [string, () => Promise<Response>];
const routes: Case[] = [
  ["lessons/[articleId] POST", async () => (await import("../lessons/[articleId]/route")).POST(req(), ctx({ articleId: "a" }))],
  ["assignments/[id] POST", async () => (await import("../assignments/[id]/route")).POST(req(), ctx({ id: "a" }))],
  ["v1/apk/complete POST", async () => (await import("../v1/apk/complete/route")).POST(req())],
  ["v1/apk/rpg PATCH", async () => (await import("../v1/apk/rpg/route")).PATCH(req("PATCH"))],
  ["v1/apk/challenges/runs POST", async () => (await import("../v1/apk/challenges/runs/route")).POST(req())],
  ["v1/avatar GET", async () => (await import("../v1/avatar/route")).GET()],
  ["v1/avatar/purchase POST", async () => (await import("../v1/avatar/purchase/route")).POST(req())],
  ["v1/avatar/loadout POST", async () => (await import("../v1/avatar/loadout/route")).POST(req())],
  ["v1/quest/heartbeat POST", async () => (await import("../v1/quest/heartbeat/route")).POST(req())],
  ["voice/sessions POST", async () => (await import("../voice/sessions/route")).POST(req())],
  ["voice/sessions/[id]/connected POST", async () => (await import("../voice/sessions/[sessionId]/connected/route")).POST(req(), ctx({ sessionId: "s" }))],
  ["voice/sessions/[id]/end POST", async () => (await import("../voice/sessions/[sessionId]/end/route")).POST(req(), ctx({ sessionId: "s" }))],
  ["flashcard decks sentences-for-matching POST", async () => (await import("../flashcard/decks/[deckId]/sentences-for-matching/route")).POST(req(), ctx({ deckId: "d" }))],
  ["flashcard decks sentences-for-ordering POST", async () => (await import("../flashcard/decks/[deckId]/sentences-for-ordering/route")).POST(req(), ctx({ deckId: "d" }))],
  ["flashcard decks sentences-for-cloze POST", async () => (await import("../flashcard/decks/[deckId]/sentences-for-cloze/route")).POST(req(), ctx({ deckId: "d" }))],
  ["flashcard decks words-for-ordering POST", async () => (await import("../flashcard/decks/[deckId]/words-for-ordering/route")).POST(req(), ctx({ deckId: "d" }))],
  ["flashcard cards review POST", async () => (await import("../flashcard/cards/[cardId]/review/route")).POST(req(), ctx({ cardId: "c" }))],
  ["flashcard save POST", async () => (await import("../flashcard/save/[id]/route")).POST(req(), ctx({ id: "a" }))],
  ["articles/questions POST", async () => (await import("../articles/questions/[articleId]/route")).POST(req(), ctx({ articleId: "a" }))],
  ["users/activitylog POST", async () => (await import("../users/activitylog/[id]/route")).POST(req(), ctx({ id: "u1" }))],
];

describe("student API write routes refuse staff in Preview mode", () => {
  beforeEach(() => {
    mocks.writes.mockClear();
    mocks.reads.mockClear();
  });

  describe.each(["TEACHER", "ADMIN", "SYSTEM"])("as %s", (role) => {
    it.each(routes)("%s gives 403 PREVIEW_READ_ONLY and writes nothing", async (_name, call) => {
      mocks.user.current = { id: "u1", role, schoolId: "s1" };
      const response = await call();
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: { code: "PREVIEW_READ_ONLY", message: "Preview: not saved" } });
      expect(mocks.writes).not.toHaveBeenCalled();
      expect(mocks.reads).not.toHaveBeenCalled();
    });
  });

  it.each(routes)("%s does not refuse a student with the preview code", async (_name, call) => {
    mocks.user.current = { id: "u1", role: "STUDENT", schoolId: "s1" };
    const response = await call().catch(() => null);
    const body = response ? await response.clone().json().catch(() => null) : null;
    expect(body?.error?.code).not.toBe("PREVIEW_READ_ONLY");
  });
});
