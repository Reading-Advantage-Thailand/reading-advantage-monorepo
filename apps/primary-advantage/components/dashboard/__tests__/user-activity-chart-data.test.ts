import { describe, expect, it } from "vitest";

import { formatCumulativeXpForDays } from "../user-activity-chart-data";

function localDate(year: number, month: number, day: number, hour = 0): Date {
  return new Date(year, month - 1, day, hour);
}

describe("formatCumulativeXpForDays", () => {
  it("carries XP earned before the selected range into every displayed daily total", () => {
    const data = formatCumulativeXpForDays([
      { id: "before-1", userId: "student", xpEarned: 10, createdAt: localDate(2026, 7, 1, 10) },
      { id: "before-2", userId: "student", xpEarned: 15, createdAt: localDate(2026, 7, 2, 10) },
      { id: "in-range-1", userId: "student", xpEarned: 7, createdAt: localDate(2026, 7, 3, 0) },
      { id: "in-range-2", userId: "student", xpEarned: 3, createdAt: localDate(2026, 7, 4, 23) },
    ], {
      from: localDate(2026, 7, 3),
      to: localDate(2026, 7, 4),
    });

    expect(data).toEqual([
      { day: "Fri 3", xpEarned: 32 },
      { day: "Sat 4", xpEarned: 35 },
    ]);
  });

  it("uses the selected start day when the range has no explicit end", () => {
    expect(formatCumulativeXpForDays([
      { id: "before", userId: "student", xpEarned: 12, createdAt: localDate(2026, 7, 1, 12) },
      { id: "selected", userId: "student", xpEarned: 8, createdAt: localDate(2026, 7, 2, 0) },
    ], { from: localDate(2026, 7, 2) })).toEqual([
      { day: "Thu 2", xpEarned: 20 },
    ]);
  });
});
