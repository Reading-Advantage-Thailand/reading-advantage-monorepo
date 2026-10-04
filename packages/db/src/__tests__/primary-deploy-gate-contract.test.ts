/**
 * Contract: Primary's Cloud Build migrates the database and runs the ledger
 * doctor against the latest journal migration before it deploys
 * (primary_cutover_blockers_20261003, FR-4).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sentinelProbes } from "../sentinels";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CLOUDBUILD = readFileSync(
  join(PACKAGE_ROOT, "../../apps/primary-advantage/cloudbuild.yaml"),
  "utf8",
);
const JOURNAL = JSON.parse(
  readFileSync(join(PACKAGE_ROOT, "drizzle/meta/_journal.json"), "utf8"),
) as { entries: { tag: string }[] };
const LATEST_TAG = JOURNAL.entries[JOURNAL.entries.length - 1]!.tag;

/** Splits the Cloud Build file into step blocks keyed by step id. */
function stepBlocks(): Map<string, string> {
  const blocks = new Map<string, string>();
  for (const block of CLOUDBUILD.split(/\n\s*-\s*name:\s*/).slice(1)) {
    const id = block.match(/id:\s*"([^"]+)"/)?.[1];
    if (id) blocks.set(id, block);
  }
  return blocks;
}

describe("Primary Cloud Build migration gate", () => {
  const ids = [...stepBlocks().keys()];

  it("refuses a legacy database, migrates, runs the doctor, then deploys", () => {
    const refuse = ids.indexOf("refuse-legacy-db");
    expect(refuse).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf("migrate-db")).toBeGreaterThan(refuse);
    const guard = stepBlocks().get("refuse-legacy-db") ?? "";
    expect(guard).toContain("pnpm --filter @reading-advantage/db refuse-legacy-db");
    expect(guard).toMatch(/secretEnv:\s*\n\s*-\s*"DATABASE_URL"/);
    const migrate = ids.indexOf("migrate-db");
    const doctor = ids.indexOf("doctor-check");
    const deploy = ids.indexOf("deploy-cloudrun");
    expect(migrate).toBeGreaterThanOrEqual(0);
    expect(doctor).toBeGreaterThan(migrate);
    expect(deploy).toBeGreaterThan(doctor);
  });

  it("runs `pnpm --filter @reading-advantage/db migrate` with the DB secret", () => {
    const block = stepBlocks().get("migrate-db") ?? "";
    expect(block).toContain("pnpm --filter @reading-advantage/db migrate");
    expect(block).toMatch(/secretEnv:\s*\n\s*-\s*"DATABASE_URL"/);
  });

  it("requires the latest journal migration in the doctor check", () => {
    const block = stepBlocks().get("doctor-check") ?? "";
    expect(block).toContain(
      `pnpm --filter @reading-advantage/db doctor --check --required-migration ${LATEST_TAG}`,
    );
    expect(block).toMatch(/secretEnv:\s*\n\s*-\s*"DATABASE_URL"/);
  });

  it("has a sentinel probe for the migration the doctor requires", () => {
    const required = CLOUDBUILD.match(/--required-migration\s+(\S+?)["\s]/)?.[1];
    expect(required).toBe(LATEST_TAG);
    expect(sentinelProbes[required!]).toBeDefined();
  });

  it("declares the DATABASE_URL secret and keeps no Prisma step", () => {
    expect(CLOUDBUILD).toMatch(
      /availableSecrets:[\s\S]*secrets\/\$\{_DATABASE_URL\}\/versions\/latest"\s*\n\s*env:\s*"DATABASE_URL"/,
    );
    expect(CLOUDBUILD).not.toMatch(/prisma/i);
  });

  it("uses its own secret, never the legacy DATABASE_URL secret", () => {
    const sub = CLOUDBUILD.match(/^\s*_DATABASE_URL:\s*"([^"]+)"/m)?.[1];
    expect(sub).toBe("PRIMARY_V2_DATABASE_URL");
    expect(sub).not.toBe("DATABASE_URL");
  });

  it("starts the Cloud SQL Auth Proxy in every step that reads the database", () => {
    for (const id of ["refuse-legacy-db", "migrate-db", "doctor-check"]) {
      const block = stepBlocks().get(id) ?? "";
      expect(block, id).toContain(
        "cloud-sql-proxy --unix-socket /cloudsql reading-advantage:asia-southeast1:cloud-sql",
      );
      expect(block.indexOf("cloud-sql-proxy --unix-socket"), id).toBeLessThan(
        block.indexOf("pnpm --filter"),
      );
    }
  });

  it("mounts the Cloud SQL instance on the Cloud Run service for the socket URL", () => {
    expect(stepBlocks().get("deploy-cloudrun")).toContain(
      "--add-cloudsql-instances=reading-advantage:asia-southeast1:cloud-sql",
    );
  });
});
