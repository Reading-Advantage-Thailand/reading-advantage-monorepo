/**
 * Config drift test — ensures apps don't reintroduce local copies of
 * configs that should be shared across the monorepo.
 *
 * Run: npx vitest run scripts/config-drift.test.ts
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { globSync } from "fs";
import path from "path";

const APPS_DIR = path.resolve(__dirname, "../apps");
const PACKAGES_DIR = path.resolve(__dirname, "../packages");

function getAppDirs(): string[] {
  const entries = existsSync(APPS_DIR)
    ? require("fs").readdirSync(APPS_DIR, { withFileTypes: true })
    : [];
  return entries
    .filter((e: any) => e.isDirectory())
    .map((e: any) => path.join(APPS_DIR, e.name));
}

describe("config drift prevention", () => {
  const apps = getAppDirs();

  it("no app defines its own tailwind.config.js", () => {
    for (const app of apps) {
      const twConfig = path.join(app, "tailwind.config.js");
      const twConfigTs = path.join(app, "tailwind.config.ts");
      expect(
        existsSync(twConfig),
        `${path.basename(app)} should not have tailwind.config.js`
      ).toBe(false);
      expect(
        existsSync(twConfigTs),
        `${path.basename(app)} should not have tailwind.config.ts`
      ).toBe(false);
    }
  });

  it("no app defines its own cn() helper", () => {
    for (const app of apps) {
      const utilsPath = path.join(app, "lib/utils.ts");
      if (existsSync(utilsPath)) {
        const content = readFileSync(utilsPath, "utf-8");
        expect(
          content.includes("export function cn("),
          `${path.basename(app)} should not define cn() locally — use @reading-advantage/utils`
        ).toBe(false);
      }
    }
  });

  it("all packages have ESLint configs", () => {
    const entries = require("fs").readdirSync(PACKAGES_DIR, {
      withFileTypes: true,
    });
    const pkgDirs = entries
      .filter((e: any) => e.isDirectory())
      .map((e: any) => path.join(PACKAGES_DIR, e.name));

    for (const pkg of pkgDirs) {
      const pkgJson = path.join(pkg, "package.json");
      if (!existsSync(pkgJson)) continue;

      const content = JSON.parse(readFileSync(pkgJson, "utf-8"));
      if (!content.scripts?.lint) continue;

      const hasConfig =
        existsSync(path.join(pkg, "eslint.config.mjs")) ||
        existsSync(path.join(pkg, "eslint.config.js")) ||
        existsSync(path.join(pkg, ".eslintrc.json"));

      expect(
        hasConfig,
        `${path.basename(pkg)} has lint script but no ESLint config`
      ).toBe(true);
    }
  });
});
