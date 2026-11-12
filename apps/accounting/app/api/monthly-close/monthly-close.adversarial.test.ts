// @vitest-environment node
/**
 * Adversarial flow tests for the monthly close routes, Phase 2 of
 * accounting_drive_intake_20261109.
 *
 * Unlike the route tests, these rows keep the real route, the real app adapter
 * (`@/app/lib/monthly-close`), the real domain, and the real PostgreSQL
 * repository of the backend package. Only three seams are doubles: the session
 * guard, the private evidence storage, and the SQL client. The SQL double keeps
 * the close rows and the audit rows in memory and applies the compare-and-swap
 * of the real `update` statement, so a domain rejection reaches the route as
 * the real error class. No real database, no real finance row, no network.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  closes: [] as Record<string, unknown>[],
  audits: [] as Record<string, unknown>[],
  statements: [] as string[],
  updateExpectedStatuses: [] as unknown[],
  onUpdate: undefined as undefined | ((updateIndex: number) => void),
  insertError: undefined as unknown,
  evidencePuts: 0,
}));

const mocks = vi.hoisted(() => ({
  requireAccountingSession: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  requireAccountingSession: mocks.requireAccountingSession,
}));

vi.mock("@/app/lib/private-evidence-storage", () => ({
  putPrivateEvidence: vi.fn(
    async (input: { readonly companyId: string }) => {
      state.evidencePuts += 1;
      return {
        evidenceReference: `private-evidence://${input.companyId}/monthly-closes/report-${state.evidencePuts}/report`,
      };
    },
  ),
  readPrivateEvidence: vi.fn(async () => new Uint8Array()),
}));

vi.mock("@reading-advantage/db/accounting/runtime", () => ({
  createAccountingRuntimeClient: vi.fn(async () => {
    return (strings: TemplateStringsArray, ...values: unknown[]) =>
      Promise.resolve(handleStatement(strings.join("?"), values));
  }),
}));

/**
 * Applies one tagged statement of the real repository to the in-memory store.
 * @param statement Statement text with `?` in the place of each bound value.
 * @param values Bound values in statement order.
 * @returns The rows the statement returns.
 */
function handleStatement(
  statement: string,
  values: readonly unknown[],
): Record<string, unknown>[] {
  const lower = statement.toLowerCase();
  state.statements.push(lower);

  if (lower.includes("insert into accounting_monthly_close_audit_events")) {
    state.audits.push({
      close_id: values[1],
      action: values[2],
      actor_account_id: values[3],
      actor_role: values[4],
    });
    return [];
  }
  if (lower.includes("insert into accounting_monthly_closes")) {
    if (state.insertError !== undefined) throw state.insertError;
    const duplicate = state.closes.some(
      (row) => row.scope_company_id === values[10] && row.period_month === values[1],
    );
    if (duplicate) {
      throw Object.assign(new Error("duplicate key value"), { code: "23505" });
    }
    const row = {
      id: values[0],
      period_month: values[1],
      status: values[2],
      report_evidence_reference: values[3],
      opened_by_account_id: values[4],
      opened_at: values[5],
      signed_by_account_id: values[6],
      signed_by_role: values[7],
      signed_at: values[8],
      locked_at: values[9],
      scope_company_id: values[10],
    };
    state.closes.push(row);
    return [{ ...row }];
  }
  if (lower.includes("update accounting_monthly_closes")) {
    const updateIndex = state.updateExpectedStatuses.length;
    state.updateExpectedStatuses.push(values[8]);
    state.onUpdate?.(updateIndex);
    const row = state.closes.find(
      (candidate) =>
        candidate.id === values[6] && candidate.scope_company_id === values[7],
    );
    if (row === undefined || row.status !== values[8]) return [];
    Object.assign(row, {
      status: values[0],
      report_evidence_reference: values[1],
      signed_by_account_id: values[2],
      signed_by_role: values[3],
      signed_at: values[4],
      locked_at: values[5],
    });
    return [{ ...row }];
  }
  if (lower.includes("from accounting_submissions")) {
    return [];
  }
  if (lower.includes("from accounting_monthly_closes")) {
    if (/and\s+period_month\s*=/u.test(lower)) {
      return state.closes
        .filter(
          (row) => row.scope_company_id === values[0] && row.period_month === values[1],
        )
        .map((row) => ({ ...row }));
    }
    if (/and\s+id\s*=/u.test(lower)) {
      return state.closes
        .filter((row) => row.scope_company_id === values[0] && row.id === values[1])
        .map((row) => ({ ...row }));
    }
    return state.closes
      .filter((row) => row.scope_company_id === values[0])
      .map((row) => ({ ...row }));
  }
  throw new Error(`Unexpected statement: ${lower}`);
}

