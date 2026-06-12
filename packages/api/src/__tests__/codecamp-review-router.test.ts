import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { z } from "zod";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { codecampRouter } from "../routers/codecamp.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";
import { reviewResultSchema } from "@reading-advantage/domain/codecamp";

// ─── Hoisted mocks (must be available before module imports) ──────────────

interface MockCall {
  method: "generateObject" | "generateImage" | "generateText";
  input: unknown;
}

const mockHolder = vi.hoisted(() => ({
  // A minimal AIClient-shaped mock. Records calls + returns the configured
  // generateObject response (or throws if the response is a throwing fn).
  calls: [] as MockCall[],
  responses: {
    generateObject: {
      passed: true,
      summary: "[MockFixture] LGTM — code is clean and well-tested.",
      comments: [{ line: 7, body: "Consider extracting this into a helper." }],
    } as unknown,
  } as { generateObject?: unknown; generateImage?: Buffer; generateText?: string },
  setResponse(value: unknown) {
    this.responses.generateObject = value;
  },
  setThrowOnGenerateObject(err: Error) {
    this.responses.generateObject = () => {
      throw err;
    };
  },
  reset() {
    this.calls = [];
    this.responses = {
      generateObject: {
        passed: true,
        summary: "[MockFixture] LGTM — code is clean and well-tested.",
        comments: [{ line: 7, body: "Consider extracting this into a helper." }],
      } as unknown,
    };
  },
  async generateObject(input: { schema: z.ZodSchema<unknown>; prompt?: string }): Promise<unknown> {
    mockHolder.calls.push({ method: "generateObject", input });
    const resp = mockHolder.responses.generateObject;
    if (typeof resp === "function") {
      return (resp as () => unknown)();
    }
    // MockProvider-style schema validation: ensure the response shape matches.
    if (resp && typeof resp === "object") {
      const parsed = (input.schema as z.ZodSchema<unknown>).safeParse(resp);
      if (!parsed.success) {
        throw new Error(`Mock response does not match schema: ${parsed.error.message}`);
      }
      return parsed.data;
    }
    return resp;
  },
  async generateImage(): Promise<Buffer> {
    return Buffer.from("mock-image");
  },
  async generateText(): Promise<string> {
    return "mock-text";
  },
}));

const mockGetAIClient = vi.hoisted(() => vi.fn(() => mockHolder));
const mockCreateAIClient = vi.hoisted(() => vi.fn(() => mockHolder));
const mockResetAIClient = vi.hoisted(() => vi.fn(() => undefined));

vi.mock("@reading-advantage/ai", () => {
  return {
    getAIClient: mockGetAIClient,
    createAIClient: mockCreateAIClient,
    resetAIClient: mockResetAIClient,
    MockProvider: class { constructor() { return mockHolder; } },
  };
});

// ─── tRPC test setup ───────────────────────────────────────────────────────

const t = initTRPC.context<{
  tenantDb: ReturnType<typeof createTenantDB>;
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } } | null;
}>().create({
  transformer: superjson,
});

const appRouter = t.router({ codecamp: codecampRouter });

function createCaller(
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } } | null
) {
  const tenantDb = createTenantDB({} as unknown as DB, auth?.tenant ?? { schoolId: null });
  return t.createCallerFactory(appRouter)({ tenantDb, auth });
}

const adminUser = { id: "a1", role: "ADMIN", schoolId: null };
const systemUser = { id: "s1", role: "SYSTEM", schoolId: null };
const studentUser = { id: "u1", role: "STUDENT", schoolId: null };
const testTenant = { schoolId: null as string | null };

const REVIEW_FIXTURE = {
  passed: true,
  summary: "[MockFixture] LGTM — code is clean and well-tested.",
  comments: [
    { line: 7, body: "Consider extracting this into a helper." },
  ],
};

const SAMPLE_DIFF = "diff --git a/file.ts b/file.ts\n+const x = 1;";

// ─── Phase 4: tRPC/API reviewExercise must use the AIClient abstraction ─────

