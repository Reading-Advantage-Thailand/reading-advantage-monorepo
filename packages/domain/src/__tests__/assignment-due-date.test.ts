import { describe, expect, it } from "vitest";
import { getDueDateStatus } from "../assignments/due-date";
import { SCHOOL_TIME_ZONE, calendarDayNumber } from "../calendar-day";

/** An instant on the Bangkok clock (UTC+7, no daylight saving time). */
const bangkok = (local: string) => new Date(`${local}+07:00`);

/** "Now": 7 October 2026, 10:00 in Bangkok. */
const NOW = bangkok("2026-10-07T10:00:00");

describe("getDueDateStatus", () => {
  it.each([null, undefined, "", "not a date"])("returns none for an empty due date (%s)", (value) => {
    expect(getDueDateStatus(value, NOW)).toEqual({ kind: "none" });
  });

  it("does not read a null due date as 1 January 1970", () => {
    // `new Date(null)` is the epoch, which made an assignment without a due date "Overdue".
    expect(getDueDateStatus(null, NOW).kind).not.toBe("overdue");
  });

  describe("on the due day (calendar days, not instants)", () => {
    it("returns today for a due date at local midnight (the teacher calendar value)", () => {
      // The calendar stores midnight of the chosen day; `due < now` showed "Late" all day.
      expect(getDueDateStatus(bangkok("2026-10-07T00:00:00"), NOW)).toEqual({ kind: "today" });
    });

    it("returns today for a due date at 23:59", () => {
      expect(getDueDateStatus(bangkok("2026-10-07T23:59:00"), NOW)).toEqual({ kind: "today" });
    });

    it("returns today for the server end-of-day value (23:59:59.999 UTC = 06:59 in Bangkok)", () => {
      expect(getDueDateStatus(new Date("2026-10-06T23:59:59.999Z"), NOW)).toEqual({ kind: "today" });
    });

    it("returns today at the last minute of the due day", () => {
      expect(getDueDateStatus(bangkok("2026-10-07T00:00:00"), bangkok("2026-10-07T23:59:00"))).toEqual({ kind: "today" });
    });
  });

  describe("one day later", () => {
    const nextMorning = bangkok("2026-10-08T00:01:00");

    it("returns overdue for a due date at midnight of the day before", () => {
      expect(getDueDateStatus(bangkok("2026-10-07T00:00:00"), nextMorning)).toEqual({ kind: "overdue" });
    });

    it("returns overdue for a due date at 23:59 of the day before", () => {
      expect(getDueDateStatus(bangkok("2026-10-07T23:59:00"), nextMorning)).toEqual({ kind: "overdue" });
    });

    it("returns soon (1 day) for a due date at midnight of the next day", () => {
      expect(getDueDateStatus(bangkok("2026-10-08T00:00:00"), NOW)).toEqual({ kind: "soon", days: 1 });
    });
  });

  it("counts calendar days for soon (1 to 3 days) and upcoming (4 days or more)", () => {
    expect(getDueDateStatus(bangkok("2026-10-08T08:00:00"), NOW)).toEqual({ kind: "soon", days: 1 });
    expect(getDueDateStatus(bangkok("2026-10-10T23:59:00"), NOW)).toEqual({ kind: "soon", days: 3 });
    expect(getDueDateStatus(bangkok("2026-10-11T00:00:00"), NOW)).toEqual({ kind: "upcoming", days: 4 });
  });

  it("accepts an ISO string from a JSON response", () => {
    expect(getDueDateStatus(bangkok("2026-10-09T12:00:00").toISOString(), NOW)).toEqual({ kind: "soon", days: 2 });
  });

  it("uses the Bangkok calendar, not the time zone of the machine", () => {
    // 7 Oct 23:30 in Bangkok is already 8 Oct in UTC+8 (and 7 Oct 16:30 in UTC).
    expect(getDueDateStatus(bangkok("2026-10-07T23:30:00"), NOW)).toEqual({ kind: "today" });
    // 01:00 in Bangkok is still the day before in UTC: the Bangkok day decides.
    expect(getDueDateStatus(bangkok("2026-10-07T12:00:00"), bangkok("2026-10-08T01:00:00"))).toEqual({ kind: "overdue" });
  });

  it("accepts another time zone", () => {
    expect(getDueDateStatus(new Date("2026-10-07T23:30:00Z"), new Date("2026-10-07T10:00:00Z"), "UTC")).toEqual({ kind: "today" });
  });
});

describe("calendarDayNumber", () => {
  it("is Asia/Bangkok by default", () => {
    expect(SCHOOL_TIME_ZONE).toBe("Asia/Bangkok");
  });

  it("gives the same number for every instant of one Bangkok day and the next number after midnight", () => {
    const start = calendarDayNumber(bangkok("2026-10-07T00:00:00"));
    expect(calendarDayNumber(bangkok("2026-10-07T23:59:59"))).toBe(start);
    expect(calendarDayNumber(bangkok("2026-10-08T00:00:00"))).toBe(start + 1);
    expect(start).toBe(Date.UTC(2026, 9, 7) / 86_400_000);
  });
});
