// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** The upload routes log through the structured logger (lib/observability/logger.ts). */
describe.each(["csv", "classes"])("upload %s route", (name) => {
  const source = readFileSync(path.join(__dirname, "..", name, "route.ts"), "utf-8");

  it("does not call console.error", () => {
    expect(source).not.toMatch(/console\.error/);
  });

  it("imports the structured logger", () => {
    expect(source).toContain('from "@/lib/observability/logger"');
  });
});
