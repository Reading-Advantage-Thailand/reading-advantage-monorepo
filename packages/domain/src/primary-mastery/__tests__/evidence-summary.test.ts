import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createMockDb } from "../../__tests__/mock-db.js";
import { summarizePrimaryEvidence } from "../evidence-summary.js";
import { SCHOOL } from "./evidence-fixtures.js";

const day = (iso: string) => new Date(iso);

describe("summarizePrimaryEvidence (FR-8)", () => {
  it("counts evidence rows per surface, per day, and per confidence step, and the skipped reasons from the job results", async () => {
    const evidence = [
      { variantKey: "mcq", evidenceConfidence: 0.8, observedAt: day("2026-10-06T01:00:00Z") },
      { variantKey: "mcq", evidenceConfidence: 0.5, observedAt: day("2026-10-06T02:00:00Z") },
      { variantKey: "flashcard", evidenceConfidence: 0.7, observedAt: day("2026-10-07T01:00:00Z") },
      { variantKey: "game:word-hunt", evidenceConfidence: 0.4, observedAt: day("2026-10-07T01:00:00Z") },
      { variantKey: "expedition", evidenceConfidence: 0.4, observedAt: day("2026-10-07T03:00:00Z") },
    ];
    const jobs = [
      { resultJson: { status: "recorded", committed: 2, skipped: 1 } },
      { resultJson: { status: "row-missing", committed: 0, skipped: 0 } },
      { resultJson: null },
    ];
    const db = createMockDb({ selectSequence: [evidence, jobs] }) as unknown as DB;
    const summary = await summarizePrimaryEvidence({ db, tenant: { schoolId: SCHOOL }, since: day("2026-10-01T00:00:00Z") });
    expect(summary).toEqual({
      since: "2026-10-01T00:00:00.000Z",
      total: 5,
      bySurface: { mcq: 2, flashcard: 1, game: 1, expedition: 1 },
      byDay: { "2026-10-06": 2, "2026-10-07": 3 },
      byConfidence: { "0.8": 1, "0.7": 1, "0.5": 1, "0.4": 2 },
      jobs: { recorded: 1, "row-missing": 1, "tenant-mismatch": 0, pending: 1, committed: 2, skipped: 1 },
    });
  });

  it("returns zeros for a school with no evidence", async () => {
    const db = createMockDb({ selectSequence: [[], []] }) as unknown as DB;
    const summary = await summarizePrimaryEvidence({ db, tenant: { schoolId: SCHOOL }, since: day("2026-10-01T00:00:00Z") });
    expect(summary).toMatchObject({ total: 0, bySurface: {}, byDay: {}, byConfidence: {}, jobs: { recorded: 0, pending: 0, committed: 0, skipped: 0 } });
  });
});