describe("codecamp router — reviewExercise uses the AIClient abstraction", () => {
  beforeAll(() => {
    // Force the AIClient singleton resolution path to the mock — the inline
    // OpenRouter call in the procedure must NOT be reached in the test env.
    process.env.AI_PROVIDER = "mock";
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockHolder.reset();
    // Re-prime after clearAllMocks reset the spy call counts.
    mockGetAIClient.mockImplementation(() => mockHolder);
    mockCreateAIClient.mockImplementation(() => mockHolder);
  });

  afterAll(() => {
    delete process.env.AI_PROVIDER;
  });

  it("invokes the injected AIClient (not the inline OpenRouter call) to generate the review", async () => {
    const caller = createCaller({ user: adminUser, tenant: testTenant });

    await caller.codecamp.reviewExercise({ prDiff: SAMPLE_DIFF });

    // The procedure must obtain an AIClient through the shared abstraction
    // (either the lazy singleton `getAIClient` or an explicit
    // `createAIClient({ provider: "openrouter" })` call). The current inline
    // implementation calls `createOpenAI` from `@ai-sdk/openai` directly,
    // so this assertion fails on master today and passes after Phase 4.
    const aiClientCalls = mockGetAIClient.mock.calls.length + mockCreateAIClient.mock.calls.length;
    expect(aiClientCalls).toBeGreaterThanOrEqual(1);
    // The Mock AIClient must have received the request — proves the call
    // flowed through the AIClient seam, not a hard-coded createOpenAI path.
    expect(mockHolder.calls).toHaveLength(1);
    const call = mockHolder.calls[0]!;
    expect(call.method).toBe("generateObject");
  });

  it("passes the reviewResultSchema to the AIClient.generateObject call", async () => {
    const caller = createCaller({ user: adminUser, tenant: testTenant });

    await caller.codecamp.reviewExercise({ prDiff: SAMPLE_DIFF });

    expect(mockHolder.calls).toHaveLength(1);
    const call = mockHolder.calls[0]!;
    const input = call.input as { schema: z.ZodSchema<unknown> };
    // The schema passed to the AIClient must be the canonical reviewResultSchema
    // (Phase 1 deliverable: the schema is the single output contract).
    expect(input.schema).toBe(reviewResultSchema);
  });

  it("returns the AIClient's review output through the procedure (proves the callback wired through the AIClient seam)", async () => {
    mockHolder.setResponse(REVIEW_FIXTURE);
    const caller = createCaller({ user: adminUser, tenant: testTenant });

    const result = await caller.codecamp.reviewExercise({ prDiff: SAMPLE_DIFF });

    // The returned review must be the Mock AIClient's fixture — NOT the
    // hard-coded "[Mock review — LLM not configured]" string from the inline
    // implementation, and NOT the OpenAI SDK response. This is the regression
    // guard for FR-4: the procedure must route the LLM call through the
    // shared `reviewExercise` + `aiClientToGenerateReview(getAIClient(), ...)`
    // seam, not the inline `createOpenAI({...})` + `generateObject(...)` call.
    expect(result.passed).toBe(true);
    expect(result.summary).toBe(REVIEW_FIXTURE.summary);
    expect(result.summary).not.toContain("LLM not configured");
    expect(result.comments).toEqual(REVIEW_FIXTURE.comments);
  });

  it("returns the AIClient's review output for SYSTEM user (adminProcedure allows SYSTEM)", async () => {
    mockHolder.setResponse(REVIEW_FIXTURE);
    const caller = createCaller({ user: systemUser, tenant: testTenant });

    const result = await caller.codecamp.reviewExercise({ prDiff: SAMPLE_DIFF });

    // Per the existing `adminProcedure` middleware at packages/api/src/trpc.ts,
    // SYSTEM role is accepted alongside ADMIN. The procedure must run for
    // SYSTEM callers, return the AIClient's review, and NOT bubble a 403.
    expect(result.passed).toBe(true);
    expect(result.summary).toBe(REVIEW_FIXTURE.summary);
  });

  it("rejects non-admin (STUDENT) callers with FORBIDDEN before reaching the AIClient", async () => {
    const caller = createCaller({ user: studentUser, tenant: testTenant });

    await expect(
      caller.codecamp.reviewExercise({ prDiff: SAMPLE_DIFF })
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: "Admin access required" });

    // The AIClient must NOT be reached — the guard fires at the tRPC middleware
    // layer, not inside the procedure body.
    expect(mockHolder.calls).toHaveLength(0);
  });

  it("surfaces an AIClient error as INTERNAL_SERVER_ERROR via mapDomainError", async () => {
    // Configure the Mock AIClient to throw on generateObject. This mirrors a
    // production failure mode (e.g. upstream model timeout, HTTP 404 from
    // OpenRouter, schema validation failure in the model response). The
    // procedure's `try/catch` + `mapDomainError` must surface this as
    // `INTERNAL_SERVER_ERROR` — NOT 200 with a swallowed error (that's the
    // webhook fire-and-forget posture, NOT the synchronous tRPC contract).
    mockHolder.setThrowOnGenerateObject(new Error("[MockFixture] model timed out"));
    const caller = createCaller({ user: adminUser, tenant: testTenant });

    await expect(
      caller.codecamp.reviewExercise({ prDiff: SAMPLE_DIFF })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
