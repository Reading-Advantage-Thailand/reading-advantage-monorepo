import { describe, expect, it } from "vitest";
import { getDueDateStatus } from "../assignments/due-date";

/** A fixed local "now": 5 October 2026, 10:00. */
const NOW = new Date(2026, 9, 5, 10, 0, 0);

describe("getDueDateStatus", () => {
  it.each([null, undefined, "", "not a date"])("returns none for an empty due date (%s)", (value) => {
    expect(getDueDateStatus(value, NOW)).toEqual({ kind: "none" });
  });

  it("does not read a null due date as 1 January 1970", () => {
    // `new Date(null)` is the epoch, which made an assignment without a due date "Overdue".
    expect(getDueDateStatus(null, NOW).kind).not.toBe("overdue");
  });

  it("returns overdue when the due time has passed, also earlier today", () => {
    expect(getDueDateStatus(new Date(2026, 9, 3, 23, 59), NOW)).toEqual({ kind: "overdue" });
    expect(getDueDateStatus(new Date(2026, 9, 5, 9, 0), NOW)).toEqual({ kind: "overdue" });
  });

  it("returns today when the due time is later today", () => {
    expect(getDueDateStatus(new Date(2026, 9, 5, 23, 59, 59), NOW)).toEqual({ kind: "today" });
  });

  it("counts calendar days for soon (1 to 3 days) and upcoming (4 days or more)", () => {
    expect(getDueDateStatus(new Date(2026, 9, 6, 8, 0), NOW)).toEqual({ kind: "soon", days: 1 });
    expect(getDueDateStatus(new Date(2026, 9, 8, 23, 59), NOW)).toEqual({ kind: "soon", days: 3 });
    expect(getDueDateStatus(new Date(2026, 9, 9, 0, 0), NOW)).toEqual({ kind: "upcoming", days: 4 });
  });

  it("accepts an ISO string from a JSON response", () => {
    expect(getDueDateStatus(new Date(2026, 9, 7, 12, 0).toISOString(), NOW)).toEqual({ kind: "soon", days: 2 });
  });
});
