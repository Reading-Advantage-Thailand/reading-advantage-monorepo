// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const writes = vi.fn();
  const reads = vi.fn();
  const chain: any = new Proxy(function () {}, {
    get: (_t, prop) => (prop === "then" ? (res: (v: unknown) => void) => res([]) : chain),
    apply: () => chain,
  });
  return {
    writes,
    reads,
    chain,
    currentUser: vi.fn(),
    setAvatarProfile: vi.fn(),
    getArticleActivity: vi.fn(),
  };
});

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser, getCurrentUser: mocks.currentUser }));
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
vi.mock("@reading-advantage/domain/primary-avatar", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setAvatarProfile: mocks.setAvatarProfile,
  grantGpForXp: vi.fn().mockResolvedValue(0),
}));
vi.mock("@/server/models/articleModel", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getArticleActivity: mocks.getArticleActivity,
}));

import { finishQuiz, retakeQuiz } from "../question";
import { updateUserActivity } from "../user";
import { fetchArticleActivity } from "../article";
import { deleteFlashcardCard, reviewCard, saveArticleToFlashcard, saveFlashcard } from "../flashcard";
import { setAvatarProfileAction } from "../avatar";
import { restartLessonAction } from "../lesson-attempts";
import { ActivityType } from "@/types/enum";

const cases: Array<[string, () => Promise<unknown>]> = [
  ["finishQuiz", () => finishQuiz("a1", { score: 3 }, ActivityType.MC_QUESTION)],
  ["retakeQuiz", () => retakeQuiz("a1", ActivityType.MC_QUESTION)],
  ["updateUserActivity", () => updateUserActivity("a1", ActivityType.ARTICLE_READ, 5)],
  ["fetchArticleActivity", () => fetchArticleActivity("a1")],
  ["saveFlashcard", () => saveFlashcard("a1", [{ vocabulary: "cat" } as never])],
  ["saveArticleToFlashcard", () => saveArticleToFlashcard("a1")],
  ["reviewCard", () => reviewCard("c1", 3 as never, 4)],
  ["deleteFlashcardCard", () => deleteFlashcardCard("c1")],
  ["setAvatarProfileAction", () => setAvatarProfileAction({} as never)],
  ["restartLessonAction", () => restartLessonAction({ articleId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" })],
];

describe("server actions refuse staff in Preview mode", () => {
  beforeEach(() => {
    mocks.writes.mockClear();
    mocks.reads.mockClear();
    mocks.setAvatarProfile.mockClear();
    mocks.getArticleActivity.mockClear();
  });

  describe.each(["TEACHER", "ADMIN", "SYSTEM", "INTERN"])("as %s", (role) => {
    it.each(cases)("%s returns the preview result and writes nothing", async (_name, call) => {
      mocks.currentUser.mockResolvedValue({ id: "u1", role, schoolId: "s1" });
      await expect(call()).resolves.toEqual({ status: "preview" });
      expect(mocks.writes).not.toHaveBeenCalled();
      expect(mocks.reads).not.toHaveBeenCalled();
      expect(mocks.setAvatarProfile).not.toHaveBeenCalled();
      expect(mocks.getArticleActivity).not.toHaveBeenCalled();
    });
  });

  it.each(cases)("%s passes the guard for a student", async (_name, call) => {
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "STUDENT", schoolId: "s1" });
    mocks.setAvatarProfile.mockResolvedValue({});
    mocks.getArticleActivity.mockResolvedValue({ success: true });
    const result = await call().catch(() => undefined);
    expect(result).not.toEqual({ status: "preview" });
  });
});
