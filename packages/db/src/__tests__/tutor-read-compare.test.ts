import { describe, expect, it } from "vitest";
import { classifyQueryError, diffColumnShapes, diffRows } from "../tutor-read-compare.js";
import { TUTOR_READ_QUERIES } from "../tutor-read-queries.js";

const ref = [
  { name: "id", type: "text" },
  { name: "title", type: "text" },
];

describe("diffColumnShapes", () => {
  it("returns no difference for equal shapes in any order", () => {
    expect(diffColumnShapes(ref, [...ref].reverse())).toEqual([]);
  });
  it("fails when a column is renamed", () => {
    const d = diffColumnShapes(ref, [ref[0], { name: "name", type: "text" }]);
    expect(d.map((x) => x.kind).sort()).toEqual(["extra-column", "missing-column"]);
  });
  it("fails when a column is dropped", () => {
    expect(diffColumnShapes(ref, [ref[0]])).toEqual([{ kind: "missing-column", detail: "title (text)" }]);
  });
  it("fails when a column type changes", () => {
    const d = diffColumnShapes(ref, [ref[0], { name: "title", type: "varchar" }]);
    expect(d[0].kind).toBe("type-mismatch");
  });
});

describe("diffRows", () => {
  it("ignores row order", () => {
    expect(diffRows([{ id: "a", v: 1 }, { id: "b", v: 2 }], [{ id: "b", v: 2 }, { id: "a", v: 1 }])).toEqual([]);
  });
  it("reports missing, extra, and changed rows", () => {
    const d = diffRows([{ id: "a", v: 1 }, { id: "b", v: 2 }], [{ id: "b", v: 3 }, { id: "c", v: 1 }]);
    expect(d.map((x) => `${x.kind}:${x.detail}`)).toEqual(["missing-row:a", "value-mismatch:b.v", "extra-row:c"]);
  });
  it("compares id-less rows by content", () => {
    expect(diffRows([{ s: "x" }], [{ s: "x" }])).toEqual([]);
    expect(diffRows([{ s: "x" }], [{ s: "y" }]).length).toBe(2);
  });
  it("compares jsonb-like values deeply", () => {
    expect(diffRows([{ id: "a", o: ["x"] }], [{ id: "a", o: ["y"] }])[0].kind).toBe("value-mismatch");
  });
});

describe("TUTOR_READ_QUERIES", () => {
  it("holds the five Tutor reads", () => {
    expect(TUTOR_READ_QUERIES).toHaveLength(5);
  });
});

describe("classifyQueryError", () => {
  it("treats undefined column and undefined table as shape failures", () => {
    expect(classifyQueryError({ code: "42703" })).toBe("shape");
    expect(classifyQueryError({ code: "42P01" })).toBe("shape");
  });
  it("treats other errors as connection errors", () => {
    expect(classifyQueryError({ code: "28P01" })).toBe("connection");
    expect(classifyQueryError({ code: "ECONNREFUSED" })).toBe("connection");
    expect(classifyQueryError(new Error("boom"))).toBe("connection");
    expect(classifyQueryError(null)).toBe("connection");
  });
});
