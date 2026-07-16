import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  loadDatabaseCounterexamples,
  validateCounterexampleSources,
} from "../counterexample-fixtures.js";

describe("database architecture counterexample fixtures", () => {
  it("loads the complete named database fixture matrix", async () => {
    const cases = loadDatabaseCounterexamples();

    expect(cases.map((fixture) => fixture.id)).toEqual([
      "database-alias-import",
      "database-approved-postgres-job-adapter",
      "database-barrel-import",
      "database-direct-import",
      "database-dynamic-import",
      "database-raw-client-route",
      "database-webhook-job-table",
      "database-worker-job-port",
      "database-worker-job-table",
    ]);
    expect(
      cases.filter((fixture) => fixture.expected === "violation"),
    ).toHaveLength(7);
    expect(
      cases.filter((fixture) => fixture.expected === "allowed"),
    ).toHaveLength(2);
    expect(
      cases.find(
        (fixture) => fixture.id === "database-approved-postgres-job-adapter",
      )?.sourcePath,
    ).toBe("packages/backend/src/jobs/adapters/postgres/claim.ts");
    expect(
      cases.find((fixture) => fixture.id === "database-worker-job-port")
        ?.sourcePath,
    ).toBe("services/worker/src/poll.ts");
  });

  it("keeps every exact fixture readable and TypeScript-parseable", async () => {
    const result = await validateCounterexampleSources(
      fileURLToPath(new URL("../../../../", import.meta.url)),
      loadDatabaseCounterexamples(),
    );

    expect(result).toEqual({ filesChecked: 12, parseErrors: [] });
  });
});
