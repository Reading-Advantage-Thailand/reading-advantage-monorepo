import { vi } from "vitest";

export interface MockDb {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  transaction: <T>(fn: (tx: MockDb) => Promise<T>) => Promise<T>;
}

function createQueryBuilder(val: unknown) {
  const builder = {
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      }),
    }),
    then(
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) {
      return Promise.resolve(val).then(onFulfilled, onRejected);
    },
    execute() {
      return Promise.resolve(val);
    },
  };
  return builder;
}

/**
 * Create a mock Drizzle DB that supports the chain patterns used in domain functions:
 *   db.insert(table).values(data).returning()
 *   db.select().from(table).where(...).limit(1)
 *   db.select({...}).from(table).innerJoin(...).where(...).limit(1)
 *   db.transaction(async (tx) => { ... })
 */
export function createMockDb(overrides: {
  insertReturning?: unknown[];
  updateReturning?: unknown[];
  selectResults?: unknown[];
  transactionFn?: (tx: MockDb) => Promise<unknown>;
} = {}): MockDb {
  const resolvedValue = overrides.selectResults ?? [];

  const mockDb: MockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(overrides.insertReturning ?? []),
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(overrides.insertReturning ?? []),
        }),
      }),
    }),
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(createQueryBuilder(resolvedValue)),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(createQueryBuilder(resolvedValue)),
        }),
      }),
    })),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(overrides.updateReturning ?? []),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    transaction: vi.fn().mockImplementation(
      overrides.transactionFn ?? ((fn: (tx: MockDb) => Promise<unknown>) => fn(mockDb))
    ),
  };

  return mockDb;
}
