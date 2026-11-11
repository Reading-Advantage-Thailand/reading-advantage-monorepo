// @vitest-environment node
/**
 * Red tests for the monthly close API route group (`app/api/monthly-close`).
 *
 * Task 2.3 of the accounting_drive_intake track. The route module does not
 * exist yet, so every row loads it through a soft loader and fails on the
 * assertion `The route module app/api/monthly-close/route.ts is missing`.
 *
 * The route is thin (FR-8): the session guard authorizes, the company scope
 * comes from the session, and the domain decides a role. The rows mock
 * `@/app/lib/auth` and `@/app/lib/monthly-close`, the same way the approve
 * route test mocks `@/app/lib/auth` and `@/app/lib/submissions`.
 *
 * There is no lock route. The sign locks in the same call (D-5).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAccountingSession: vi.fn(),
  listMonthlyCloses: vi.fn(),
  openMonthlyClose: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  requireAccountingSession: mocks.requireAccountingSession,
}));
vi.mock("@/app/lib/monthly-close", () => ({
  listMonthlyCloses: mocks.listMonthlyCloses,
  openMonthlyClose: mocks.openMonthlyClose,
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

const ownerUser = {
  id: OWNER_ACCOUNT_ID,
  username: "accounting-owner",
  name: "Accounting Owner",
  role: "OWNER",
  organizationId: COMPANY_ID,
  applicationRoles: ["OWNER"],
};

const ceoUser = { ...ownerUser, id: CEO_ACCOUNT_ID, role: "CEO", applicationRoles: ["CEO"] };

const openClose = {
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
};

const lockedClose = {
  ...openClose,
  status: "locked",
  signedByAccountId: CEO_ACCOUNT_ID,
  signedByRole: "CEO",
  signedAt: "2026-11-06T01:02:03.000Z",
  lockedAt: "2026-11-06T01:02:03.000Z",
};

/**
 * Labels the row count of this file against the floor of the strategy table.
 */
const CLOSE_ROUTE_ROWS = [
  "get visible to the actor",
  "get locked only to a ceo",
  "post owner opens",
  "post accountant opens",
  "post ceo forbidden",
  "post staff forbidden",
  "post contractor forbidden",
  "post no session 401",
  "post cross origin 403",
  "post conflict 409",
] as const;

console.log(`close_route_rows=${CLOSE_ROUTE_ROWS.length}`);
if (CLOSE_ROUTE_ROWS.length < 4) {
  throw new Error(
    `close_route_rows=${CLOSE_ROUTE_ROWS.length} is below the floor of 4.`,
  );
}

/** Route handler signature shared by GET and POST. */
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
 * Resolves one exported handler and asserts the contract of the missing module.
 * @param name Exported handler name.
 * @returns The handler, or null after a failed assertion.
 */
async function requireHandler(name: "GET" | "POST"): Promise<RouteHandler | null> {
  const module = await loadRouteModule();
  expect(
    module,
    "The route module app/api/monthly-close/route.ts is missing",
  ).not.toBeNull();
  if (module === null) return null;
  expect(
    typeof module[name],
    `The route module app/api/monthly-close/route.ts does not export ${name}`,
  ).toBe("function");
  if (typeof module[name] !== "function") return null;
  return module[name] as RouteHandler;
}

/**
 * Authenticates the mocked session guard with one session user.
 * @param user Session user returned by the guard.
 */
