// @vitest-environment node
/**
 * Red tests for the monthly close sign API route (`app/api/monthly-close/[id]/sign`).
 *
 * Task 2.3 of the accounting_drive_intake track. The route module does not
 * exist yet, so every row loads it through a soft loader and fails on the
 * assertion `The route module ... is missing`.
 *
 * The sign locks in the same call (D-5), so there is no lock route and the sign
 * route takes no action field. The route is thin (FR-8): the domain decides the
 * CEO role, and the route maps the domain rejection to 403.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAccountingSession: vi.fn(),
  signMonthlyClose: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  requireAccountingSession: mocks.requireAccountingSession,
}));
vi.mock("@/app/lib/monthly-close", () => ({
  signMonthlyClose: mocks.signMonthlyClose,
}));

const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const OWNER_ACCOUNT_ID = "99999999-9999-4999-8999-999999999999";
const ACCOUNTANT_ACCOUNT_ID = "77777777-7777-4777-8777-777777777777";
const CEO_ACCOUNT_ID = "88888888-8888-4888-8888-888888888888";
const STAFF_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const CONTRACTOR_ACCOUNT_ID = "66666666-6666-4666-8666-666666666666";
const CLOSE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const PERIOD_MONTH = "2026-11";
const EVIDENCE_REFERENCE = `private-evidence://${COMPANY_ID}/monthly-close/${CLOSE_ID}/report`;

/** Close row shape the route serializes back to the caller. */
interface CloseRow {
  readonly id: string;
  readonly scopeCompanyId: string;
  readonly periodMonth: string;
  readonly status: string;
  readonly reportEvidenceReference: string;
  readonly openedByAccountId: string;
  readonly openedAt: string;
  readonly signedByAccountId: string | null;
  readonly signedByRole: string | null;
  readonly signedAt: string | null;
  readonly lockedAt: string | null;
}

/**
 * Builds one close row for the fake domain.
 * @param overrides Fields that differ from an open close.
 * @returns The close row.
 */
function closeRow(overrides: Partial<CloseRow> = {}): CloseRow {
  return {
    id: CLOSE_ID,
    scopeCompanyId: COMPANY_ID,
    periodMonth: PERIOD_MONTH,
    status: "open",
    reportEvidenceReference: EVIDENCE_REFERENCE,
    openedByAccountId: OWNER_ACCOUNT_ID,
    openedAt: "2026-11-05T01:02:03.000Z",
    signedByAccountId: null,
    signedByRole: null,
    signedAt: null,
    lockedAt: null,
    ...overrides,
  };
}

const openClose = closeRow();
const lockedClose = closeRow({
  status: "locked",
  signedByAccountId: CEO_ACCOUNT_ID,
  signedByRole: "CEO",
  signedAt: "2026-11-06T01:02:03.000Z",
  lockedAt: "2026-11-06T01:02:03.000Z",
});

const ceoUser = {
  id: CEO_ACCOUNT_ID,
  username: "accounting-ceo",
  name: "Accounting CEO",
  role: "CEO",
  organizationId: COMPANY_ID,
  applicationRoles: ["CEO"],
};

/**
 * Labels the row counts of this file against the floors of the strategy table.
 */
const SIGN_ROUTE_ROWS = [
  "ceo sign returns locked",
  "owner forbidden",
  "accountant forbidden",
  "staff forbidden",
  "contractor forbidden",
  "second sign writes no second audit row",
  "post no session 401",
  "post cross origin 403",
  "post conflict 409",
  "post invalid close id 400",
] as const;
const SIGN_DENIED_ROLES = ["OWNER", "ACCOUNTANT", "STAFF", "CONTRACTOR"] as const;

console.log(`sign_route_rows=${SIGN_ROUTE_ROWS.length}`);
console.log(`sign_denied_roles=${SIGN_DENIED_ROLES.length}`);
if (SIGN_ROUTE_ROWS.length < 6) {
  throw new Error(
    `sign_route_rows=${SIGN_ROUTE_ROWS.length} is below the floor of 6.`,
  );
}
if (SIGN_DENIED_ROLES.length !== 4) {
  throw new Error(
    `sign_denied_roles=${SIGN_DENIED_ROLES.length} is wrong; the plan names four roles.`,
  );
}

/** Route handler signature of the sign route. */
type RouteHandler = (
  request: Request,
  context?: unknown,
) => Promise<Response>;

/**
 * Loads the route module without a static import, so a missing module fails an
 * assertion instead of the whole file load.
 * @returns The route module, or null when the module is missing.
 */
