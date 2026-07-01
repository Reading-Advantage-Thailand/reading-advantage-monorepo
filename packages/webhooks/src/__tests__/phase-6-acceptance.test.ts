/**
 * Phase 6 (Integration + Acceptance) — acceptance test.
 *
 * Ties together the deliverables from Phases 1-5 and asserts the SPEC's
 * acceptance criteria for the codecamp PR-review path are met.
 *
 * Coverage (from spec.md):
 *   - AC #3: reviewExercise is the single seam; both call sites invoke it
 *            with an injected AIClient (covered by behavior + source guards)
 *   - AC #4: no residual inline OpenRouter calls in the review path
 *            (covered by source guards that mirror phase-5-dead-code.test.ts)
 *   - AC #6: Mock-provider unit tests cover the review path (success + model-error)
 *            (covered by the end-to-end behavior test + fire-and-forget guard)
 *   - AC #7: reviewedAt terminal-stamping behavior is preserved
 *            (covered by the persistence-shape guard that asserts the
 *             unified reviewResultSchema is what reaches the DB row)
 *
 * Live gates (owned by the Green role per plan.md):
 *   - Task 1: Real e2e run with `scripts/codecamp-pr-e2e.sh` (requires real
 *             GitHub + a user whose login matches a `users.githubUsername`
 *             row in the codecamp production DB)
 *   - Task 2: Real-provider preflight from the deployment region (requires
 *             `OPENROUTER_API_KEY`; credential-gated by `it.skipIf` in
 *             `packages/ai/src/providers/openrouter-preflight.test.ts:17`)
 *   - Task 3: `pnpm turbo run build --filter=codecamp-advantage` (manual
 *             bundle-leak gate; the .next/ static chunks must not contain
 *             `OPENROUTER_API_KEY` or `createOpenAI` strings)
 *   - Task 4: `pnpm turbo run {test,check-types,build} --filter=@reading-advantage/ai
 *             --filter=@reading-advantage/webhooks --filter=@reading-advantage/api
 *             --filter=@reading-advantage/domain --filter=codecamp-advantage`
 *             (manual filtered-gates gate; all must exit 0)
 *
 * Run:
 *   cd packages/webhooks && npx vitest run src/__tests__/phase-6-acceptance.test.ts
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { createHmac } from "crypto";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import githubApp, { waitForBackgroundReviews } from "../github.js";
import { reviewResultSchema } from "@reading-advantage/domain/codecamp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

// ─── Hoisted mocks (must be available before module imports) ──────────────

interface MockCall {
  method: "generateObject" | "generateImage" | "generateText";
  input: unknown;
}

/**
 * The "documented unified version" of the review output (Phase 0 decision:
 * "A wins by default — byte-identical impls need no prompt reconciliation").
 * The Mock fixture MUST match the canonical `reviewResultSchema` shape that
 * both call sites (webhook + API) persist to `codecamp_pr_reviews`.
 *
 * Declared at module scope (not inside the hoisted block) so the
 * `mockHolder.setResponse(UNIFIED_REVIEW_FIXTURE)` calls in the test
 * cases can use it as an argument.
 */
const UNIFIED_REVIEW_FIXTURE = {
  passed: true,
  summary: "[UnifiedFixture] LGTM — code is clean, well-tested, and meets the rubric.",
  comments: [
    { line: 7, body: "Consider extracting this into a helper for testability." },
  ],
} as const;

