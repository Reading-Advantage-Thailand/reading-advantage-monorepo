// @vitest-environment node
/** Classroom create and delete routes, through the real controller with the model mocked. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  createClassroom: vi.fn(),
  deleteClassroom: vi.fn(),
  getAllClassrooms: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/observability/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/classes", () => ({
  SetClassroomTeachersError: class extends Error {},
  setClassroomTeachers: vi.fn(),
}));
vi.mock("@/server/models/classroomModel", () => ({
  createClassroom: mocks.createClassroom,
  deleteClassroom: mocks.deleteClassroom,
  getAllClassrooms: mocks.getAllClassrooms,
  updateClassroom: vi.fn(),
  getAllStudentsByTeacher: vi.fn(),
  getAllStudentsInSystem: vi.fn(),
  enrollStudentInClassroom: vi.fn(),
  unenrollStudentFromClassroom: vi.fn(),
  getAvailableStudentsForClassroom: vi.fn(),
  getClassroomWithStudents: vi.fn(),
  generateClassCode: vi.fn(),
  getAllStudentsByAdmin: vi.fn(),
}));

import { POST } from "../route";
import { DELETE } from "../[id]/route";

const TEACHER = { id: "t-1", role: "TEACHER", schoolId: "school-1" };
const params = (id: string) => ({ params: Promise.resolve({ id }) });

/**
 * Builds a POST request with a JSON body.
 * @param body The JSON body.
 * @returns The request.
 */
function post(body: unknown) {
  return new Request("http://x/api/classroom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const del = (id: string) => DELETE(new Request(`http://x/api/classroom/${id}`, { method: "DELETE" }) as never, params(id));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.currentUser.mockResolvedValue(TEACHER);
  mocks.createClassroom.mockResolvedValue({ id: "c-1" });
  mocks.deleteClassroom.mockResolvedValue(undefined);
});

describe("POST /api/classroom", () => {
  it("answers 401 without a user and creates nothing", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await POST(post({ name: "4A" }))).status).toBe(401);
    expect(mocks.createClassroom).not.toHaveBeenCalled();
  });

  it("answers 400 without a name", async () => {
    const res = await POST(post({ grade: "4" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Classroom name is required" });
    expect(mocks.createClassroom).not.toHaveBeenCalled();
  });

  it("creates a class as the session teacher", async () => {
    const res = await POST(post({ name: "4A", grade: "4", classCode: "ABC" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ success: true, message: "Classroom created successfully" });
    expect(mocks.createClassroom).toHaveBeenCalledWith({ name: "4A", grade: "4", classCode: "ABC", actor: TEACHER });
  });

  it("refuses a STUDENT and creates nothing", async () => {
    mocks.currentUser.mockResolvedValue({ id: "s-1", role: "STUDENT", schoolId: "school-1" });
    const res = await POST(post({ name: "4A" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Failed to create classroom" });
    expect(mocks.createClassroom).not.toHaveBeenCalled();
  });

  it("answers 400 when the model write fails", async () => {
    mocks.createClassroom.mockRejectedValue(new Error("unique"));
    expect((await POST(post({ name: "4A" }))).status).toBe(400);
  });

  it("answers 500 for a body that is not JSON", async () => {
    const bad = new Request("http://x/api/classroom", { method: "POST", body: "{" }) as never;
    expect((await POST(bad)).status).toBe(500);
  });
});

describe("DELETE /api/classroom/[id]", () => {
  it("answers 401 without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await del("c-1")).status).toBe(401);
    expect(mocks.deleteClassroom).not.toHaveBeenCalled();
  });

  it("refuses a STUDENT with 400 and deletes nothing", async () => {
    mocks.currentUser.mockResolvedValue({ id: "s-1", role: "STUDENT", schoolId: "school-1" });
    const res = await del("c-1");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Insufficient permissions to delete classroom" });
    expect(mocks.deleteClassroom).not.toHaveBeenCalled();
  });

  it("deletes a class for a teacher", async () => {
    const res = await del("c-1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mocks.deleteClassroom).toHaveBeenCalledWith("c-1", TEACHER);
  });

  it("passes the model's refusal on as a 400", async () => {
    mocks.deleteClassroom.mockResolvedValue({ success: false, error: "Classroom not found" });
    const res = await del("c-9");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Classroom not found" });
  });

  it("answers 400 when the model throws", async () => {
    mocks.deleteClassroom.mockRejectedValue(new Error("db"));
    const res = await del("c-1");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Failed to delete classroom" });
  });

  it("answers 500 when the session lookup fails", async () => {
    mocks.currentUser.mockRejectedValue(new Error("down"));
    expect((await del("c-1")).status).toBe(500);
  });
});
