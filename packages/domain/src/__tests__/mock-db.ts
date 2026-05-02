import { vi } from "vitest";

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
  transactionFn?: (tx: ReturnType<typeof createMockDb>) => Promise<unknown>;
} = {}) {
  const mockDb = {
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
      overrides.transactionFn ?? ((fn: (tx: unknown) => Promise<unknown>) => fn(mockDb))
    ),
  };

  return mockDb;
}

export type MockDb = ReturnType<typeof createMockDb>;
