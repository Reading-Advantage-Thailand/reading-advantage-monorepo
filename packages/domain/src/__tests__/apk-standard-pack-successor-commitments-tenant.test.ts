import { standardPackSuccessorCommitments } from "@reading-advantage/db";
import { describe, expect, it, vi } from "vitest";

vi.unmock("../tenant-registry.js");

import { classifyTable } from "../tenant-registry.js";

describe("standard-pack successor commitment tenant classification", () => {
  it("classifies global successor commitments as EXEMPT", () => {
    expect(classifyTable(standardPackSuccessorCommitments)).toBe("EXEMPT");
  });
});
