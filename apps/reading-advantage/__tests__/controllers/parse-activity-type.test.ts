/**
 * Regression test — parseActivityType (track structural_ux_alignment_20260911 FR-9).
 *
 * Real clients POST lowercase snake_case activity types taken from the
 * ActivityType enum in components/models/user-activity-log-model.ts (for
 * example "mc_question", "sentence_matching", "lesson_read"). The parsed
 * value is stored in user_activity and must match the canonical enum casing
 * used by server read paths.
 *
 * Falsification conditions:
 *  - If any client-sent activity type string returns null, the endpoint 400s
 *    and the client loses XP.
 *  - If a non-enum value parses, invalid input is accepted.
 *
 * @jest-environment node
 */

import { ActivityType as LibActivityType } from "@/lib/enums";
import { ActivityType as ModelActivityType } from "@/components/models/user-activity-log-model";

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");
  return {
    ...actual,
    db: { execute: jest.fn() },
  };
});

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

import { parseActivityType } from "@/server/controllers/user-controller";

describe("parseActivityType regression (FR-9)", () => {
  it("parses every activity type string real clients send", () => {
    for (const clientValue of Object.values(ModelActivityType)) {
      expect(parseActivityType(clientValue)).not.toBeNull();
    }
  });

  const canonicalValues = new Set([
    ...Object.values(LibActivityType),
    ...Object.values(ModelActivityType).map((value) => value.toUpperCase()),
  ]);

  it.each(Object.values(ModelActivityType))(
    "parses %s to its canonical enum casing",
    (clientValue) => {
      const expected = clientValue.toUpperCase();
      expect(canonicalValues.has(expected)).toBe(true);
      expect(parseActivityType(clientValue)).toBe(expected);
    },
  );

  it("still accepts legacy uppercase input", () => {
    expect(parseActivityType("ARTICLE_READ")).toBe("ARTICLE_READ");
    expect(parseActivityType("LESSON_READ")).toBe("LESSON_READ");
  });

  it("rejects values outside both activity type enums", () => {
    expect(parseActivityType("not_an_activity")).toBeNull();
    expect(parseActivityType("ARTICLE_READD")).toBeNull();
    expect(parseActivityType("")).toBeNull();
    expect(parseActivityType("   ")).toBeNull();
  });

  it("rejects non-string input", () => {
    expect(parseActivityType(undefined)).toBeNull();
    expect(parseActivityType(null)).toBeNull();
    expect(parseActivityType(42)).toBeNull();
    expect(parseActivityType({ value: "lesson_read" })).toBeNull();
    expect(parseActivityType(["lesson_read"])).toBeNull();
  });
});
