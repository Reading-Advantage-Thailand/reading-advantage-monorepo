// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { salesRouter } from "../routers/sales.js";
import { createTenantDB } from "@reading-advantage/domain";
import { roleplayAttemptOutputSchema as typesAttemptSchema } from "@reading-advantage/types";
import { roleplayAttemptOutputSchema as domainAttemptSchema } from "@reading-advantage/domain/sales";
import type { DB } from "@reading-advantage/db";
import type { Context } from "../trpc.js";

function createMinimalMockDb(selectResults: unknown[] = []) {
  const builder = (val: unknown) => ({
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    then(
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(val).then(onFulfilled, onRejected);
    },
  });

  const mockDb = {
    select: vi.fn(() => ({ from: vi.fn(() => builder(selectResults)) })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) })),
    })),
    transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({})),
  } as unknown as DB & { unscoped: (reason: string) => DB };
  (mockDb as { unscoped: unknown }).unscoped = vi.fn(() => mockDb);
  return mockDb;
}

const salesRep = {
  id: "rep-1",
  username: "rep1",
  name: "Rep",
  role: "SALES_REP" as const,
  schoolId: "school-1",
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};

const globalTenant = { schoolId: null as string | null };

const t = initTRPC.context<Context>().create({ transformer: superjson });
const appRouter = t.router({ sales: salesRouter });

function createCaller(auth: Context["auth"], db: DB = {} as DB) {
  const tenantDb = createTenantDB(db, auth?.tenant ?? { schoolId: null });
  return t.createCallerFactory(appRouter)({ db, tenantDb, auth });
}

describe("Sales router audio contract", () => {
  it("domain and types attempt output schemas both accept null audioStorageKey", () => {
    const attempt = {
      id: "attempt-1",
      scenarioId: "scenario-1",
      userId: "rep-1",
      audioStorageKey: null,
      durationMs: 1000,
      transcriptExcerpt: null,
      llmScoreJson: null,
      overallScore: null,
      passed: null,
      llmFeedback: null,
      attemptNumber: 1,
      createdAt: new Date(),
    };
    const domainResult = domainAttemptSchema.safeParse(attempt);
    const typesResult = typesAttemptSchema.safeParse(attempt);
    expect(
      domainResult.success,
      "domain roleplayAttemptOutputSchema must accept null audioStorageKey",
    ).toBe(true);
    expect(
      typesResult.success,
      "types roleplayAttemptOutputSchema must accept null audioStorageKey",
    ).toBe(true);
  });

  it("attemptHistory returns attempts with null audioStorageKey", async () => {
    const attempts = [
      {
        id: "attempt-1",
        scenarioId: "scenario-1",
        userId: "rep-1",
        audioStorageKey: null,
        durationMs: 1000,
        transcriptExcerpt: null,
        llmScoreJson: null,
        overallScore: null,
        passed: null,
        llmFeedback: null,
        attemptNumber: 1,
        createdAt: new Date(),
      },
    ];
    const mockDb = createMinimalMockDb(attempts);
    const caller = createCaller(
      { user: salesRep, tenant: globalTenant },
      mockDb,
    );
    const result = await caller.sales.attemptHistory({ scenarioId: "d7f0fc0c-1111-1111-1111-111111111111" });
    expect(result[0].audioStorageKey).toBeNull();
  });

  it("API boundary defines an audio media input contract", async () => {
    const domainModule = await import("@reading-advantage/domain/sales");
    const typesModule = await import("@reading-advantage/types");
    const mediaSchema =
      domainModule.roleplayAudioInputSchema ?? typesModule.roleplayAudioInputSchema;
    expect(
      mediaSchema,
      "A roleplayAudioInputSchema must exist at the API/types boundary to validate " +
        "audio size, MIME type, duration, consent, and retention before provider/storage calls",
    ).toBeDefined();
  });
});
