// @vitest-environment node
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const packageRoot = new URL("../../", import.meta.url).pathname;
const vitestPath = resolve(packageRoot, "../../node_modules/vitest/vitest.mjs");
const guardTest = new URL("./main-journal-accounting-guard.test.ts", import.meta.url)
  .pathname;

describe("Main-journal Accounting guard adversarial fixture", () => {
  it("rejects a new main-journal file that names an Accounting table", () => {
    const fixtureRoot = mkdtempSync(
      join(packageRoot, ".tmp-main-journal-accounting-guard-adversarial-"),
    );
    try {
      cpSync(join(packageRoot, "drizzle"), join(fixtureRoot, "drizzle"), {
        recursive: true,
      });
      const fixtureTestDirectory = join(fixtureRoot, "src", "__tests__");
      mkdirSync(fixtureTestDirectory, { recursive: true });
      cpSync(guardTest, join(fixtureTestDirectory, "main-journal-accounting-guard.test.ts"));
      writeFileSync(
        join(fixtureRoot, "vitest.config.ts"),
        'export default { test: { include: ["src/**/*.{test,spec}.{ts,tsx}"] } };\n',
      );
      writeFileSync(
        join(fixtureRoot, "drizzle", "0057_adversarial_accounting_reference.sql"),
        "CREATE INDEX accounting_submissions_adversarial_idx ON accounting_submissions (id);\n",
      );

      const result = spawnSync(
        process.execPath,
        [
          vitestPath,
          "run",
          join(fixtureTestDirectory, "main-journal-accounting-guard.test.ts"),
          "-t",
          "fails CI if any post-relocation main-journal SQL references an Accounting table",
        ],
        {
          cwd: fixtureRoot,
          encoding: "utf8",
          env: { ...process.env, CI: "true" },
        },
      );

      expect(result.status).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toContain(
        "0057_adversarial_accounting_reference.sql references accounting_submissions",
      );
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  }, 60_000);
});
