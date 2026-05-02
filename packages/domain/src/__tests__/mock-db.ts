import { vi } from "vitest";

export interface MockDb {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  transaction: <T>(fn: (tx: MockDb) => Promise<T>) => Promise<T>;
}

function createQueryBuilder(val: unknown) {
  const promise = Promise.resolve(val);
  return Object.assign(promise, {
    limit: vi.fn().mockResolvedValue(val),
    innerJoin: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(Object.assign(Promise.resolve(val), {
        limit: vi.fn().mockResolvedValue(val),
      })),
    }),
  });
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
  selectResults?: unknown[];
  transactionFn?: (tx: MockDb) => Promise<unknown>;
} = {}): MockDb {
  const resolvedValue = overrides.selectResults ?? [];

  const mockDb: MockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(overrides.insertReturning ?? []),
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
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
    transaction: vi.fn().mockImplementation(
      overrides.transactionFn ?? ((fn: (tx: MockDb) => Promise<unknown>) => fn(mockDb))
    ),
  };

  return mockDb;
}