import { POST as signPOST } from "./[id]/sign/route";
import { GET, POST } from "./route";

const COMPANY_A = "33333333-3333-4333-8333-3333333333a1";
const COMPANY_B = "33333333-3333-4333-8333-3333333333b2";
const OWNER_ID = "99999999-9999-4999-8999-999999999999";
const ACCOUNTANT_ID = "77777777-7777-4777-8777-777777777777";
const CEO_ID = "88888888-8888-4888-8888-888888888888";
const CLOSE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const FOREIGN_CLOSE_ID = "dddddddd-dddd-4ddd-8ddd-ddddddddddd2";
const UNKNOWN_CLOSE_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const DENIED_SIGN_ROLES = ["OWNER", "ACCOUNTANT", "STAFF", "CONTRACTOR", "ADMIN"];
const DENIED_OPEN_ROLES = ["CEO", "STAFF", "CONTRACTOR", "ADMIN"];
const DENIED_LIST_ROLES = ["STAFF", "CONTRACTOR", "ADMIN"];

const HOSTILE_CLOSE_IDS: readonly (string | undefined)[] = [
  "",
  " ",
  "not-a-uuid",
  "../../etc/passwd",
  "1' OR '1'='1",
  `${CLOSE_ID}\n`,
  `${CLOSE_ID} `,
  undefined,
];

const HOSTILE_BODIES: readonly (readonly [string, string | undefined])[] = [
  ["an empty body", undefined],
  ["malformed JSON", "{"],
  ["a JSON null", "null"],
  ["a JSON array", "[]"],
  ["a JSON string", '"2026-11"'],
  ["an empty object", "{}"],
  ["a null month", '{"periodMonth":null}'],
  ["a numeric month", '{"periodMonth":202611}'],
  ["an object month", '{"periodMonth":{"$ne":""}}'],
  ["an array month", '{"periodMonth":["2026-11"]}'],
  ["an empty month", '{"periodMonth":""}'],
];

const HOSTILE_MONTHS = [
  "2026-13",
  "2026-00",
  "2026-1",
  "202611",
  "2026-11\n",
  " 2026-11",
  "2026-11 ",
  "2026-10",
  "2025-12",
  "2026-11-01",
  "2026-11'; drop table accounting_monthly_closes; --",
];

/**
 * Builds a session user.
 * @param role Role of the session user.
 * @param organizationId Company of the session user.
 * @param id Account id of the session user.
 * @returns The user the guard double returns.
 */
function sessionUser(role: string, organizationId = COMPANY_A, id = CEO_ID) {
  return {
    id,
    username: `user-${role}`,
    name: `Test ${role}`,
    role,
    organizationId,
    applicationRoles: [role],
  };
}

/**
 * Signs a session user in through the guard double.
 * @param role Role of the session user.
 * @param organizationId Company of the session user.
 * @param id Account id of the session user.
 */
function signIn(role: string, organizationId = COMPANY_A, id = CEO_ID): void {
  mocks.requireAccountingSession.mockResolvedValue({
    ok: true,
    session: { user: sessionUser(role, organizationId, id) },
  });
}

/**
 * Builds one stored close row of the SQL double.
 * @param overrides Columns that differ from an open close of company A.
 * @returns The raw close row.
 */
function storedClose(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: CLOSE_ID,
    period_month: "2026-11",
    status: "open",
    report_evidence_reference: `private-evidence://${COMPANY_A}/monthly-closes/report-0/report`,
    opened_by_account_id: OWNER_ID,
    opened_at: "2026-11-01T02:03:04.000Z",
    signed_by_account_id: null,
    signed_by_role: null,
    signed_at: null,
    locked_at: null,
    scope_company_id: COMPANY_A,
    ...overrides,
  };
}

/** Builds a sign request. */
function signRequest(closeId: string | undefined = CLOSE_ID): Request {
  return new Request(`http://localhost/api/monthly-close/${closeId ?? ""}/sign`, {
    method: "POST",
    headers: { origin: "http://localhost" },
  });
}

/** Builds the sign route context. */
function signContext(closeId: string | undefined = CLOSE_ID) {
  return { params: Promise.resolve({ id: closeId as string }) };
}

/** Builds an open request with a raw body. */
function openRequest(rawBody: string | undefined): Request {
  return new Request("http://localhost/api/monthly-close", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: rawBody,
  });
}

/** Builds a list request. */
function listRequest(): Request {
  return new Request("http://localhost/api/monthly-close");
}

