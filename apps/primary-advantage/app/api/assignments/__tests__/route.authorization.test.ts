// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  queue: [] as unknown[][],
  updates: 0,
  inserts: 0,
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser, getCurrentUser: mocks.currentUser }));
vi.mock("@/server/controllers/classBookController", () => ({ recordLessonStep: vi.fn() }));

/** Chainable Drizzle stub: each awaited chain takes the next queued row set. */
function chain() {
  const rows = mocks.queue.shift() ?? [];
  const stub: Record<string, unknown> = {};
  for (const m of ["from", "innerJoin", "leftJoin", "where", "limit", "offset", "orderBy"]) stub[m] = () => stub;
  stub.then = (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  return stub;
}
const writer = () => {
  const w: Record<string, unknown> = {};
  w.values = () => {
    mocks.inserts += 1;
    return w;
  };
  w.set = () => w;
  w.where = () => {
    mocks.updates += 1;
    return Promise.resolve([]);
  };
  w.returning = async () => [{ id: "as1" }];
  w.then = (resolve: (v: unknown) => unknown) => Promise.resolve([]).then(resolve);
  return w;
};
const fakeDb = {
  select: vi.fn(() => chain()),
  update: vi.fn(() => writer()),
  insert: vi.fn(() => writer()),
  transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({ insert: () => writer(), update: () => writer() }),
};
vi.mock("@reading-advantage/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@reading-advantage/db")>()),
  get db() {
    return fakeDb;
  },
}));

import { GET, POST } from "../route";
import { GET as GET_BY_ID, POST as POST_BY_ID } from "../[id]/route";
import { GET as GET_STUDENT } from "../../students/[id]/assignments/route";

const SCHOOL_A = "school-a";
const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const ARTICLE_ID = "22222222-2222-4222-8222-222222222222";
const ASSIGN_ID = "33333333-3333-4333-8333-333333333333";
const body = {
  classroomId: CLASS_ID,
  articleId: ARTICLE_ID,
  students: ["stu-1"],
  name: "Read it",
  description: "",
  dueDate: "2026-11-01T00:00:00.000Z",
};
const post = (b: unknown) =>
  new Request("http://localhost/api/assignments", { method: "POST", body: JSON.stringify(b) }) as NextRequest;
const get = (q = "") => new Request(`http://localhost/api/assignments${q}`) as NextRequest;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const classroom = (over: Record<string, unknown> = {}) => [{ id: "class-1", schoolId: SCHOOL_A, teacherId: "t1", ...over }];