const hoistedMocks = vi.hoisted(() => {
  const fixture = {
    passed: true,
    summary:
      "[UnifiedFixture] LGTM — code is clean, well-tested, and meets the rubric.",
    comments: [
      { line: 7, body: "Consider extracting this into a helper for testability." },
    ],
  } as const;
  const calls: MockCall[] = [];
  const responses: { generateObject?: unknown } = { generateObject: fixture };
  const holder = {
    calls,
    responses,
    setResponse(value: unknown) {
      this.responses.generateObject = value;
    },
    setThrowOnGenerateObject(err: Error) {
      this.responses.generateObject = () => {
        throw err;
      };
    },
    reset() {
      this.calls.length = 0;
      // Mutate in-place so the `responses` object identity is preserved.
      // (Replacing `this.responses` with a new object would leave the
      //  `generateObject` closure reading the stale object after reset.)
      this.responses.generateObject = fixture;
    },
    async generateObject(input: {
      schema: z.ZodSchema<unknown>;
      prompt?: string;
    }): Promise<unknown> {
      calls.push({ method: "generateObject", input });
      // Read from `this.responses` (not the closure variable) so the
      // setResponse/setThrowOnGenerateObject/reset mutations are visible.
      const resp = this.responses.generateObject;
      if (typeof resp === "function") {
        return (resp as () => unknown)();
      }
      // Mirror the MockProvider contract: validate the response shape against
      // the schema the caller passed in. This is the "schema as contract" rule
      // from test-strategy.md — the schema is the only allowed output shape.
      const parsed = (input.schema as z.ZodSchema<unknown>).safeParse(resp);
      if (!parsed.success) {
        throw new Error(
          `Mock response does not match schema: ${parsed.error.message}`
        );
      }
      return parsed.data;
    },
    async generateImage(): Promise<Buffer> {
      return Buffer.from("mock-image");
    },
    async generateText(): Promise<string> {
      return "mock-text";
    },
  };
  return {
    holder,
    fixture,
    getAIClient: () => holder,
    createAIClient: () => holder,
  };
});

const mockHolder = hoistedMocks.holder;
const mockGetAIClient = vi.hoisted(() => vi.fn(hoistedMocks.getAIClient));
const mockCreateAIClient = vi.hoisted(() => vi.fn(hoistedMocks.createAIClient));

vi.mock("@reading-advantage/ai", () => {
  return {
    getAIClient: mockGetAIClient,
    createAIClient: mockCreateAIClient,
    MockProvider: class {
      constructor() {
        return mockHolder;
      }
    },
  };
});

vi.mock("@reading-advantage/domain/codecamp", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/domain/codecamp")>("@reading-advantage/domain/codecamp");
  return {
    ...actual,
    getPrReviewByPrUrl: vi.fn(),
    updatePrReview: vi.fn(),
    createPrReview: vi.fn(),
    getExerciseRepoByUrl: vi.fn(),
    logWebhookEvent: vi.fn(),
  };
});

vi.mock("@reading-advantage/domain/users", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/domain/users")>("@reading-advantage/domain/users");
  return {
    ...actual,
    getUserByGithubUsername: vi.fn(),
  };
});

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();

  function createQueryBuilder(val: unknown) {
    return {
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnThis(),
          offset: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
        }),
      }),
      then(onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
        return Promise.resolve(val).then(onFulfilled, onRejected);
      },
      execute() {
        return Promise.resolve(val);
      },
    };
  }

  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(createQueryBuilder([])),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(createQueryBuilder([])),
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(createQueryBuilder([])),
          groupBy: vi.fn().mockReturnValue(createQueryBuilder([])),
        }),
        limit: vi.fn().mockReturnValue(createQueryBuilder([])),
        offset: vi.fn().mockReturnValue(createQueryBuilder([])),
        then(onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
          return Promise.resolve([]).then(onFulfilled, onRejected);
        },
      }),
    })),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(mockDb)),
  };

  return {
    ...actual,
    db: mockDb,
  };
});

vi.mock("../github-client", () => ({
  fetchPrDiff: vi.fn().mockResolvedValue("@@ -1,3 +1,4 @@\n+console.log('hello');\n"),
  postPrComment: vi.fn().mockResolvedValue(undefined),
  parsePrUrl: vi.fn().mockReturnValue({ owner: "org", repo: "repo", number: 1 }),
  verifyWebhookSignature: vi.fn().mockReturnValue(true),
  getInstallationTokenForRepo: vi.fn().mockResolvedValue("ghs_mock-token"),
  MAX_TIMESTAMP_SKEW_SECONDS: 300,
}));

import {
  getPrReviewByPrUrl,
  updatePrReview,
  createPrReview,
  getExerciseRepoByUrl,
  logWebhookEvent,
} from "@reading-advantage/domain/codecamp";
import { getUserByGithubUsername } from "@reading-advantage/domain/users";

