import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("lib/permissions client safety", () => {
  it("imports roles from the client-safe subpath, not the server-only auth barrel", () => {
    const source = readFileSync(resolve(__dirname, "../permissions.ts"), "utf8");
    expect(source).not.toMatch(/from "@reading-advantage\/auth"/);
    expect(source).toMatch(/from "@reading-advantage\/auth\/roles"/);
  });
});
