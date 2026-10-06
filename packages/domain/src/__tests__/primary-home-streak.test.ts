import { describe, expect, it } from "vitest";
import { countStreakDays, countStreakFromDays } from "../primary-home/streak.js";

/** An instant on the Bangkok clock (UTC+7). */
const bangkok = (local: string) => new Date(`${local}+07:00`);
const NOW = bangkok("2026-10-04T15:00:00");

describe("countStreakDays", () => {
  it("is 0 with no activity", () => {
    expect(countStreakDays([], NOW)).toBe(0);
  });
  it("counts consecutive Bangkok days ending today, deduplicating same-day rows", () => {
    expect(
      countStreakDays([bangkok("2026-10-04T09:00:00"), bangkok("2026-10-04T10:00:00"), bangkok("2026-10-03T23:30:00"), bangkok("2026-10-02T00:10:00")], NOW),
    ).toBe(3);
  });
  it("keeps the streak alive when the last activity was yesterday", () => {
    expect(countStreakDays([bangkok("2026-10-03T12:00:00"), bangkok("2026-10-02T12:00:00")], NOW)).toBe(2);
  });
  it("is 0 when the last activity was before yesterday", () => {
    expect(countStreakDays([bangkok("2026-10-02T12:00:00")], NOW)).toBe(0);
  });
  it("stops at the first gap", () => {
    expect(countStreakDays([bangkok("2026-10-04T12:00:00"), bangkok("2026-10-02T12:00:00")], NOW)).toBe(1);
  });
  it("uses the Bangkok day, not the day of the machine or of UTC", () => {
    // 00:30 in Bangkok on 4 October is still 3 October in UTC: it is today's activity.
    expect(countStreakDays([bangkok("2026-10-04T00:30:00")], NOW)).toBe(1);
    // 23:30 in Bangkok on 2 October is 3 October in UTC+8: it is not yesterday.
    expect(countStreakDays([bangkok("2026-10-02T23:30:00")], NOW)).toBe(0);
  });
});

describe("countStreakFromDays", () => {
  it("counts calendar day keys (one per day, from the database) ending today or yesterday", () => {
    expect(countStreakFromDays(["2026-10-04", "2026-10-03", "2026-10-02"], NOW)).toBe(3);
    expect(countStreakFromDays(["2026-10-03", "2026-10-02", "2026-09-30"], NOW)).toBe(2);
    expect(countStreakFromDays(["2026-10-02"], NOW)).toBe(0);
    expect(countStreakFromDays([], NOW)).toBe(0);
  });
  it("counts across a month end", () => {
    expect(countStreakFromDays(["2026-10-01", "2026-09-30", "2026-09-29"], bangkok("2026-10-01T08:00:00"))).toBe(3);
  });
  it("takes today on the Bangkok clock", () => {
    // 4 October 01:00 in Bangkok is 3 October in UTC: "2026-10-03" is yesterday, "2026-10-04" is today.
    expect(countStreakFromDays(["2026-10-04"], bangkok("2026-10-04T01:00:00"))).toBe(1);
  });
});