async function loadRouteModule(): Promise<Record<string, unknown> | null> {
  const href = new URL("./route.ts", import.meta.url).href;
  try {
    return (await import(/* @vite-ignore */ href)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Resolves the POST handler and asserts the contract of the missing module.
 * @returns The handler, or null after a failed assertion.
 */
async function requireSignHandler(): Promise<RouteHandler | null> {
  const module = await loadRouteModule();
  expect(
    module,
    "The route module app/api/monthly-close/[id]/sign/route.ts is missing",
  ).not.toBeNull();
  if (module === null) return null;
  expect(
    typeof module.POST,
    "The route module app/api/monthly-close/[id]/sign/route.ts does not export POST",
  ).toBe("function");
  if (typeof module.POST !== "function") return null;
  return module.POST as RouteHandler;
}

/**
 * Authenticates the mocked session guard with one session user.
 * @param user Session user returned by the guard.
 */
function authenticated(user: Record<string, unknown> = ceoUser): void {
  mocks.requireAccountingSession.mockResolvedValue({
    ok: true,
    session: { user },
  });
}

/**
 * Builds a forbidden domain rejection in the route-ready error shape.
 * @returns The forbidden error.
 */
function forbiddenError(): Error {
  return Object.assign(new Error("forbidden"), {
    name: "AccountingSubmissionError",
    reason: "forbidden",
  });
}

/**
 * Builds a conflict domain rejection in the route-ready error shape.
 * @returns The conflict error.
 */
function conflictError(): Error {
  return Object.assign(new Error("conflict"), {
    name: "AccountingSubmissionError",
    reason: "conflict",
  });
}

/**
 * Builds an invalid-input domain rejection carrying field errors.
 * @returns The invalid-input error.
 */
function invalidInputError(): Error {
  return Object.assign(new Error("Monthly close validation failed"), {
    name: "AccountingSubmissionError",
    reason: "invalid-input",
    fieldErrors: { closeId: ["Invalid uuid"] },
  });
}

/**
 * Answers the mocked session guard with a refusal response.
 * @param status HTTP status of the refusal.
 * @param message Message of the refusal body.
 */
function guardDenied(status: 401 | 403, message: string): void {
  mocks.requireAccountingSession.mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ message }), {
      status,
      headers: { "content-type": "application/json" },
    }),
  });
}

function signRequest(
  closeId: string = CLOSE_ID,
  origin = "http://localhost",
): Request {
  return new Request(`http://localhost/api/monthly-close/${closeId}/sign`, {
    method: "POST",
    headers: { origin },
  });
}

function signContext(
  closeId: string = CLOSE_ID,
): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: closeId }) };
}

describe("POST /api/monthly-close/[id]/sign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticated(ceoUser);
    mocks.signMonthlyClose.mockResolvedValue(lockedClose);
  });

  it("returns 200 for a CEO and the body carries a locked close with signedAt and lockedAt", async () => {
    const POST = await requireSignHandler();
    if (POST === null) return;

    const response = await POST(signRequest(), signContext());

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      id: CLOSE_ID,
      status: "locked",
      signedAt: lockedClose.signedAt,
      lockedAt: lockedClose.lockedAt,
    });
    expect(typeof body.signedAt).toBe("string");
    expect(typeof body.lockedAt).toBe("string");
    expect(mocks.signMonthlyClose).toHaveBeenCalledTimes(1);
    expect(mocks.signMonthlyClose).toHaveBeenCalledWith({
      actor: {
        accountId: CEO_ACCOUNT_ID,
        companyId: COMPANY_ID,
        role: "CEO",
      },
      closeId: CLOSE_ID,
    });
  });

  it.each(SIGN_DENIED_ROLES)(
    "returns 403 for an %s actor when the domain refuses the sign",
    async (role) => {
      const POST = await requireSignHandler();
      if (POST === null) return;
      authenticated({ ...ceoUser, role, applicationRoles: [role] });
      mocks.signMonthlyClose.mockRejectedValue(forbiddenError());

      const response = await POST(signRequest(), signContext());

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ message: "Forbidden" });
      expect(mocks.signMonthlyClose).toHaveBeenCalledTimes(1);
    },
  );

  it("returns 200 with no change and no second audit row on a second sign of a locked close", async () => {
    const POST = await requireSignHandler();
    if (POST === null) return;
    const auditRows: string[] = [];
    let close: CloseRow = openClose;
    mocks.signMonthlyClose.mockImplementation(async () => {
      if (close.status === "locked") return close;
      close = lockedClose;
      auditRows.push("monthly-close-sign", "monthly-close-lock");
      return close;
    });

    const first = await POST(signRequest(), signContext());
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as Record<string, unknown>;
    expect(auditRows).toHaveLength(2);

    const second = await POST(signRequest(), signContext());
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as Record<string, unknown>;

    expect(secondBody).toEqual(firstBody);
    expect(auditRows).toHaveLength(2);
    expect(mocks.signMonthlyClose).toHaveBeenCalledTimes(2);
  });

  it("returns 401 when the session guard refuses the request", async () => {
    const POST = await requireSignHandler();
    if (POST === null) return;
    guardDenied(401, "Authentication required");

    const response = await POST(signRequest(), signContext());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "Authentication required",
    });
    expect(mocks.signMonthlyClose).not.toHaveBeenCalled();
  });

  it("returns 403 for a cross-origin POST before touching the domain", async () => {
    const POST = await requireSignHandler();
    if (POST === null) return;

    const response = await POST(
      signRequest(CLOSE_ID, "https://phishing.example"),
      signContext(),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid request origin",
    });
    expect(mocks.signMonthlyClose).not.toHaveBeenCalled();
  });

  it("returns 409 with a JSON message when the domain reports a conflict", async () => {
    const POST = await requireSignHandler();
    if (POST === null) return;
    mocks.signMonthlyClose.mockRejectedValue(conflictError());

    const response = await POST(signRequest(), signContext()).catch(
      (caught: unknown) => caught,
    );

    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) return;
    expect(response.status).toBe(409);
    const body = (await response.json()) as { readonly message?: unknown };
    expect(typeof body.message).toBe("string");
  });

  it("returns 400 with a JSON body for a close id that is not a UUID", async () => {
    const POST = await requireSignHandler();
    if (POST === null) return;
    mocks.signMonthlyClose.mockRejectedValue(invalidInputError());

    const response = await POST(
      signRequest("not-a-uuid"),
      signContext("not-a-uuid"),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { readonly message?: unknown };
    expect(typeof body.message).toBe("string");
  });
});
