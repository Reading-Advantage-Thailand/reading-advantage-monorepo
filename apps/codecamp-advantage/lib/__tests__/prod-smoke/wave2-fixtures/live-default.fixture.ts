// COUNTEREXAMPLE FIXTURE — bad live-default prod-smoke file.
// This file proves the guard detects a prod-smoke test that defaults to the
// live production URL without an explicit opt-in gate.
import { describe, it } from "vitest";

const PROD_URL = process.env.PHASEX_PROD_URL ?? "https://codecamp.reading-advantage.com";

describe("Bad fixture: live-default", () => {
  it("hits production by default", async () => {
    await fetch(PROD_URL);
  });
});
