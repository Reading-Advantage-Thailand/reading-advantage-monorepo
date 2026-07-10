/**
 * Phase S3 remediation Red contracts for migration and snapshot reproducibility.
 *
 * The suite is read-only: it inspects committed SQL, journal metadata, Drizzle
 * snapshots, and live schema metadata without running `drizzle-kit generate`
 * against the shared dirty worktree.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  masteryCalibrations,
  masteryCards,
  masteryCommits,
  masteryEvidence,
  masteryPlacements,
  masteryReviews,
  masteryStates,
  users,
} from "../schema/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DB_ROOT = resolve(HERE, "../..");
const REPO_ROOT = resolve(DB_ROOT, "../..");
const DRIZZLE_ROOT = join(DB_ROOT, "drizzle");
const META_ROOT = join(DRIZZLE_ROOT, "meta");
const JOURNAL_PATH = join(META_ROOT, "_journal.json");

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

interface SnapshotTable {
  name: string;
  columns: Record<string, unknown>;
  indexes: Record<string, unknown>;
  foreignKeys: Record<string, unknown>;
  uniqueConstraints: Record<string, unknown>;
  checkConstraints: Record<string, unknown>;
}

interface Snapshot {
  id: string;
  prevId: string;
  version: string;
  dialect: string;
  tables: Record<string, SnapshotTable>;
}

const MASTERY_TABLES = [
  masteryCards,
  masteryReviews,
  masteryEvidence,
  masteryStates,
  masteryPlacements,
  masteryCalibrations,
  masteryCommits,
] as const;

const EXPECTED_0028_CONSTRAINTS = [
  "users_school_id_id_unique",
  "mastery_cards_school_student_fk",
  "mastery_cards_school_id_student_id_unique",
  "mastery_reviews_school_student_fk",
  "mastery_reviews_school_card_student_fk",
  "mastery_reviews_school_id_student_id_unique",
  "mastery_evidence_school_student_fk",
  "mastery_evidence_school_review_student_fk",
  "mastery_states_school_student_fk",
  "mastery_placements_school_student_fk",
  "mastery_commits_school_student_fk",
  "mastery_placements_school_student_objective_release_type_unique",
  "mastery_calibrations_school_population_version_unique",
] as const;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function snapshotPath(index: number): string {
  return join(META_ROOT, `${index.toString().padStart(4, "0")}_snapshot.json`);
}

function repositoryPath(path: string): string {
  return path.slice(REPO_ROOT.length + 1);
}

function isTracked(path: string): boolean {
  try {
    execFileSync(
      "git",
      ["ls-files", "--error-unmatch", repositoryPath(path)],
      { cwd: REPO_ROOT, stdio: "ignore" },
    );
    return true;
  } catch {
    return false;
  }
}

function masterySnapshotKeys(snapshot: Snapshot): string[] {
  return Object.keys(snapshot.tables)
    .filter((name) => name.startsWith("public.mastery_"))
    .sort();
}

function tableMetadataNames(table: PgTable): string[] {
  const config = getTableConfig(table);
  const names = [
    ...config.columns
      .filter(({ isUnique }) => isUnique)
      .map(({ uniqueName }) => uniqueName),
    ...config.uniqueConstraints.map(({ name }) => name),
    ...config.foreignKeys.map((foreignKey) => foreignKey.getName()),
    ...config.checks.map(({ name }) => name),
    ...config.indexes.map(({ config: indexConfig }) => indexConfig.name),
  ];

  return names
    .filter((name): name is string => typeof name === "string")
    .sort();
}

function snapshotMetadataNames(table: SnapshotTable): string[] {
  return [
    ...Object.keys(table.uniqueConstraints),
    ...Object.keys(table.foreignKeys),
    ...Object.keys(table.checkConstraints),
    ...Object.keys(table.indexes),
  ].sort();
}

describe("Phase S3 remediation: migration ledger controls", () => {
  const journal = readJson<Journal>(JOURNAL_PATH);

  it("control: keeps the existing journal index and timestamp sequence contiguous", () => {
    const ordered = [...journal.entries].sort((left, right) => left.idx - right.idx);
    expect(ordered.map(({ idx }) => idx)).toEqual(
      Array.from({ length: ordered.length }, (_, index) => index),
    );
    for (let index = 1; index < ordered.length; index += 1) {
      expect(ordered[index]!.when).toBeGreaterThan(ordered[index - 1]!.when);
    }
    expect(new Set(ordered.map(({ tag }) => tag)).size).toBe(ordered.length);
  });

  it("control: preserves 0027 as an additive, non-destructive migration", () => {
    const entry = journal.entries.find(({ idx }) => idx === 27);
    expect(entry?.tag).toBe("0027_mastery_persistence");
    const source = readFileSync(join(DRIZZLE_ROOT, `${entry!.tag}.sql`), "utf8");
    expect(source.match(/CREATE TABLE "mastery_/g)).toHaveLength(7);
    expect(source).not.toMatch(/^\s*(?:DELETE\s+FROM|UPDATE\s+|TRUNCATE\s+)/im);
    expect(source).not.toMatch(/\bDROP\s+(?:TABLE|COLUMN|SCHEMA|DATABASE|TYPE)\b/i);
  });

  it.each([26, 27, 28])(
    "tracks %s_snapshot.json instead of relying on local untracked metadata",
    (index) => {
      const path = snapshotPath(index);
      expect(
        existsSync(path),
        `RED S3-API-005: ${index.toString().padStart(4, "0")}_snapshot.json is missing`,
      ).toBe(true);
      expect(
        isTracked(path),
        `RED migration reproducibility: ${repositoryPath(path)} must be committed`,
      ).toBe(true);
    },
  );

  it("records the historical 0026 -> 0027 -> 0028 snapshot parent chain", () => {
    const paths = [25, 26, 27, 28].map(snapshotPath);
    for (const path of paths) {
      expect(existsSync(path), `RED snapshot-chain prerequisite missing: ${path}`).toBe(
        true,
      );
    }
    if (paths.some((path) => !existsSync(path))) return;

    const snapshots = paths.map((path) => readJson<Snapshot>(path));
    for (let index = 1; index < snapshots.length; index += 1) {
      expect(
        snapshots[index]!.prevId,
        `snapshot ${index + 25} must point to snapshot ${index + 24}`,
      ).toBe(snapshots[index - 1]!.id);
      expect(snapshots[index]!.version).toBe("7");
      expect(snapshots[index]!.dialect).toBe("postgresql");
    }
  });

  it("keeps mastery absent in 0026 and complete in 0027", () => {
    const path26 = snapshotPath(26);
    const path27 = snapshotPath(27);
    expect(existsSync(path26), "RED historical 0026 snapshot missing").toBe(true);
    expect(existsSync(path27), "RED historical 0027 snapshot missing").toBe(true);
    if (!existsSync(path26) || !existsSync(path27)) return;

    const snapshot26 = readJson<Snapshot>(path26);
    const snapshot27 = readJson<Snapshot>(path27);
    expect(snapshot26.tables["public.game_completions"]).toBeDefined();
    expect(masterySnapshotKeys(snapshot26)).toEqual([]);
    expect(masterySnapshotKeys(snapshot27)).toEqual(
      MASTERY_TABLES.map((table) => `public.${getTableConfig(table).name}`).sort(),
    );
  });

  it("preserves the 0026 leaderboards NOT NULL post-state in 0027 metadata", () => {
    const path26 = snapshotPath(26);
    const path27 = snapshotPath(27);
    expect(existsSync(path26), "historical 0026 snapshot missing").toBe(true);
    expect(existsSync(path27), "historical 0027 snapshot missing").toBe(true);
    if (!existsSync(path26) || !existsSync(path27)) return;

    const snapshot26 = readJson<Snapshot>(path26);
    const snapshot27 = readJson<Snapshot>(path27);
    const leaderboard26 = snapshot26.tables["public.leaderboards"];
    const leaderboard27 = snapshot27.tables["public.leaderboards"];
    expect(leaderboard26?.columns.school_id).toMatchObject({ notNull: true });
    expect(leaderboard27?.columns.school_id).toMatchObject({ notNull: true });
  });

  it("adds one 0028 tenant-hardening journal/SQL/snapshot triplet", () => {
    const entry = journal.entries.find(({ idx }) => idx === 28);
    expect(
      entry,
      "RED migration remediation: journal idx 28 must own tenant hardening",
    ).toBeDefined();
    if (!entry) return;
    expect(entry.tag).toMatch(/^0028_.*mastery.*(?:tenant|ownership|hardening)/i);
    expect(existsSync(join(DRIZZLE_ROOT, `${entry.tag}.sql`))).toBe(true);
    expect(existsSync(snapshotPath(28))).toBe(true);
  });
});

describe("Phase S3 remediation: 0028 fail-closed tenant hardening", () => {
  const journal = readJson<Journal>(JOURNAL_PATH);

  function migration0028(): string | null {
    const entry = journal.entries.find(({ idx }) => idx === 28);
    if (!entry) return null;
    const path = join(DRIZZLE_ROOT, `${entry.tag}.sql`);
    return existsSync(path) ? readFileSync(path, "utf8") : null;
  }

  it("fails closed on pre-existing cross-owner data without deleting or reassigning it", () => {
    const source = migration0028();
    expect(source, "RED 0028 preflight migration is missing").not.toBeNull();
    if (!source) return;

    expect(source).toMatch(/DO\s+\$\$/i);
    expect(source).toMatch(/RAISE\s+EXCEPTION/i);
    expect(source).toMatch(/"?users"?/i);
    expect(source).toMatch(/school_id/i);
    expect(source).toMatch(/student_id/i);
    for (const table of [
      "mastery_cards",
      "mastery_reviews",
      "mastery_evidence",
      "mastery_states",
      "mastery_placements",
      "mastery_commits",
    ]) {
      expect(source, `0028 preflight must inspect ${table}`).toContain(table);
    }
    expect(source).not.toMatch(/\bDELETE\s+FROM\s+"?mastery_/i);
    expect(source).not.toMatch(/\bUPDATE\s+"?mastery_/i);
  });

  it("adds every composite owner, owner-chain, and restored natural-key constraint", () => {
    const source = migration0028();
    expect(source, "RED 0028 constraint migration is missing").not.toBeNull();
    if (!source) return;
    for (const constraint of EXPECTED_0028_CONSTRAINTS) {
      expect(source, `0028 must include ${constraint}`).toContain(constraint);
    }
    expect(source).toMatch(
      /FOREIGN KEY\s*\(\s*"school_id"\s*,\s*"student_id"\s*\)\s*REFERENCES\s*(?:"public"\.)?"users"\s*\(\s*"school_id"\s*,\s*"id"\s*\)/i,
    );
  });

  it("does not recreate any mastery table already introduced by 0027", () => {
    const source = migration0028();
    expect(source, "RED 0028 migration is missing").not.toBeNull();
    if (!source) return;
    expect(source).not.toMatch(/CREATE\s+TABLE\s+"mastery_/i);
    expect(source).toMatch(/ALTER\s+TABLE\s+"mastery_/i);
  });
});

describe("Phase S3 remediation: deterministic clean-generation proxy", () => {
  it("matches the current Drizzle mastery metadata to the terminal 0028 snapshot", () => {
    const path = snapshotPath(28);
    expect(
      existsSync(path),
      "RED clean-generation proxy: terminal 0028 snapshot is missing",
    ).toBe(true);
    if (!existsSync(path)) return;
    const snapshot = readJson<Snapshot>(path);

    for (const table of [users, ...MASTERY_TABLES]) {
      const config = getTableConfig(table);
      const snapshotTable = snapshot.tables[`public.${config.name}`];
      expect(snapshotTable, `0028 snapshot missing public.${config.name}`).toBeDefined();
      if (!snapshotTable) continue;
      expect(Object.keys(snapshotTable.columns).sort()).toEqual(
        config.columns.map(({ name }) => name).sort(),
      );
      expect(snapshotMetadataNames(snapshotTable)).toEqual(tableMetadataNames(table));
    }
  });

  it("contains the hardened constraints in schema metadata and the terminal snapshot", () => {
    const path = snapshotPath(28);
    expect(existsSync(path), "RED terminal 0028 snapshot is missing").toBe(true);
    if (!existsSync(path)) return;
    const snapshot = readJson<Snapshot>(path);
    const snapshotNames = Object.values(snapshot.tables).flatMap(snapshotMetadataNames);
    const schemaNames = [users, ...MASTERY_TABLES].flatMap(tableMetadataNames);

    for (const constraint of EXPECTED_0028_CONSTRAINTS) {
      expect(schemaNames, `schema metadata missing ${constraint}`).toContain(constraint);
      expect(snapshotNames, `0028 snapshot missing ${constraint}`).toContain(constraint);
    }
  });
});
