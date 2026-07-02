// COUNTEREXAMPLE FIXTURE — good opt-in-gated prod-smoke file.
// This file proves the guard allows a prod-smoke test that only runs when
// RUN_LIVE_SMOKE=true and a live credential/URL contract is present.
import { describe, it } from "vitest";

const RUN_LIVE_SMOKE = process.env.RUN_LIVE_SMOKE === "true";
const PROD_URL = process.env.PHASEX_PROD_URL ?? "https://codecamp.reading-advantage.com";

describe("Good fixture: opt-in gated", () => {
  it.skipIf(!RUN_LIVE_SMOKE || !PROD_URL)("hits production only when opted in", async () => {
    await fetch(PROD_URL);
  });
});