const LEAK_MARKERS = [
  "accounting_monthly_close",
  "select ",
  "scope_company_id",
  "stack",
  "ZodError",
  "node_modules",
  COMPANY_A,
  COMPANY_B,
];

/**
 * Asserts that a response body names no internal detail.
 * @param text Serialized response body.
 */
function expectNoInternalDetail(text: string): void {
  for (const marker of LEAK_MARKERS) {
    expect(text, `the body leaks "${marker}"`).not.toContain(marker);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  state.closes = [];
  state.audits = [];
  state.statements = [];
  state.updateExpectedStatuses = [];
  state.onUpdate = undefined;
  state.insertError = undefined;
  state.evidencePuts = 0;
  signIn("CEO");
});

describe("POST /api/monthly-close/[id]/sign through the real domain", () => {
  it("signs and locks an open close with the sign row and the lock row of the CEO", async () => {
    state.closes = [storedClose()];

    const response = await signPOST(signRequest(), signContext());

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      id: CLOSE_ID,
      status: "locked",
      signedByAccountId: CEO_ID,
      signedByRole: "CEO",
      scopeCompanyId: COMPANY_A,
    });
    expect(typeof body.signedAt).toBe("string");
    expect(typeof body.lockedAt).toBe("string");
    expect(state.updateExpectedStatuses).toEqual(["open", "signed"]);
    expect(state.audits).toEqual([
      expect.objectContaining({
        close_id: CLOSE_ID,
        action: "monthly-close-sign",
        actor_account_id: CEO_ID,
        actor_role: "CEO",
      }),
      expect.objectContaining({
        close_id: CLOSE_ID,
        action: "monthly-close-lock",
        actor_account_id: CEO_ID,
        actor_role: "CEO",
      }),
    ]);
  });

  it("answers a second sign with the same locked close and writes no update and no audit row", async () => {
    state.closes = [storedClose()];
    const first = await signPOST(signRequest(), signContext());
    const firstBody = await first.json();
    const updates = state.updateExpectedStatuses.length;
    const audits = state.audits.length;

    const second = await signPOST(signRequest(), signContext());

    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(firstBody);
    expect(state.updateExpectedStatuses).toHaveLength(updates);
    expect(state.audits).toHaveLength(audits);
  });

  it.each(DENIED_SIGN_ROLES)(
    "answers the role %s with 403 and touches no row",
    async (role) => {
      state.closes = [storedClose()];
      signIn(role, COMPANY_A, OWNER_ID);

      const response = await signPOST(signRequest(), signContext());

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ message: "Forbidden" });
      expect(state.statements).toHaveLength(0);
      expect(state.closes[0]?.status).toBe("open");
      expect(state.audits).toHaveLength(0);
    },
  );

  it("answers 404 with a fixed body for a close of another company and for an unknown close", async () => {
    state.closes = [storedClose({ id: FOREIGN_CLOSE_ID, scope_company_id: COMPANY_B })];

    const foreign = await signPOST(signRequest(FOREIGN_CLOSE_ID), signContext(FOREIGN_CLOSE_ID));
    const unknown = await signPOST(signRequest(UNKNOWN_CLOSE_ID), signContext(UNKNOWN_CLOSE_ID));

    for (const response of [foreign, unknown]) {
      expect(response.status).toBe(404);
      const text = await response.text();
      expect(JSON.parse(text)).toEqual({ message: "Monthly close not found" });
      expectNoInternalDetail(text);
    }
    expect(state.updateExpectedStatuses).toHaveLength(0);
    expect(state.audits).toHaveLength(0);
    expect(state.closes[0]?.status).toBe("open");
  });

  it("does not let a CEO of company B sign the close of company A", async () => {
    state.closes = [storedClose()];
    signIn("CEO", COMPANY_B);

    const response = await signPOST(signRequest(), signContext());

    expect(response.status).toBe(404);
    expect(state.closes[0]?.status).toBe("open");
    expect(state.audits).toHaveLength(0);
  });

  it.each(HOSTILE_CLOSE_IDS)(
    "answers the close id %j with 400, a fixed message, and no database call",
    async (closeId) => {
      state.closes = [storedClose()];

      const response = await signPOST(signRequest(closeId), {
        params: Promise.resolve({ id: closeId as string }),
      });

      expect(response.status).toBe(400);
      const text = await response.text();
      const body = JSON.parse(text) as Record<string, unknown>;
      expect(Object.keys(body).sort()).toEqual(["fieldErrors", "message"]);
      expect(body.message).toBe("Monthly close validation failed");
      expectNoInternalDetail(text);
      expect(state.statements).toHaveLength(0);
    },
  );

  it("answers 409 with a fixed body and writes no row when the sign loses the compare-and-swap", async () => {
    state.closes = [storedClose()];
    state.onUpdate = (updateIndex) => {
      if (updateIndex === 0 && state.closes[0] !== undefined) {
        state.closes[0].status = "locked";
      }
    };

    const response = await signPOST(signRequest(), signContext());

    expect(response.status).toBe(409);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({
      message: "The monthly close changed and cannot be signed",
    });
    expectNoInternalDetail(text);
    expect(state.audits).toHaveLength(0);
  });

  it("answers 409 and keeps the sign row when only the lock loses the compare-and-swap", async () => {
    state.closes = [storedClose()];
    state.onUpdate = (updateIndex) => {
      if (updateIndex === 1 && state.closes[0] !== undefined) {
        state.closes[0].status = "locked";
        state.closes[0].locked_at = "2026-11-30T02:03:04.000Z";
      }
    };

    const response = await signPOST(signRequest(), signContext());

    expect(response.status).toBe(409);
    expect(state.audits.map((row) => row.action)).toEqual(["monthly-close-sign"]);
  });

  it("finishes the lock of a close stranded at status signed with one lock row and no sign row", async () => {
    state.closes = [
      storedClose({
        status: "signed",
        signed_by_account_id: CEO_ID,
        signed_by_role: "CEO",
        signed_at: "2026-11-29T02:03:04.000Z",
      }),
    ];

    const response = await signPOST(signRequest(), signContext());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "locked" });
    expect(state.audits.map((row) => row.action)).toEqual(["monthly-close-lock"]);
  });

  it("lets exactly one of two concurrent signs write the sign row and the lock row", async () => {
    state.closes = [storedClose()];

    const [first, second] = await Promise.all([
      signPOST(signRequest(), signContext()),
      signPOST(signRequest(), signContext()),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses.every((status) => status === 200 || status === 409)).toBe(true);
    expect(statuses).toContain(200);
    expect(state.audits.filter((row) => row.action === "monthly-close-sign")).toHaveLength(1);
    expect(state.audits.filter((row) => row.action === "monthly-close-lock")).toHaveLength(1);
    expect(state.closes[0]?.status).toBe("locked");
  });
});

