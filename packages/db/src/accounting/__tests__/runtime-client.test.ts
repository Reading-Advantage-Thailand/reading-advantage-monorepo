// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  client: { end: vi.fn() },
  postgres: vi.fn(),
}));

vi.mock("postgres", () => ({ default: mocks.postgres }));

import { createAccountingRuntimeClient } from "../client.js";
import * as runtime from "../runtime.js";

describe("Accounting runtime-only client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.postgres.mockReturnValue(mocks.client);
  });

  it("builds postgres.js from the runtime URL with Cloud SQL socket options", async () => {
    const databaseUrl =
      "postgresql://accounting_runtime@localhost/accounting?host=/cloudsql/reading-advantage:asia-southeast1:cloud-sql";

    await expect(
      createAccountingRuntimeClient({ databaseUrl, poolMax: 4 }),
    ).resolves.toBe(mocks.client);
    expect(mocks.postgres).toHaveBeenCalledWith(
      "postgresql://accounting_runtime@localhost/accounting",
      expect.objectContaining({
        max: 4,
        path: "/cloudsql/reading-advantage:asia-southeast1:cloud-sql/.s.PGSQL.5432",
        prepare: false,
      }),
    );
  });

  it("exports no migration or doctor entry point from the runtime barrel", () => {
    expect(Object.keys(runtime)).toEqual(["createAccountingRuntimeClient"]);
  });
});
