import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildPostgresOptions,
  normalizePostgresConnectionString,
} from "../connection-options";

describe("buildPostgresOptions", () => {
  it("uses the Cloud Run socket path encoded in DATABASE_URL host query", () => {
    const options = buildPostgresOptions(
      "postgresql://user:pass@localhost/reading_advantage?host=/cloudsql/reading-advantage:asia-southeast1:cloud-sql"
    );

    expect(options.path).toBe(
      "/cloudsql/reading-advantage:asia-southeast1:cloud-sql/.s.PGSQL.5432"
    );
  });

  it("keeps TCP connection strings on postgres.js defaults", () => {
    const options = buildPostgresOptions(
      "postgresql://user:pass@db.example.com:5433/reading_advantage"
    );

    expect(options.path).toBeUndefined();
    expect(options.connect_timeout).toBe(30);
  });

  it("allows Next.js build-time imports before runtime secrets are injected", () => {
    const options = buildPostgresOptions(undefined);

    expect(options.path).toBeUndefined();
    expect(options.connect_timeout).toBe(30);
  });

  it("strips the socket host query before passing the URL to postgres.js", () => {
    const connectionString =
      "postgresql://user:pass@localhost/reading_advantage?host=/cloudsql/reading-advantage:asia-southeast1:cloud-sql";

    expect(normalizePostgresConnectionString(connectionString)).toBe(
      "postgresql://user:pass@localhost/reading_advantage"
    );
  });

  it("keeps TCP connection strings unchanged", () => {
    const connectionString = "postgresql://user:pass@db.example.com:5433/reading_advantage?sslmode=require";

    expect(normalizePostgresConnectionString(connectionString)).toBe(connectionString);
  });
});

describe("buildPostgresOptions — pooled-use defaults (FR-2)", () => {
  const ORIGINAL_MAX = process.env.DATABASE_POOL_MAX;

  beforeEach(() => {
    delete process.env.DATABASE_POOL_MAX;
  });

  afterEach(() => {
    if (ORIGINAL_MAX === undefined) {
      delete process.env.DATABASE_POOL_MAX;
    } else {
      process.env.DATABASE_POOL_MAX = ORIGINAL_MAX;
    }
  });

  it("sets prepare:false for transaction-mode pooler compatibility (TCP URL)", () => {
    const options = buildPostgresOptions(
      "postgresql://user:pass@db.example.com:6432/reading_advantage"
    );

    expect(options.prepare).toBe(false);
  });

  it("sets prepare:false for socket-path URLs too (Cloud Run + Cloud SQL Proxy)", () => {
    const options = buildPostgresOptions(
      "postgresql://user:pass@localhost/reading_advantage?host=/cloudsql/reading-advantage:asia-southeast1:cloud-sql"
    );

    expect(options.prepare).toBe(false);
  });

  it("sets prepare:false on the no-DATABASE_URL build-time fallback", () => {
    const options = buildPostgresOptions(undefined);

    expect(options.prepare).toBe(false);
  });

  it("defaults max to 3 (small per-process pool for transaction-mode multiplexing)", () => {
    const options = buildPostgresOptions(
      "postgresql://user:pass@db.example.com:6432/reading_advantage"
    );

    expect(options.max).toBe(3);
  });

  it("reads max from DATABASE_POOL_MAX env var when set", () => {
    process.env.DATABASE_POOL_MAX = "10";

    const options = buildPostgresOptions(
      "postgresql://user:pass@db.example.com:6432/reading_advantage"
    );

    expect(options.max).toBe(10);
  });

  it("ignores DATABASE_POOL_MAX when it is not a positive integer", () => {
    process.env.DATABASE_POOL_MAX = "not-a-number";

    const options = buildPostgresOptions(
      "postgresql://user:pass@db.example.com:6432/reading_advantage"
    );

    expect(options.max).toBe(3);
  });

  it("ignores DATABASE_POOL_MAX when it is zero or negative", () => {
    process.env.DATABASE_POOL_MAX = "0";
    expect(
      buildPostgresOptions("postgresql://user:pass@db.example.com:6432/db").max
    ).toBe(3);

    process.env.DATABASE_POOL_MAX = "-5";
    expect(
      buildPostgresOptions("postgresql://user:pass@db.example.com:6432/db").max
    ).toBe(3);
  });

  it("ignores DATABASE_POOL_MAX when it is a non-integer or whitespace-only", () => {
    process.env.DATABASE_POOL_MAX = "3.5";
    expect(
      buildPostgresOptions("postgresql://user:pass@db.example.com:6432/db").max
    ).toBe(3);

    process.env.DATABASE_POOL_MAX = "   ";
    expect(
      buildPostgresOptions("postgresql://user:pass@db.example.com:6432/db").max
    ).toBe(3);
  });

  it("applies env-configurable max to the no-DATABASE_URL fallback too", () => {
    process.env.DATABASE_POOL_MAX = "7";

    const options = buildPostgresOptions(undefined);

    expect(options.max).toBe(7);
  });
});
