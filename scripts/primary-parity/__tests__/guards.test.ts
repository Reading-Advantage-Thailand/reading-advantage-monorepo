import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as guards from "../guards.js";

type Query = (sql: string) => Promise<ReadonlyArray<{ table_name: string }>>;
interface GuardInput {
  legacyUrl: string;
  newUrl: string;
  legacyQuery: Query;
  newQuery: Query;
  baseUrls: string[];
  outputFiles: string[];
}

/** API that Phase 3 adds to guards.ts: async assertGuards(input), which throws GuardError with a `code`. */
const assertGuards = (input: GuardInput): Promise<void> =>
  (guards as unknown as { assertGuards: (i: GuardInput) => Promise<void> }).assertGuards(input);

const legacyMarkers: Query = async () => [{ table_name: "article" }, { table_name: "_prisma_migrations" }];
const noMarkers: Query = async () => [];

const outside = mkdtempSync(join(tmpdir(), "parity-guard-out-"));
const repo = mkdtempSync(join(tmpdir(), "parity-guard-repo-"));
mkdirSync(join(repo, ".git"));
mkdirSync(join(repo, "sub"));

const good = (): GuardInput => ({
  legacyUrl: "postgres://kit:pw-legacy-1@localhost:5432/primary_legacy_clone",
  newUrl: "postgres://kit:pw-new-1@127.0.0.1:5432/primary_parity_clone",
  legacyQuery: legacyMarkers,
  newQuery: noMarkers,
  baseUrls: ["http://localhost:3100", "http://localhost:3005"],
  outputFiles: [join(outside, "accounts.json")],
});

describe("guards", () => {
  it("passes the good case", async () => {
    await expect(assertGuards(good())).resolves.toBeUndefined();
  });

  it("accepts the host ::1", async () => {
    const input = good();
    input.newUrl = "postgres://kit:pw@[::1]:5432/primary_parity_clone";
    await expect(assertGuards(input)).resolves.toBeUndefined();
  });

  it("refuses a remote legacy database host", async () => {
    const input = good();
    input.legacyUrl = "postgres://kit:pw-legacy-1@db.example.com:5432/primary_legacy_clone";
    await expect(assertGuards(input)).rejects.toMatchObject({ code: "remote-host" });
  });

  it("refuses a remote new database host", async () => {
    const input = good();
    input.newUrl = "postgres://kit:pw-new-1@10.0.0.5:5432/primary_parity_clone";
    await expect(assertGuards(input)).rejects.toMatchObject({ code: "remote-host" });
  });

  it("refuses the shared database primary_advantage", async () => {
    const input = good();
    input.newUrl = "postgres://kit:pw-new-1@localhost:5432/primary_advantage";
    await expect(assertGuards(input)).rejects.toMatchObject({ code: "shared-database" });
  });

  it("refuses the shared database when it is in the legacy URL", async () => {
    const input = good();
    input.legacyUrl = "postgres://kit:pw@localhost:5432/primary_advantage?sslmode=disable";
    await expect(assertGuards(input)).rejects.toMatchObject({ code: "shared-database" });
  });

  it("refuses a legacy URL with no legacy marker", async () => {
    const input = good();
    input.legacyQuery = noMarkers;
    await expect(assertGuards(input)).rejects.toMatchObject({ code: "legacy-marker-missing" });
  });

  it("refuses a new URL with a legacy marker", async () => {
    const input = good();
    input.newQuery = legacyMarkers;
    await expect(assertGuards(input)).rejects.toMatchObject({ code: "legacy-marker-present" });
  });

  it("refuses a remote base URL", async () => {
    const input = good();
    input.baseUrls = ["https://primary.example.com"];
    await expect(assertGuards(input)).rejects.toMatchObject({ code: "remote-base-url" });
  });

  it("refuses a base URL with the https scheme", async () => {
    const input = good();
    input.baseUrls = ["https://localhost:3100"];
    await expect(assertGuards(input)).rejects.toMatchObject({ code: "remote-base-url" });
  });

  it("refuses a base URL with no port", async () => {
    const input = good();
    input.baseUrls = ["http://localhost"];
    await expect(assertGuards(input)).rejects.toMatchObject({ code: "remote-base-url" });
  });

  it("refuses an output file inside a git repository", async () => {
    const input = good();
    input.outputFiles = [join(repo, "sub", "accounts.json")];
    await expect(assertGuards(input)).rejects.toMatchObject({ code: "output-in-repository" });
  });

  it("does not put the database password in the error message", async () => {
    const input = good();
    input.legacyUrl = "postgres://kit:pw-legacy-1@db.example.com:5432/primary_legacy_clone";
    await expect(assertGuards(input)).rejects.not.toThrow(/pw-legacy-1/);
  });

  it.each([
    "primary_legacy_20261007", "primary_legacy_20261008",
    "primary_legacy_20261006", "primary_etl_20261007", "primary_rehearsal1_20261008", "primary_rehearsal2_20261010", "primary_etl_prod",
  ])("refuses the protected copy %s", async (name) => {
    const input = good();
    input.newUrl = `postgres://kit:pw@localhost:5432/${name}`;
    await expect(assertGuards(input)).rejects.toMatchObject({ code: "shared-database" });
  });

  it("keeps the matched copies readable and refuses a write to them", () => {
    for (const name of ["primary_legacy_20261011", "primary_parity_20261011"]) {
      expect(() => guards.checkDatabaseUrl(`postgres://k:p@localhost:5432/${name}`, "read")).not.toThrow();
      expect(() => guards.checkDatabaseUrl(`postgres://k:p@localhost:5432/${name}`, "write")).toThrowError(/protected/);
    }
  });

  it("refuses a write to a name with no _run_ and accepts a _run_ copy", async () => {
    const input = good();
    expect(() => guards.checkDatabaseUrl("postgres://k:p@localhost:5432/primary_legacy_clone", "write")).toThrowError(/_run_/);
    expect(() => guards.checkDatabaseUrl("postgres://k:p@localhost:5432/primary_legacy_run_20261012", "write")).not.toThrow();
    expect(() => guards.checkDatabaseUrl("postgres://k:p@localhost:5432/primary_legacy_clone", "read")).not.toThrow();
    await expect(assertGuards({ ...input, writeTargets: ["legacy"] } as GuardInput)).rejects.toMatchObject({ code: "shared-database" });
  });

  it("refuses a URL with a host search param (unix socket)", () => {
    expect(() => guards.checkDatabaseUrl("postgres://k:p@localhost:5432/x_run_1?host=/var/run/postgresql", "read")).toThrowError(/host/);
  });
});
