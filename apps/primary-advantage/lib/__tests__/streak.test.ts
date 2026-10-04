import { describe, expect, it } from "vitest";
import { countStreakDays } from "../streak";

const d = (s: string) => new Date(s);
const NOW = d("2026-10-04T15:00:00");

describe("countStreakDays", () => {
  it("is 0 with no activity", () => {
    expect(countStreakDays([], NOW)).toBe(0);
  });
  it("counts consecutive local days ending today, deduplicating same-day rows", () => {
    expect(countStreakDays([d("2026-10-04T09:00:00"), d("2026-10-04T10:00:00"), d("2026-10-03T23:30:00"), d("2026-10-02T00:10:00")], NOW)).toBe(3);
  });
  it("keeps the streak alive when the last activity was yesterday", () => {
    expect(countStreakDays([d("2026-10-03T12:00:00"), d("2026-10-02T12:00:00")], NOW)).toBe(2);
  });
  it("is 0 when the last activity was before yesterday", () => {
    expect(countStreakDays([d("2026-10-02T12:00:00")], NOW)).toBe(0);
  });
  it("stops at the first gap", () => {
    expect(countStreakDays([d("2026-10-04T12:00:00"), d("2026-10-02T12:00:00")], NOW)).toBe(1);
  });
});
