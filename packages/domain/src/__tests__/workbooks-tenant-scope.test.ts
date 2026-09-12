import {
  workbookDrafts,
  workbookEditions,
  workbookPublicationEvents,
} from "@reading-advantage/db";
import { describe, expect, it, vi } from "vitest";

vi.unmock("../tenant-registry.js");

import { classifyTable } from "../tenant-registry.js";
import {
  createDrizzleEditionRepository,
  type WorkbookDrizzleDatabase,
} from "../workbooks/drizzle-edition-repository.js";

describe("workbook publishing tenant classification", () => {
  it("classifies workbook drafts as REFERENTIAL", () => {
    expect(classifyTable(workbookDrafts)).toBe("REFERENTIAL");
  });

  it("classifies workbook editions as REFERENTIAL", () => {
    expect(classifyTable(workbookEditions)).toBe("REFERENTIAL");
  });

  it("classifies workbook publication events as REFERENTIAL", () => {
    expect(classifyTable(workbookPublicationEvents)).toBe("REFERENTIAL");
  });
});

/**
 * Builds a handle that records the query-builder calls made against it.
 * @returns The handle plus the recorded call log.
 */
function createRecordingHandle(): {
  handle: WorkbookDrizzleDatabase;
  calls: string[];
} {
  const calls: string[] = [];
  const rows: unknown[] = [];
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve(rows),
    values: () => chain,
    set: () => chain,
    returning: () => Promise.resolve(rows),
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
  };
  const handle: WorkbookDrizzleDatabase = {
    select: () => {
      calls.push("select");
      return chain;
    },
    insert: () => {
      calls.push("insert");
      return chain;
    },
    update: () => {
      calls.push("update");
      return chain;
    },
    transaction: async <T,>(fn: (tx: WorkbookDrizzleDatabase) => Promise<T>) =>
      fn(handle),
  };
  return { handle, calls };
}

describe("createDrizzleEditionRepository tenant escape hatch", () => {
  it("unscopes a TenantDB-shaped handle with a recorded reason", async () => {
    const { handle: raw, calls } = createRecordingHandle();
    const reasons: string[] = [];
    const tenantScoped: WorkbookDrizzleDatabase = {
      ...raw,
      unscoped: (reason: string) => {
        reasons.push(reason);
        return raw;
      },
    };

    const repository = createDrizzleEditionRepository(tenantScoped);
    await repository.listDrafts("tenant-a");

    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toMatch(/tenant_id/);
    expect(calls).toContain("select");
  });

  it("queries a plain transaction handle directly when it cannot be unscoped", async () => {
    const { handle, calls } = createRecordingHandle();

    const repository = createDrizzleEditionRepository(handle);
    await repository.listDrafts("tenant-a");

    expect(calls).toContain("select");
  });

  it("scopes every draft read by the caller's tenant id", async () => {
    const whereArgs: unknown[] = [];
    const rows: unknown[] = [];
    const chain = {
      from: () => chain,
      where: (condition: unknown) => {
        whereArgs.push(condition);
        return chain;
      },
      limit: () => Promise.resolve(rows),
      then: (resolve: (value: unknown[]) => unknown) =>
        Promise.resolve(rows).then(resolve),
    };
    const handle = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      transaction: async <T,>(fn: (tx: WorkbookDrizzleDatabase) => Promise<T>) =>
        fn(handle as unknown as WorkbookDrizzleDatabase),
    } as unknown as WorkbookDrizzleDatabase;

    const repository = createDrizzleEditionRepository(handle);
    await repository.listDrafts("tenant-a");
    await repository.getDraft("tenant-a", "draft-1");

    expect(whereArgs).toHaveLength(2);
    for (const condition of whereArgs) {
      expect(condition).toBeDefined();
    }
  });
});
