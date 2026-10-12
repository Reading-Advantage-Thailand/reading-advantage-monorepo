// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const info = vi.fn();
vi.mock("@/lib/observability/logger", () => ({ logger: { info: (...a: unknown[]) => info(...a), warn: vi.fn(), error: vi.fn() } }));

import {
  PREVIEW_READ_ONLY,
  PreviewWriteError,
  assertStudentWriter,
  guardStudentAction,
  guardStudentRoute,
  isStudentWriter,
} from "../student-view";

describe("assertStudentWriter", () => {
  beforeEach(() => info.mockClear());

  it("lets a student write", () => {
    expect(() => assertStudentWriter({ role: "STUDENT" }, "finish_quiz")).not.toThrow();
    expect(() => assertStudentWriter({ role: "student" }, "finish_quiz")).not.toThrow();
    expect(info).not.toHaveBeenCalled();
  });

  it.each(["TEACHER", "ADMIN", "SYSTEM", "INTERN", "teacher", "", null, undefined, "SALES_REP"])(
    "refuses the role %s",
    (role) => {
      expect(() => assertStudentWriter({ role }, "finish_quiz")).toThrow(PreviewWriteError);
    },
  );

  it("refuses a missing user", () => {
    expect(() => assertStudentWriter(null, "finish_quiz")).toThrow(PreviewWriteError);
  });

  it("logs one info line with the operation and the role, and no user name", () => {
    expect(() => assertStudentWriter({ role: "TEACHER", id: "u1", name: "Ms Rose" } as never, "finish_quiz")).toThrow();
    expect(info).toHaveBeenCalledTimes(1);
    const [event, payload] = info.mock.calls[0];
    expect(event).toBe("preview_write_refused");
    expect(payload).toEqual({ operation: "finish_quiz", role: "TEACHER" });
    expect(JSON.stringify(info.mock.calls[0])).not.toContain("Ms Rose");
  });

  it("tells isStudentWriter without a log line", () => {
    expect(isStudentWriter({ role: "STUDENT" })).toBe(true);
    expect(isStudentWriter({ role: "TEACHER" })).toBe(false);
    expect(info).not.toHaveBeenCalled();
  });
});

describe("guardStudentAction", () => {
  it("returns the preview result for staff and null for a student", () => {
    expect(guardStudentAction({ role: "ADMIN" }, "save_flashcard")).toEqual({ status: "preview" });
    expect(guardStudentAction({ role: "STUDENT" }, "save_flashcard")).toBeNull();
  });
});

describe("guardStudentRoute", () => {
  it("returns 403 PREVIEW_READ_ONLY for staff, with no data", async () => {
    const response = guardStudentRoute({ role: "SYSTEM", id: "u1" } as never, "avatar_purchase");
    expect(response?.status).toBe(403);
    const body = await response!.json();
    expect(body).toEqual({ error: { code: PREVIEW_READ_ONLY, message: "Preview: not saved" } });
    expect(response!.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns null for a student", () => {
    expect(guardStudentRoute({ role: "STUDENT" }, "avatar_purchase")).toBeNull();
  });
});
