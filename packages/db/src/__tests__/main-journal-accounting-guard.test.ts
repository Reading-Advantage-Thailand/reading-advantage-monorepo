// @vitest-environment node
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DRIZZLE_DIR = new URL("../../drizzle/", import.meta.url).pathname;
const META_DIR = new URL("../../drizzle/meta/", import.meta.url).pathname;
const PACKAGE_ROOT = new URL("../../", import.meta.url).pathname;
const ACCOUNTING_TABLES = [
  "accounting_submissions",
  "accounting_submission_audit_events",
];

/** Returns the zero-padded journal tag from a migration SQL file name. */
function journalTag(file: string): string {
  return file.replace(/\.sql$/, "");
}

describe("Main-journal Accounting guard (FR-1a)", () => {
  it("keeps the tip snapshot free of Accounting table entries after pruning", () => {
    const snapshotFiles = readdirSync(META_DIR).filter((file) =>
      file.endsWith("_snapshot.json"),
    );
    const tipSnapshot = snapshotFiles.sort().at(-1);
    expect(tipSnapshot, "expected a tip snapshot file").toBeDefined();
    const snapshot = readFileSync(`${META_DIR}${tipSnapshot}`, "utf8");
    for (const table of ACCOUNTING_TABLES) {
      expect(
        snapshot.includes(table),
        `tip snapshot ${tipSnapshot} must not reference ${table}`,
      ).toBe(false);
    }
  });

  it("fails CI if any post-relocation main-journal SQL references an Accounting table", () => {
    const sqlFiles = readdirSync(DRIZZLE_DIR).filter((file) =>
      file.endsWith(".sql"),
    );
    const violations: string[] = [];
    for (const file of sqlFiles) {
      // Entries 0054 and 0055 legitimately create the tables and stay exempt.
      const tagNumber = Number(journalTag(file).slice(0, 4));
      if (tagNumber <= 55) continue;
      const contents = readFileSync(`${DRIZZLE_DIR}${file}`, "utf8");
      for (const table of ACCOUNTING_TABLES) {
        if (contents.includes(table)) {
          violations.push(`${file} references ${table}`);
        }
      }
    }
    expect(
      violations,
      `Post-relocation main-journal SQL must not reference Accounting tables: ${violations.join(", ")}`,
    ).toEqual([]);
  });

  it("generates no Accounting SQL after simulating the schema relocation", () => {
    const temporaryDirectory = mkdtempSync(
      join(PACKAGE_ROOT, ".tmp-accounting-main-guard-"),
    );
    try {
      const generatedDirectory = join(temporaryDirectory, "generated");
      cpSync(META_DIR, join(generatedDirectory, "meta"), { recursive: true });

      const temporarySchemaDirectory = join(temporaryDirectory, "schema");
      cpSync(join(PACKAGE_ROOT, "src/schema"), temporarySchemaDirectory, {
        recursive: true,
      });
      rmSync(join(temporarySchemaDirectory, "accounting.ts"), { force: true });
      const schemaPath = join(temporarySchemaDirectory, "index.ts");
      const currentIndex = readFileSync(schemaPath, "utf8");
      const relocatedIndex = currentIndex
        .split("\n")
        .filter((line) => !line.includes('"./accounting.js"'))
        .join("\n");
      writeFileSync(schemaPath, relocatedIndex);

      const configPath = join(temporaryDirectory, "drizzle.config.ts");
      writeFileSync(
        configPath,
        `import { defineConfig } from "drizzle-kit";\nexport default defineConfig({ dialect: "postgresql", schema: ${JSON.stringify(schemaPath)}, out: ${JSON.stringify(generatedDirectory)}, dbCredentials: { url: "postgresql://generation-only@generation-only.invalid/main" }, strict: false });\n`,
      );

      const generated = spawnSync(
        "pnpm",
        [
          "exec",
          "drizzle-kit",
          "generate",
          "--config",
          configPath,
          "--name",
          "accounting-main-guard",
        ],
        {
          cwd: PACKAGE_ROOT,
          encoding: "utf8",
          env: { ...process.env, CI: "true" },
        },
      );
      expect(
        generated.status,
        `${generated.stdout}\n${generated.stderr}`,
      ).toBe(0);
      const generatedFiles = readdirSync(generatedDirectory);
      const generatedSql = generatedFiles
        .filter((file) => file.endsWith(".sql"))
        .map((file) => readFileSync(join(generatedDirectory, file), "utf8"))
        .join("\n");
      const copiedTipSnapshot = readFileSync(
        join(
          generatedDirectory,
          "meta",
          readdirSync(join(generatedDirectory, "meta"))
            .filter((file) => file.endsWith("_snapshot.json"))
            .sort()
            .at(-1) as string,
        ),
        "utf8",
      );
      for (const table of ACCOUNTING_TABLES) {
        expect(
          generatedSql.includes(table) || copiedTipSnapshot.includes(table),
          `the pruned baseline and fresh main-journal SQL must not reference ${table}`,
        ).toBe(false);
      }
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  }, 60_000);
});