describe("POST /api/monthly-close through the real domain", () => {
  it.each(HOSTILE_BODIES)(
    "answers %s with 400 and the fixed body message and no database call",
    async (_label, rawBody) => {
      signIn("OWNER", COMPANY_A, OWNER_ID);

      const response = await POST(openRequest(rawBody));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ message: "Invalid request body" });
      expect(state.statements).toHaveLength(0);
    },
  );

  it.each(HOSTILE_MONTHS)(
    "answers the period month %j with 400 from the domain and no database call",
    async (periodMonth) => {
      signIn("OWNER", COMPANY_A, OWNER_ID);

      const response = await POST(openRequest(JSON.stringify({ periodMonth })));

      expect(response.status).toBe(400);
      const text = await response.text();
      const body = JSON.parse(text) as Record<string, unknown>;
      expect(body.message).toBe("Monthly close validation failed");
      expectNoInternalDetail(text);
      expect(state.statements).toHaveLength(0);
    },
  );

  it.each(DENIED_OPEN_ROLES)(
    "answers the role %s with 403 and touches no row and no evidence",
    async (role) => {
      signIn(role, COMPANY_A, OWNER_ID);

      const response = await POST(openRequest(JSON.stringify({ periodMonth: "2026-11" })));

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ message: "Forbidden" });
      expect(state.statements).toHaveLength(0);
      expect(state.evidencePuts).toBe(0);
    },
  );

  it.each([
    ["OWNER", OWNER_ID],
    ["ACCOUNTANT", ACCOUNTANT_ID],
  ])("opens a close for the %s inside the company of the session with one open row", async (role, id) => {
    signIn(role, COMPANY_A, id);

    const response = await POST(openRequest(JSON.stringify({ periodMonth: "2026-11" })));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "open",
      periodMonth: "2026-11",
      scopeCompanyId: COMPANY_A,
      openedByAccountId: id,
    });
    expect(state.audits.map((row) => row.action)).toEqual(["monthly-close-open"]);
    expect(state.audits[0]).toMatchObject({ actor_account_id: id, actor_role: role });
  });

  it("ignores a company id in the request body and keeps the company of the session", async () => {
    signIn("OWNER", COMPANY_A, OWNER_ID);

    const response = await POST(
      openRequest(
        JSON.stringify({
          periodMonth: "2026-11",
          scopeCompanyId: COMPANY_B,
          companyId: COMPANY_B,
          organizationId: COMPANY_B,
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ scopeCompanyId: COMPANY_A });
    expect(state.closes.map((row) => row.scope_company_id)).toEqual([COMPANY_A]);
  });

  it("answers a second open of one month with 409 and a fixed body, and stores no second report", async () => {
    signIn("OWNER", COMPANY_A, OWNER_ID);
    await POST(openRequest(JSON.stringify({ periodMonth: "2026-11" })));

    const response = await POST(openRequest(JSON.stringify({ periodMonth: "2026-11" })));

    expect(response.status).toBe(409);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({
      message: "A monthly close already exists for this period month",
    });
    expectNoInternalDetail(text);
    expect(state.evidencePuts).toBe(1);
    expect(state.audits).toHaveLength(1);
  });

  it("answers a unique violation at the insert with 409 and writes no audit row", async () => {
    signIn("OWNER", COMPANY_A, OWNER_ID);
    state.insertError = Object.assign(
      new Error('duplicate key value violates unique constraint "accounting_monthly_closes_key"'),
      { code: "23505" },
    );

    const response = await POST(openRequest(JSON.stringify({ periodMonth: "2026-11" })));

    expect(response.status).toBe(409);
    const text = await response.text();
    expectNoInternalDetail(text);
    expect(state.audits).toHaveLength(0);
  });

  it("does not turn a driver failure into a response body that names the failure", async () => {
    signIn("OWNER", COMPANY_A, OWNER_ID);
    const secret = 'password authentication failed for user "accounting_rw" host=10.0.0.5';
    state.insertError = Object.assign(new Error(secret), { code: "28P01" });

    const outcome = await POST(openRequest(JSON.stringify({ periodMonth: "2026-11" }))).then(
      (response) => ({ response }),
      (error: unknown) => ({ error }),
    );

    if ("response" in outcome) {
      const text = await outcome.response.text();
      expect(text).not.toContain("password");
      expect(text).not.toContain("10.0.0.5");
      expect(outcome.response.status).toBe(500);
    } else {
      expect((outcome.error as Error).message).toBe(secret);
    }
    expect(state.audits).toHaveLength(0);
  });
});

