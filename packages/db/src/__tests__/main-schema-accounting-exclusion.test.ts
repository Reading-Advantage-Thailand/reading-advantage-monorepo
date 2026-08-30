// @vitest-environment node
import { describe, expect, it } from "vitest";

import * as mainSchema from "../schema/index.js";

describe("Main schema no longer re-exports Accounting tables", () => {
  it("does not export accountingSubmissions from the main schema index", () => {
    expect("accountingSubmissions" in mainSchema).toBe(false);
  });

  it("does not export accountingSubmissionAuditEvents from the main schema index", () => {
    expect("accountingSubmissionAuditEvents" in mainSchema).toBe(false);
  });
});