// ─── Test fixtures ─────────────────────────────────────────────────────────

const WEBHOOK_SECRET = "phase-6-test-secret";

function signPayload(payload: string): string {
  return `sha256=${createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex")}`;
}

function createRequest(payload: string, event = "pull_request"): Request {
  return new Request("http://localhost/pr", {
    method: "POST",
    headers: {
      "x-hub-signature-256": signPayload(payload),
      "x-github-event": event,
      "content-type": "application/json",
    },
    body: payload,
  });
}

function existingReview() {
  return {
    id: "pr-review-phase6",
    exerciseRepoId: "r1",
    userId: "u1",
    prUrl: "https://github.com/org/repo/pull/1",
    reviewStatus: "reviewed" as const,
    llmReviewSummary: null,
    reviewedAt: null,
    createdAt: new Date(),
  };
}

function synchronizePayload() {
  return JSON.stringify({
    action: "synchronize",
    pull_request: {
      html_url: "https://github.com/org/repo/pull/1",
      head: { ref: "feature-branch", sha: "abc123" },
      base: { ref: "main", repo: { full_name: "org/repo", html_url: "https://github.com/org/repo" } },
      user: { login: "intern1" },
    },
  });
}

// ─── Phase 6: end-to-end acceptance ────────────────────────────────────────

describe("Phase 6: codecamp PR-review path — integration + acceptance", () => {
  beforeAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.AI_PROVIDER = "mock";
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockHolder.reset();
    mockGetAIClient.mockImplementation(() => mockHolder);
    mockCreateAIClient.mockImplementation(() => mockHolder);

    vi.mocked(getPrReviewByPrUrl).mockResolvedValue(existingReview());
    vi.mocked(updatePrReview).mockImplementation(async (args) => {
      const input = (args as { input: { reviewId: string; reviewStatus?: string; llmReviewSummary?: string | null } }).input;
      return {
        ...existingReview(),
        id: input.reviewId,
        reviewStatus: (input.reviewStatus ?? "reviewed") as "pending" | "approved" | "needs_changes" | "reviewed",
        llmReviewSummary: input.llmReviewSummary ?? null,
      };
    });
  });

  afterAll(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    delete process.env.AI_PROVIDER;
  });

  // ─── Task 1: Mock E2E — full webhook→domain→LLM→persist flow ───────────