describe("GET /api/monthly-close through the real domain", () => {
  beforeEach(() => {
    state.closes = [
      storedClose({ id: "dddddddd-dddd-4ddd-8ddd-ddddddddd001", period_month: "2026-11" }),
      storedClose({
        id: "dddddddd-dddd-4ddd-8ddd-ddddddddd002",
        period_month: "2026-12",
        status: "signed",
        signed_by_account_id: CEO_ID,
        signed_by_role: "CEO",
        signed_at: "2026-12-30T02:03:04.000Z",
      }),
      storedClose({
        id: "dddddddd-dddd-4ddd-8ddd-ddddddddd003",
        period_month: "2027-01",
        status: "locked",
        signed_by_account_id: CEO_ID,
        signed_by_role: "CEO",
        signed_at: "2027-01-30T02:03:04.000Z",
        locked_at: "2027-01-30T02:03:04.000Z",
      }),
      storedClose({
        id: "dddddddd-dddd-4ddd-8ddd-ddddddddd004",
        scope_company_id: COMPANY_B,
        status: "locked",
        signed_by_account_id: CEO_ID,
        signed_by_role: "CEO",
        signed_at: "2026-11-30T02:03:04.000Z",
        locked_at: "2026-11-30T02:03:04.000Z",
      }),
    ];
  });

  it("gives a CEO the locked closes of the own company only", async () => {
    const response = await GET(listRequest());

    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string }[];
    expect(body.map((close) => close.id)).toEqual(["dddddddd-dddd-4ddd-8ddd-ddddddddd003"]);
  });

  it.each(["OWNER", "ACCOUNTANT"])(
    "gives the %s every close of the own company and none of another company",
    async (role) => {
      signIn(role, COMPANY_A, OWNER_ID);

      const response = await GET(listRequest());

      expect(response.status).toBe(200);
      const body = (await response.json()) as { id: string; scopeCompanyId: string }[];
      expect(body).toHaveLength(3);
      expect(body.every((close) => close.scopeCompanyId === COMPANY_A)).toBe(true);
    },
  );

  it.each(DENIED_LIST_ROLES)(
    "answers the role %s with 403 and reads no row",
    async (role) => {
      signIn(role, COMPANY_A, OWNER_ID);

      const response = await GET(listRequest());

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ message: "Forbidden" });
      expect(state.statements).toHaveLength(0);
    },
  );
});
