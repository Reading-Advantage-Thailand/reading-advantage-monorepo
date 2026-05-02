import { vi } from "vitest";

export interface MockDb {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock Drizzle DB that supports the chain patterns used in domain functions:
 *   db.insert(table).values(data).returning()
 *   db.select().from(table).where(...)
 *   db.select({...}).from(table).innerJoin(...).where(...)
 *   db.transaction(async (tx) => { ... })
 */
export function createMockDb(overrides: {
  insertReturning?: unknown[];
  selectResults?: unknown[];
  transactionFn?: (tx: MockDb) => Promise<unknown>;
} = {}): MockDb {
  const mockDb: MockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(overrides.insertReturning ?? []),
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(overrides.selectResults ?? []),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(overrides.selectResults ?? []),
        }),
      }),
    }),
    transaction: vi.fn().mockImplementation(
      overrides.transactionFn ?? ((fn: (tx: MockDb) => Promise<unknown>) => fn(mockDb))
    ),
  };

  return mockDb;
}