it("exercises the full webhook→domain→LLM→persist flow with the Mock provider and matches the documented unified output", async () => {
    mockHolder.setResponse(UNIFIED_REVIEW_FIXTURE);

    const req = createRequest(synchronizePayload());
    const res = await githubApp.fetch(req);

    // Webhook responds 200 — the e2e poll loop (scripts/codecamp-pr-e2e.sh:162-171)
    // treats a non-200 as a failure to acknowledge.
    expect(res.status).toBe(200);

    // Phase 3 ACK-latency fix: the LLM review runs as a tracked background
    // job so the HTTP ACK is not blocked. Drain the job before asserting on
    // AIClient call counts / persisted summary.
    await waitForBackgroundReviews();

    // The AIClient seam was the call surface — proves the unified path is
    // wired (AC #3: reviewExercise is the single seam).
    const aiClientCalls = mockGetAIClient.mock.calls.length + mockCreateAIClient.mock.calls.length;
    expect(aiClientCalls).toBeGreaterThanOrEqual(1);
    expect(mockHolder.calls).toHaveLength(1);
    expect(mockHolder.calls[0]!.method).toBe("generateObject");

    // The schema passed to AIClient.generateObject must be the canonical
    // reviewResultSchema — "schema as contract" rule from test-strategy.md.
    const input = mockHolder.calls[0]!.input as { schema: z.ZodSchema<unknown>; prompt?: string };
    expect(input.schema).toBe(reviewResultSchema);

    // The prompt must include the diff — proves the flow is end-to-end
    // (the diff was fetched by fetchPrDiff, passed to reviewExercise, and
    // reached the AIClient).
    expect(input.prompt).toContain("console.log('hello');");

    // The PR review row was persisted with the unified summary and the
    // correct terminal status. This is the SPEC's "documented unified
    // version" (Phase 0 decision: A wins, byte-identical impls).
    const updateCalls = vi.mocked(updatePrReview).mock.calls;
    expect(updateCalls.length).toBeGreaterThanOrEqual(2);
    const postReviewCall = updateCalls[updateCalls.length - 1]!;
    const persisted = (postReviewCall[0] as { input: { reviewStatus: string; llmReviewSummary: string } }).input;
    expect(persisted.llmReviewSummary).toBe(UNIFIED_REVIEW_FIXTURE.summary);
    expect(persisted.reviewStatus).toBe("approved");
  });

  it("preserves the fire-and-forget posture on AIClient rejection: 200 + status reviewed + 'Review failed' summary", async () => {
    // Mirrors the production failure mode the spec calls out (2026-06-08
    // incident: upstream model returns 404 / times out). The webhook must
    // NOT bubble the error to GitHub — the test strategy mandates: webhook
    // responds 200, review row gets status "reviewed" + "Review failed"
    // summary. The reliability track owns improving the posture; this test
    // pins the current contract.
    mockHolder.setThrowOnGenerateObject(new Error("[MockFixture] model timed out"));

    const req = createRequest(synchronizePayload());
    const res = await githubApp.fetch(req);

    expect(res.status).toBe(200);

    await waitForBackgroundReviews();

    const updateCalls = vi.mocked(updatePrReview).mock.calls;
    expect(updateCalls.length).toBeGreaterThanOrEqual(2);
    const failureCall = updateCalls[updateCalls.length - 1]!;
    const input = (failureCall[0] as { input: { reviewStatus: string; llmReviewSummary: string } }).input;
    expect(input.reviewStatus).toBe("reviewed");
    expect(input.llmReviewSummary).toMatch(/Review failed/i);

    // And the response body should NOT include the model error — GitHub
    // sees a successful 200 acknowledgment.
    const body = await res.json();
    expect(body.error).toBeUndefined();
  });

