import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createMockDb } from "../../__tests__/mock-db.js";
import { GP_DAILY_CAP, bangkokDayStart, gpBalance, gpForXp, grantGpForXp } from "../gp.js";

const now = new Date("2026-10-06T02:30:00.000Z");

describe("gpForXp", () => {
  it("weights ratings to nothing and everything else 1 per XP", () => {
    expect(gpForXp("ARTICLE_RATING", 4)).toBe(0);
    expect(gpForXp("MC_QUESTION", 5)).toBe(5);
    expect(gpForXp("GAME_COMPLETION", 10)).toBe(10);
    expect(gpForXp("ARTICLE_READ", -3)).toBe(0);
  });

  it("starts the Bangkok day at 17:00 UTC of the day before", () => {
    expect(bangkokDayStart(now).toISOString()).toBe("2026-10-05T17:00:00.000Z");
    expect(bangkokDayStart(new Date("2026-10-05T16:59:00.000Z")).toISOString()).toBe("2026-10-04T17:00:00.000Z");
  });
});

describe("grantGpForXp", () => {
  const base = { userId: "s1", sourceKey: "xp:a1", activityType: "MC_QUESTION", xpEarned: 10, now };

  it("writes one ledger row per source key and returns the GP", async () => {
    const mock = createMockDb({ selectResults: [{ total: 0 }], conflictInsertReturning: [{ id: "l1" }] });
    await expect(grantGpForXp({ tx: mock as unknown as DB, schoolId: "school-1", ...base })).resolves.toBe(10);
    const values = mock.insert.mock.results[0]!.value.values.mock.calls[0]![0];
    expect(values).toMatchObject({ schoolId: "school-1", userId: "s1", delta: 10, reason: "xp", sourceKey: "xp:a1", createdAt: now });
  });

  it("returns 0 when the row already exists (a repeat of the same XP award)", async () => {
    const mock = createMockDb({ selectResults: [{ total: 0 }], conflictInsertReturning: [] });
    await expect(grantGpForXp({ tx: mock as unknown as DB, schoolId: "school-1", ...base })).resolves.toBe(0);
  });

  it("caps the day: grants the room that is left, nothing when the cap is reached", async () => {
    const nearly = createMockDb({ selectResults: [{ total: GP_DAILY_CAP - 3 }], conflictInsertReturning: [{ id: "l2" }] });
    await expect(grantGpForXp({ tx: nearly as unknown as DB, schoolId: "school-1", ...base })).resolves.toBe(3);
    expect(nearly.insert.mock.results[0]!.value.values.mock.calls[0]![0]).toMatchObject({ delta: 3 });
    const full = createMockDb({ selectResults: [{ total: GP_DAILY_CAP }] });
    await expect(grantGpForXp({ tx: full as unknown as DB, schoolId: "school-1", ...base })).resolves.toBe(0);
    expect(full.insert).not.toHaveBeenCalled();
  });

  it("grants nothing for a rating, or to a user with no school", async () => {
    const mock = createMockDb({ selectResults: [{ total: 0 }] });
    await expect(grantGpForXp({ tx: mock as unknown as DB, schoolId: "school-1", ...base, activityType: "ARTICLE_RATING" })).resolves.toBe(0);
    await expect(grantGpForXp({ tx: mock as unknown as DB, schoolId: null, ...base })).resolves.toBe(0);
    expect(mock.select).not.toHaveBeenCalled();
  });
});

describe("gpBalance", () => {
  it("sums the ledger and reads 0 with no rows", async () => {
    await expect(gpBalance(createMockDb({ selectResults: [{ total: "85" }] }) as unknown as DB, "school-1", "s1")).resolves.toBe(85);
    await expect(gpBalance(createMockDb({ selectResults: [] }) as unknown as DB, "school-1", "s1")).resolves.toBe(0);
  });
});
