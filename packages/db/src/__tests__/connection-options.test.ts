import { describe, expect, it } from "vitest";
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
