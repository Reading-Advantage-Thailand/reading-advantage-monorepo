// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { classifyTable } from "../tenant-registry.js";
import {
  accountingSubmissions,
  accountingSubmissionAuditEvents,
} from "@reading-advantage/db/accounting/schema";

describe("Tenant registry classifies the Accounting tables", () => {
  it("imports Accounting tables from the dedicated schema entrypoint", () => {
    const registrySource = readFileSync(
      new URL("../tenant-registry.ts", import.meta.url),
      "utf8",
    );
    expect(registrySource).toContain(
      'from "@reading-advantage/db/accounting/schema"',
    );
  });

  it("classifies accountingSubmissions as EXEMPT", () => {
    expect(classifyTable(accountingSubmissions)).toBe("EXEMPT");
  });

  it("classifies accountingSubmissionAuditEvents as EXEMPT", () => {
    expect(classifyTable(accountingSubmissionAuditEvents)).toBe("EXEMPT");
  });
});
