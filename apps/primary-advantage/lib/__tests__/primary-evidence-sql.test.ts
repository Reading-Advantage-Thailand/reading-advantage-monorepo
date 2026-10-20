import { beforeEach, describe, expect, it, vi } from "vitest";

const postgresMock = vi.hoisted(() => vi.fn(() => ({})));
vi.mock("postgres", () => ({ default: postgresMock }));
vi.mock("@reading-advantage/db", async () => await import("../../../../packages/db/src/connection-options"));

import { createPrimaryEvidenceSql } from "../primary-evidence-sql";

beforeEach(() => postgresMock.mockClear());

describe("createPrimaryEvidenceSql", () => {
  it("connects through the Cloud SQL socket of the host parameter, not 127.0.0.1:5432", () => {
    createPrimaryEvidenceSql("postgresql://app:pw@localhost/primary_v2?host=/cloudsql/proj:region:inst");
    expect(postgresMock).toHaveBeenCalledWith(
      "postgresql://app:pw@localhost/primary_v2",
      expect.objectContaining({ path: "/cloudsql/proj:region:inst/.s.PGSQL.5432", max: 2, prepare: false }),
    );
  });

  it("keeps a TCP URL as it is", () => {
    createPrimaryEvidenceSql("postgresql://app:pw@127.0.0.1:5440/primary_v2");
    const [url, options] = postgresMock.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(url).toBe("postgresql://app:pw@127.0.0.1:5440/primary_v2");
    expect(options).toMatchObject({ max: 2, prepare: false });
    expect(options).not.toHaveProperty("path");
  });
});
