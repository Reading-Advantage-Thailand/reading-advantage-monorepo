import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("@reading-advantage/config", () => {
  it("tsconfig/base.json exists and is valid JSON", () => {
    const raw = fs.readFileSync(
      path.join(__dirname, "../tsconfig/base.json"),
      "utf-8"
    );
    const config = JSON.parse(raw);
    expect(config.compilerOptions).toBeDefined();
    expect(config.compilerOptions.strict).toBe(true);
    expect(config.compilerOptions.target).toBe("ES2022");
  });

  it("tailwind config exists and exports a default", async () => {
    const mod = await import("../tailwind/tailwind.config.ts");
    expect(mod.default).toBeDefined();
    expect(mod.default.content).toBeDefined();
  });

  it("eslint config exists and exports an array", () => {
    const raw = fs.readFileSync(
      path.join(__dirname, "../eslint/index.js"),
      "utf-8"
    );
    expect(raw).toContain("export default");
    expect(raw).toContain("[");
    expect(raw.trim().endsWith("];")).toBe(true);
  });
});
