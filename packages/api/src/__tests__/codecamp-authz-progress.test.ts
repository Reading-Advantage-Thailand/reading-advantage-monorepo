/**
 * Finding 2 of `authz-codecamp-report.md`: `codecamp.updateProgress` must
 * not let a learner write their own completed status or score.
 *
 * The real router and domain run; only the database is a fake.
 */
import { describe, it, expect, vi } from "vitest";
import { createFakeDb, learnerContext, LESSON_ID, MODULE_ID } from "./codecamp-authz-fakes.js";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { codecampRouter } from "../routers/codecamp.js";

vi.mock("@reading-advantage/ai", () => ({
  getAIClient: vi.fn(() => ({ generateObject: vi.fn(), generateImage: vi.fn(), generateText: vi.fn() })),
  createAIClient: vi.fn(() => ({ generateObject: vi.fn(), generateImage: vi.fn(), generateText: vi.fn() })),
}));

const t = initTRPC.create({ transformer: superjson });
const appRouter = t.router({ codecamp: codecampRouter });

/**
 * Creates a tRPC caller signed in as a learner.
 * @param tenantDb The fake tenant DB for this test.
 * @returns A caller for the codecamp router.
 */
function learnerCaller(tenantDb: unknown) {
  return t.createCallerFactory(appRouter)(learnerContext(tenantDb));
}

describe("finding 2: codecamp.updateProgress does not let learners grade themselves", () => {
  const lessonRow = { id: LESSON_ID, moduleId: MODULE_ID, type: "theory" };

  it("rejects status completed from the client", async () => {
    const { tenantDb, inserts } = createFakeDb({ codecamp_lessons: [lessonRow] });

    await expect(
      learnerCaller(tenantDb).codecamp.updateProgress({ lessonId: LESSON_ID, status: "completed" } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(inserts, "no progress row written").toHaveLength(0);
  });

  it("rejects a client score", async () => {
    const { tenantDb, inserts } = createFakeDb({ codecamp_lessons: [lessonRow] });

    await expect(
      learnerCaller(tenantDb).codecamp.updateProgress({ lessonId: LESSON_ID, status: "in_progress", score: 100 } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(inserts, "no progress row written").toHaveLength(0);
  });

  it("still records in_progress with no client score", async () => {
    const { tenantDb, inserts } = createFakeDb({ codecamp_lessons: [lessonRow] });

    const result = await learnerCaller(tenantDb).codecamp.updateProgress({ lessonId: LESSON_ID, status: "in_progress" });

    expect(result.status).toBe("in_progress");
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.values.status).toBe("in_progress");
    expect(inserts[0]?.values.score).toBe(0);
  });
});