function authenticated(user: Record<string, unknown> = ownerUser): void {
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

function getRequest(): Request {
  return new Request("http://localhost/api/monthly-close");
}

function postRequest(
  origin = "http://localhost",
  body: Record<string, unknown> = { periodMonth: PERIOD_MONTH },
): Request {
  return new Request("http://localhost/api/monthly-close", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/monthly-close", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticated(ownerUser);
    mocks.listMonthlyCloses.mockResolvedValue([openClose]);
  });

  it("returns the closes visible to the actor", async () => {
    const GET = await requireHandler("GET");
    if (GET === null) return;

    const response = await GET(getRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([openClose]);
    expect(mocks.listMonthlyCloses).toHaveBeenCalledTimes(1);
    expect(mocks.listMonthlyCloses).toHaveBeenCalledWith({
      actor: {
        accountId: OWNER_ACCOUNT_ID,
        companyId: COMPANY_ID,
        role: "OWNER",
      },
    });
  });

  it("returns the locked closes only to a CEO", async () => {
    const GET = await requireHandler("GET");
    if (GET === null) return;
    authenticated(ceoUser);
    mocks.listMonthlyCloses.mockImplementation(
      async (request: { readonly actor?: { readonly role?: string } }) =>
        request.actor?.role === "CEO"
          ? [lockedClose]
          : [openClose, lockedClose],
    );

    const response = await GET(getRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([lockedClose]);
    expect(mocks.listMonthlyCloses).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: expect.objectContaining({ role: "CEO" }),
      }),
    );
  });
});

describe("POST /api/monthly-close", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticated(ownerUser);
    mocks.openMonthlyClose.mockResolvedValue(openClose);
  });

  it.each([["OWNER"], ["ACCOUNTANT"]] as const)(
    "opens one close for an %s actor and returns 200",
    async (role) => {
      const POST = await requireHandler("POST");
      if (POST === null) return;
      if (role === "ACCOUNTANT") {
        authenticated({ ...ownerUser, id: ACCOUNTANT_ACCOUNT_ID, role, applicationRoles: [role] });
      }

      const response = await POST(postRequest(), { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(openClose);
      expect(mocks.openMonthlyClose).toHaveBeenCalledTimes(1);
      expect(mocks.openMonthlyClose).toHaveBeenCalledWith({
        actor: {
          accountId: role === "OWNER" ? OWNER_ACCOUNT_ID : ACCOUNTANT_ACCOUNT_ID,
          companyId: COMPANY_ID,
          role,
        },
        periodMonth: PERIOD_MONTH,
      });
    },
  );

  it.each([["CEO"], ["STAFF"], ["CONTRACTOR"]] as const)(
    "returns 403 for a %s actor when the domain refuses the open",
    async (role) => {
      const POST = await requireHandler("POST");
      if (POST === null) return;
      authenticated({ ...ownerUser, role, applicationRoles: [role] });
      mocks.openMonthlyClose.mockRejectedValue(forbiddenError());

      const response = await POST(postRequest(), { params: Promise.resolve({}) });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ message: "Forbidden" });
      expect(mocks.openMonthlyClose).toHaveBeenCalledTimes(1);
      expect(mocks.listMonthlyCloses).not.toHaveBeenCalled();
    },
  );

  it("returns 401 when the session guard refuses the request", async () => {
    const POST = await requireHandler("POST");
    if (POST === null) return;
    guardDenied(401, "Authentication required");

    const response = await POST(postRequest(), { params: Promise.resolve({}) });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "Authentication required",
    });
    expect(mocks.openMonthlyClose).not.toHaveBeenCalled();
  });

  it("returns 403 for a cross-origin POST before touching the domain", async () => {
    const POST = await requireHandler("POST");
    if (POST === null) return;

    const response = await POST(postRequest("https://phishing.example"), {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid request origin",
    });
    expect(mocks.openMonthlyClose).not.toHaveBeenCalled();
  });

  it("returns 409 with a JSON message when the domain reports a conflict", async () => {
    const POST = await requireHandler("POST");
    if (POST === null) return;
    mocks.openMonthlyClose.mockRejectedValue(conflictError());

    const response = await POST(postRequest(), {
      params: Promise.resolve({}),
    }).catch((caught: unknown) => caught);

    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) return;
    expect(response.status).toBe(409);
    const body = (await response.json()) as { readonly message?: unknown };
    expect(typeof body.message).toBe("string");
  });
});
