import { describe, expect, it } from "vitest";

import { bookCallbackPath, safeCallbackPath, studentCallbackPath } from "../safe-callback-path";

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

  it("keeps a QR book lesson path, with or without a locale", () => {
    expect(bookCallbackPath("/th/b/o3-2/5")).toBe("/b/o3-2/5");
    expect(bookCallbackPath("/b/o3-2/5/writing")).toBe("/b/o3-2/5/writing");
    expect(studentCallbackPath("/th/b/o3-2/5")).toBe("/b/o3-2/5");
    expect(studentCallbackPath("/en/b/o3-2/12/writing")).toBe("/b/o3-2/12/writing");
  });

  it("refuses every other value as a book path", () => {
    const refused = [
      "//x", "https://x", "/b/../teacher", "/b/o3-2/5/other", "/b/o3-2/0", "/b/o3-2/05", "/b/o3-2/5/writing/x",
      "/b/o3-2/5\\x", "/\\b/o3-2/5", "%2F%2Fx", "/%2F%2Fx", "/b/%2e%2e/teacher", "/b/%2E%2E/teacher", "/b/O3-2/5",
      "/b/o3-2/5?x=1", "/b/o3-2/5#x", "/th/th/b/o3-2/5", "/teacher/my-classes", "", null,
    ];
    for (const value of refused) {
      expect(bookCallbackPath(value), String(value)).toBeNull();
      expect(studentCallbackPath(value), String(value)).toBeNull();
    }
  });

  it("keeps staff on the plain local-path rule", () => {
    expect(safeCallbackPath("/th/b/o3-2/5")).toBe("/b/o3-2/5");
    expect(safeCallbackPath("/th/teacher/my-classes")).toBe("/teacher/my-classes");
  });
});
