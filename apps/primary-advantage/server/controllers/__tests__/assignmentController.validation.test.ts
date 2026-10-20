// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  rows: [] as unknown[][],
  createAssignment: vi.fn(),
  updateProgress: vi.fn(),
  canManage: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => ({ id: "u1", role: "TEACHER", schoolId: "s1" }) }));
vi.mock("@/lib/observability/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock("../classBookController", () => ({ recordLessonStep: vi.fn() }));
vi.mock("../../utils/assignment-access", () => ({
  canManageClassroom: mocks.canManage,
  canReadStudentRecords: vi.fn(),
  isAssignmentManager: () => true,
}));
vi.mock("@/server/models/assignmentModel", () => ({
  default: vi.fn(),
  AssignmentForbiddenError: class extends Error {},
  getAssignments: vi.fn(),
  getStudentAssignments: vi.fn(),
  createAssignment: mocks.createAssignment,
  updateUserLessonProgress: mocks.updateProgress,
  getUserLessonProgress: vi.fn(),
  getAssignmentActivityById: vi.fn(),
}));
vi.mock("../../models/assignmentModel", () => ({
  default: vi.fn(),
  AssignmentForbiddenError: class extends Error {},
  createAssignment: mocks.createAssignment,
  getStudentAssignments: vi.fn(),
  updateUserLessonProgress: mocks.updateProgress,
  getUserLessonProgress: vi.fn(),
  getAssignmentActivityById: vi.fn(),
}));
vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  const chain = () => {
    const rows = mocks.rows.shift() ?? [];
    const c: Record<string, unknown> = {};
    for (const m of ["from", "where", "limit", "innerJoin"]) c[m] = () => c;
    c.then = (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve);
    return c;
  };
  return { ...actual, db: { select: () => chain() } };
});

import { postAssignment, postUserLessonProgress } from "../assignmentController";

const UUID = "11111111-1111-4111-8111-111111111111";
const ART = "22222222-2222-4222-8222-222222222222";
const req = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const body = (over: Record<string, unknown> = {}) => ({
  classroomId: UUID,
  articleId: ART,
  students: ["s1"],
  name: "n",
  description: "",
  dueDate: "2026-12-01",
  ...over,
});

describe("postAssignment input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rows.length = 0;
    mocks.canManage.mockResolvedValue(true);
  });

  it("returns 400 for an id that is not a uuid, before any SQL", async () => {
    const res = await postAssignment(req(body({ classroomId: "not-a-uuid" })));
    expect(res.status).toBe(400);
    const res2 = await postAssignment(req(body({ articleId: "x" })));
    expect(res2.status).toBe(400);
    expect(mocks.createAssignment).not.toHaveBeenCalled();
  });

  it("returns a generic 500 message that holds no SQL text", async () => {
    mocks.rows.push([{ studentId: "s1" }]);
    mocks.createAssignment.mockRejectedValue(new Error('Failed query: insert into "assignments" params: 1,2'));
    const res = await postAssignment(req(body()));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Internal server error" });
  });
});

describe("postUserLessonProgress article check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rows.length = 0;
  });
  const progress = { articleId: ART, progress: 10, timeSpent: 5 };

  it("returns 400 when the body article is not the article of the assignment", async () => {
    mocks.rows.push([{ id: "sa1", articleId: UUID }]);
    const res = await postUserLessonProgress(req(progress), ctx(UUID));
    expect(res.status).toBe(400);
    expect(mocks.updateProgress).not.toHaveBeenCalled();
  });

  it("saves the progress when the article matches", async () => {
    mocks.rows.push([{ id: "sa1", articleId: ART }]);
    const res = await postUserLessonProgress(req(progress), ctx(UUID));
    expect(res.status).toBe(200);
    expect(mocks.updateProgress).toHaveBeenCalledOnce();
  });

  it("returns 400 for an assignment id that is not a uuid", async () => {
    const res = await postUserLessonProgress(req(progress), ctx("zzz"));
    expect(res.status).toBe(400);
  });
});
