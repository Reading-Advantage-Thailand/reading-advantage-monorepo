import { describe, expect, it } from "vitest";

import { safeCallbackPath, studentCallbackPath } from "../safe-callback-path";

describe("callback paths after a sign-in", () => {
  it("keeps a local path without its locale and refuses other values", () => {
    expect(safeCallbackPath("/th/teacher/classes")).toBe("/teacher/classes");
    expect(safeCallbackPath("/en")).toBe("/");
    expect(safeCallbackPath("//evil.example/x")).toBeNull();
    expect(safeCallbackPath("https://evil.example/x")).toBeNull();
    expect(safeCallbackPath("/\\evil")).toBeNull();
    expect(safeCallbackPath(null)).toBeNull();
  });

  it("keeps only student pages for a student, such as the article of a printed QR code", () => {
    expect(studentCallbackPath("/th/student/read/cmgqx8v6602p3t79btatvfjuw")).toBe("/student/read/cmgqx8v6602p3t79btatvfjuw");
    expect(studentCallbackPath("/student")).toBe("/student");
    expect(studentCallbackPath("/th/teacher/classes")).toBeNull();
    expect(studentCallbackPath("/studentx")).toBeNull();
  });
});