describe("assignments routes authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queue = [];
    mocks.updates = 0;
    mocks.inserts = 0;
  });

  it("POST: 401 without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await POST(post(body))).status).toBe(401);
  });

  it("POST: 403 for a student, before any database read", async () => {
    mocks.currentUser.mockResolvedValue({ id: "stu-1", role: "STUDENT", schoolId: SCHOOL_A });
    expect((await POST(post(body))).status).toBe(403);
    expect(fakeDb.select).not.toHaveBeenCalled();
  });

  it("POST: 403 for a teacher of another class", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t2", role: "TEACHER", schoolId: SCHOOL_A });
    mocks.queue = [classroom(), []];
    expect((await POST(post(body))).status).toBe(403);
    expect(mocks.inserts).toBe(0);
  });

  it("POST: 403 for an ADMIN of another school", async () => {
    mocks.currentUser.mockResolvedValue({ id: "a1", role: "ADMIN", schoolId: "school-b" });
    mocks.queue = [classroom()];
    expect((await POST(post(body))).status).toBe(403);
    expect(mocks.inserts).toBe(0);
  });

  it("POST: 400 for a bad body, before any database read", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t1", role: "TEACHER", schoolId: SCHOOL_A });
    expect((await POST(post({ classroomId: "class-1" }))).status).toBe(400);
    expect(fakeDb.select).not.toHaveBeenCalled();
  });

  it("POST: 400 when a student is not in the class", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t1", role: "TEACHER", schoolId: SCHOOL_A });
    mocks.queue = [classroom(), []];
    expect((await POST(post(body))).status).toBe(400);
    expect(mocks.inserts).toBe(0);
  });

  it("POST: 200 for the teacher of the class", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t1", role: "TEACHER", schoolId: SCHOOL_A, name: "T" });
    mocks.queue = [classroom(), [{ studentId: "stu-1" }], [{ id: "class-1" }], [{ id: "article-1" }], []];
    expect((await POST(post(body))).status).toBe(200);
    expect(mocks.inserts).toBeGreaterThan(0);
  });

  it("POST: 200 for an ADMIN of the class school", async () => {
    mocks.currentUser.mockResolvedValue({ id: "a1", role: "ADMIN", schoolId: SCHOOL_A });
    mocks.queue = [classroom(), [{ studentId: "stu-1" }], [{ id: "class-1" }], [{ id: "article-1" }], []];
    expect((await POST(post(body))).status).toBe(200);
  });

  it("GET list: 401 without a session, 403 for a student", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await GET(get("?classroomId=class-1"))).status).toBe(401);
    mocks.currentUser.mockResolvedValue({ id: "stu-1", role: "STUDENT", schoolId: SCHOOL_A });
    expect((await GET(get("?classroomId=class-1"))).status).toBe(403);
    expect(fakeDb.select).not.toHaveBeenCalled();
  });

  it("GET list: 403 for a teacher of another class, 400 without a class or id", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t2", role: "TEACHER", schoolId: SCHOOL_A });
    mocks.queue = [classroom(), []];
    expect((await GET(get("?classroomId=class-1"))).status).toBe(403);
    expect((await GET(get(""))).status).toBe(400);
  });

  it("GET list: 200 for the teacher of the class", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t1", role: "TEACHER", schoolId: SCHOOL_A });
    mocks.queue = [classroom(), [{ value: 0 }], []];
    expect((await GET(get("?classroomId=class-1"))).status).toBe(200);
  });

  it("GET list by id: 403 for a teacher of another class", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t2", role: "TEACHER", schoolId: SCHOOL_A });
    mocks.queue = [[{ classroomId: "class-1" }], classroom(), []];
    expect((await GET(get("?id=as1"))).status).toBe(403);
  });

  it("GET one: 403 for a teacher of another class", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t2", role: "TEACHER", schoolId: SCHOOL_A });
    mocks.queue = [[{ id: "as1", classroomId: "class-1", articleId: "article-1" }], [], classroom(), [], []];
    expect((await GET_BY_ID(get(), ctx("as1"))).status).toBe(403);
  });

  it("GET one: 401 without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await GET_BY_ID(get(), ctx("as1"))).status).toBe(401);
  });

  it("[id] POST: 401 without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await POST_BY_ID(post({}), ctx("as1"))).status).toBe(401);
  });

  it("[id] POST: 400 for a bad body", async () => {
    mocks.currentUser.mockResolvedValue({ id: "stu-1", role: "STUDENT", schoolId: SCHOOL_A });
    expect((await POST_BY_ID(post({ progress: "x" }), ctx("as1"))).status).toBe(400);
  });

  it("[id] POST: 403 for a student who is not assigned", async () => {
    mocks.currentUser.mockResolvedValue({ id: "stu-9", role: "STUDENT", schoolId: SCHOOL_A });
    mocks.queue = [[]];
    const res = await POST_BY_ID(post({ articleId: ARTICLE_ID, progress: 50, timeSpent: 3 }), ctx(ASSIGN_ID));
    expect(res.status).toBe(403);
    expect(mocks.updates).toBe(0);
  });

  it("[id] POST: 200 for the assigned student", async () => {
    mocks.currentUser.mockResolvedValue({ id: "stu-1", role: "STUDENT", schoolId: SCHOOL_A });
    mocks.queue = [[{ id: "sa1", articleId: ARTICLE_ID }], [{ id: "lp1" }]];
    const res = await POST_BY_ID(post({ articleId: ARTICLE_ID, progress: 50, timeSpent: 3 }), ctx(ASSIGN_ID));
    expect(res.status).toBe(200);
  });

  it("student assignments: 403 when a student reads another student", async () => {
    mocks.currentUser.mockResolvedValue({ id: "stu-1", role: "STUDENT", schoolId: SCHOOL_A });
    expect((await GET_STUDENT(get(), ctx("stu-2"))).status).toBe(403);
    expect(fakeDb.select).not.toHaveBeenCalled();
  });

  it("student assignments: 401 without a session, 200 for the student own record", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await GET_STUDENT(get(), ctx("stu-1"))).status).toBe(401);
    mocks.currentUser.mockResolvedValue({ id: "stu-1", role: "STUDENT", schoolId: SCHOOL_A });
    mocks.queue = [[{ value: 0 }], []];
    expect((await GET_STUDENT(get(), ctx("stu-1"))).status).toBe(200);
  });

  it("student assignments: 403 for a teacher who does not teach the student", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t2", role: "TEACHER", schoolId: SCHOOL_A });
    mocks.queue = [[{ classroomId: "class-1" }], classroom(), []];
    expect((await GET_STUDENT(get(), ctx("stu-1"))).status).toBe(403);
  });
});
