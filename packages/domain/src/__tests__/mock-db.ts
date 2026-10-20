import { vi } from "vitest";

export interface MockDb {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  /** Calls of `.for(...)` on any select chain. */
  forLock: ReturnType<typeof vi.fn>;
  transaction: <T>(fn: (tx: MockDb) => Promise<T>) => Promise<T>;
}

function createQueryBuilder(val: unknown, forSpy: ReturnType<typeof vi.fn>) {
  const builder = {
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    for: forSpy,
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
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
 *
 * If `selectSequence` is provided, each call to `select()` returns the next result
 * in the sequence (cycling back to the start if exhausted). Otherwise, `selectResults`
 * is used for all calls.
 */
export function createMockDb(overrides: {
  insertReturning?: unknown[];
  conflictInsertReturning?: unknown[];
  updateReturning?: unknown[];
  selectResults?: unknown[];
  selectSequence?: unknown[][];
  transactionFn?: (tx: MockDb) => Promise<unknown>;
} = {}): MockDb {
  let selectCallIndex = 0;
  /** Shared spy of `.for(...)` (row lock) on every select chain. */
  const forLock = vi.fn().mockReturnThis();
  const getResolvedValue = () => {
    if (overrides.selectSequence && overrides.selectSequence.length > 0) {
      const result = overrides.selectSequence[selectCallIndex % overrides.selectSequence.length];
      selectCallIndex++;
      return result;
    }
    return overrides.selectResults ?? [];
  };

  const mockDb: MockDb = {
    forLock,
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockImplementation((values: unknown) => {
        const conflictResult = overrides.conflictInsertReturning
          ?? (Array.isArray(values) ? values : [values]);
        const conflictBuilder = Object.assign(Promise.resolve([]), {
          returning: vi.fn().mockResolvedValue(conflictResult),
        });
        return {
          returning: vi.fn().mockResolvedValue(overrides.insertReturning ?? []),
          onConflictDoNothing: vi.fn().mockReturnValue(conflictBuilder),
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue(overrides.insertReturning ?? []),
          }),
        };
      }),
    }),
    select: vi.fn().mockImplementation(() => {
      const resolvedValue = getResolvedValue();
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(createQueryBuilder(resolvedValue, forLock)),
          innerJoin: vi.fn().mockReturnValue(createQueryBuilder(resolvedValue, forLock)),
          leftJoin: vi.fn().mockReturnValue(createQueryBuilder(resolvedValue, forLock)),
          // Support queries without .where() (e.g. .from(t).limit(n).offset(n))
          limit: vi.fn().mockReturnValue(createQueryBuilder(resolvedValue, forLock)),
          offset: vi.fn().mockReturnValue(createQueryBuilder(resolvedValue, forLock)),
          orderBy: vi.fn().mockReturnValue(createQueryBuilder(resolvedValue, forLock)),
          then(
            onFulfilled?: (value: unknown) => unknown,
            onRejected?: (reason: unknown) => unknown
          ) {
            return Promise.resolve(resolvedValue).then(onFulfilled, onRejected);
          },
        }),
      };
    }),
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
