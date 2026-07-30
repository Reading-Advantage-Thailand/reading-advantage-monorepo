import { standardPackSuccessorAdmissionReceipts } from "@reading-advantage/db";
import { describe, expect, it, vi } from "vitest";

vi.unmock("../tenant-registry.js");

import { classifyTable } from "../tenant-registry.js";

describe("standard-pack successor admission receipt tenant classification", () => {
  it("classifies global successor admission receipts as EXEMPT", () => {
    expect(classifyTable(standardPackSuccessorAdmissionReceipts)).toBe("EXEMPT");
  });
});