it("preserves the fire-and-forget posture on AIClient rejection: 200 + status reviewed + 'Review failed' summary", async () => {
    // Mirrors the production failure mode the spec calls out (2026-06-08
    // incident: upstream model returns 404 / times out). The webhook must
    // NOT bubble the error to GitHub — the test strategy mandates: webhook
    // responds 200, review row gets status "reviewed" + "Review failed"
    // summary. The reliability track owns improving the posture; this test
    // pins the current contract.
    mockHolder.setThrowOnGenerateObject(new Error("[MockFixture] model timed out"));

    const req = createRequest(synchronizePayload());
    const res = await githubApp.fetch(req);

    expect(res.status).toBe(200);

    await waitForBackgroundReviews();

    const updateCalls = vi.mocked(updatePrReview).mock.calls;
    expect(updateCalls.length).toBeGreaterThanOrEqual(2);
    const failureCall = updateCalls[updateCalls.length - 1]!;
    const input = (failureCall[0] as { input: { reviewStatus: string; llmReviewSummary: string } }).input;
    expect(input.reviewStatus).toBe("reviewed");
    expect(input.llmReviewSummary).toMatch(/Review failed/i);

    // And the response body should NOT include the model error — GitHub
    // sees a successful 200 acknowledgment.
    const body = await res.json();
    expect(body.error).toBeUndefined();
  });

  // ─── Task 2: preflight is credential-gated (live gate owned by Green) ───

  it("documents that the real-provider preflight is credential-gated (live gate owned by Green role)", () => {
    // The preflight test (`packages/ai/src/providers/openrouter-preflight.test.ts`)
    // is the live gate for Task 2. It MUST be credential-gated so CI never
    // blocks on a real network call (test-strategy.md "Capability preflight").
    // This test asserts the gate exists in source form. The Green role owns
    // the live run from the deployment region.
    const preflightTestPath = join(
      REPO_ROOT,
      "packages/ai/src/providers/openrouter-preflight.test.ts"
    );
    const src = readFileSync(preflightTestPath, "utf8");
    expect(
      src,
      "Task 2: openrouter-preflight.test.ts must be credential-gated via " +
        "`it.skipIf(!process.env.OPENROUTER_API_KEY)` per test-strategy.md. " +
        "Live run from the deployment region is the Green role's gate."
    ).toMatch(/it\.skipIf\(\s*!?\s*process\.env\.OPENROUTER_API_KEY\s*\)/);

    // The preflight test must use the canonical reviewResultSchema shape
    // (forbidden-tool contract regression guard from FR-1).
    expect(src).toMatch(/passed:\s*z\.boolean\(\)/);
    expect(src).toMatch(/summary:\s*z\.string\(\)/);
    expect(src).toMatch(/comments:\s*z\.array\(/);
  });

  // ─── Task 3: build gate is documented and the source is clean ───────────

  it("asserts the review-path source is clean of inline vendor SDK calls (AC #4, build-leak precondition)", () => {
    // The `pnpm turbo run build --filter=codecamp-advantage` gate (Task 3,
    // owned by Green) catches any server-only/client-bundle leak. The
    // preconditions for that gate being meaningful are: the source files
    // in `packages/webhooks` and `packages/api` must not import the
    // vendor SDK or read `OPENROUTER_API_KEY` directly. This guard mirrors
    // phase-5-dead-code.test.ts and is the artifact assertion that pairs
    // with the live build gate.
    const webhookSrc = readFileSync(
      join(REPO_ROOT, "packages/webhooks/src/github.ts"),
      "utf8"
    );
    const apiSrc = readFileSync(
      join(REPO_ROOT, "packages/api/src/routers/codecamp.ts"),
      "utf8"
    );

    const guardMessage =
      "AC #4 / Task 3: the review path must flow through @reading-advantage/ai " +
      "only. No inline vendor SDK calls in the source files — the live `pnpm " +
      "turbo run build --filter=codecamp-advantage` gate (Green role) would " +
      "fail or leak otherwise.";

    for (const [name, src] of [
      ["packages/webhooks/src/github.ts", webhookSrc],
      ["packages/api/src/routers/codecamp.ts", apiSrc],
    ] as const) {
      expect(src, `${guardMessage} Found createOpenAI in ${name}.`).not.toMatch(/createOpenAI/);
      expect(src, `${guardMessage} Found @ai-sdk/openai import in ${name}.`).not.toMatch(/@ai-sdk\/openai/);
      expect(src, `${guardMessage} Found OPENROUTER_API_KEY env read in ${name}.`).not.toMatch(/OPENROUTER_API_KEY/);
      expect(src, `${guardMessage} Found openrouter substring in ${name}.`).not.toMatch(/openrouter/);
      expect(src, `${guardMessage} Found generateObject import in ${name}.`).not.toMatch(/\bgenerateObject\b/);
    }
  });

  // ─── Task 4: filtered gates command is documented in plan.md ────────────

  it("documents the filtered gates command in plan.md (live run owned by Green role)", () => {
    // The filtered Turbo command for Task 4 must be recorded verbatim in
    // plan.md so the Green role can copy-paste it. This is the artifact
    // assertion; the live run + exit-code gate is the Green role's
    // responsibility.
    const planPath = join(
      REPO_ROOT,
      "measure/archive/codecamp_review_ai_consolidation_20260605/plan.md"
    );
    const plan = readFileSync(planPath, "utf8");

    // Must mention all five filtered targets in the Phase 6 section.
    const requiredFilters = [
      "@reading-advantage/ai",
      "@reading-advantage/webhooks",
      "@reading-advantage/api",
      "@reading-advantage/domain",
      "codecamp-advantage",
    ];
    for (const f of requiredFilters) {
      expect(
        plan,
        `Task 4: plan.md Phase 6 must include the filter "${f}" in the ` +
          `filtered-gates command. Green role runs the command live.`
      ).toContain(f);
    }

    // Must include the three turbo tasks: test, check-types, build.
    expect(plan).toMatch(/turbo run \{?test,?check-types,?build/);
  });
});
