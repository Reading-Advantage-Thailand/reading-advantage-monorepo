// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/submissions/export/route";

const mocks = vi.hoisted(() => ({
  requireAccountingSession: vi.fn(),
  listAccountingSubmissions: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  requireAccountingSession: mocks.requireAccountingSession,
}));
vi.mock("@/app/lib/submissions", () => ({
  listAccountingSubmissions: mocks.listAccountingSubmissions,
}));

const ROUTE_URL = "http://localhost/api/submissions/export";
const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const STAFF_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
const ACCOUNTANT_ACCOUNT_ID = "33333333-3333-4333-8333-333333333334";
const EVIDENCE_REFERENCE = `private-evidence://${COMPANY_ID}/submissions/0001/receipt.pdf`;

const HEADER_ROW =
  "id,submitted_at,payee,category,currency,amount_minor,settled_thb_minor,derived_rate,status,evidence_reference\r\n";

const ownerUser = {
  id: OWNER_ACCOUNT_ID,
  username: "owner",
  name: "Owner User",
  role: "OWNER",
  organizationId: COMPANY_ID,
  applicationRoles: ["OWNER"],
};

const accountantUser = {
  id: ACCOUNTANT_ACCOUNT_ID,
  username: "accountant",
  name: "Accountant User",
  role: "ACCOUNTANT",
  organizationId: COMPANY_ID,
  applicationRoles: ["ACCOUNTANT"],
};

const staffUser = {
  id: STAFF_ACCOUNT_ID,
  username: "staff",
  name: "Staff User",
  role: "STAFF",
  organizationId: COMPANY_ID,
  applicationRoles: ["STAFF"],
};

const approvedNonThbSubmission = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  scope: { companyId: COMPANY_ID },
  status: "approved",
  submittedByAccountId: STAFF_ACCOUNT_ID,
  submittedAt: "2026-08-10T02:04:05.678Z",
  kind: "bill",
  payee: "Bangkok Taxi Cooperative",
  category: "travel",
  money: { amountMinor: "15000", currency: "USD" },
  settledThbAmount: "520500",
  evidenceReference: EVIDENCE_REFERENCE,
};

const approvedThbSubmission = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  scope: { companyId: COMPANY_ID },
  status: "approved",
  submittedByAccountId: STAFF_ACCOUNT_ID,
  submittedAt: "2026-08-11T02:04:05.678Z",
  kind: "expense",
  payee: "Bangkok Metro",
  category: "travel",
  money: { amountMinor: "4500", currency: "THB" },
  // THB has no settledThbAmount / derived_rate
  evidenceReference: `private-evidence://${COMPANY_ID}/submissions/0002/ticket.pdf`,
};

const approvedJpySubmission = {
  ...approvedNonThbSubmission,
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc",
  money: { amountMinor: "10000", currency: "JPY" },
  settledThbAmount: "230000",
  payee: "Tokyo Vendor",
};

const pendingSubmission = {
  ...approvedNonThbSubmission,
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  status: "pending",
  payee: "Pending Vendor",
};

const rejectedSubmission = {
  ...approvedNonThbSubmission,
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  status: "rejected",
  payee: "Rejected Vendor",
};

const inRangeUtcBoundarySubmission = {
  ...approvedNonThbSubmission,
  id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  submittedAt: "2026-08-14T23:00:00Z",
  payee: "Offset Vendor",
};

const inRangeNormalSubmission = {
  ...approvedNonThbSubmission,
  id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  submittedAt: "2026-08-20T12:00:00Z",
  payee: "Normal Vendor",
};

const outRangeBeforeSubmission = {
  ...approvedNonThbSubmission,
  id: "11111111-1111-4111-8111-111111111112",
  submittedAt: "2026-07-31T23:59:59Z",
  payee: "Before Vendor",
};

const outRangeAfterSubmission = {
  ...approvedNonThbSubmission,
  id: "22222222-2222-4222-8222-222222222223",
  submittedAt: "2026-09-01T00:00:00Z",
  payee: "After Vendor",
};

function authenticated(user: Record<string, unknown> = ownerUser): void {
  mocks.requireAccountingSession.mockResolvedValue({
    ok: true,
    session: { user },
  });
}

function guardDenied(status: 401 | 403, message: string): void {
  mocks.requireAccountingSession.mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ message }), {
      status,
      headers: { "content-type": "application/json" },
    }),
  });
}

describe("GET /api/submissions/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticated(ownerUser);
    mocks.listAccountingSubmissions.mockResolvedValue([approvedNonThbSubmission]);
  });

  it("returns 200 with the exact header row for an OWNER with no query params", async () => {
    const response = await GET(new Request(ROUTE_URL));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    const body = await response.text();
    expect(body.startsWith(HEADER_ROW)).toBe(true);
  });

  it("uses CRLF between rows and never emits a BOM", async () => {
    mocks.listAccountingSubmissions.mockResolvedValue([
      approvedNonThbSubmission,
      approvedThbSubmission,
    ]);
    const response = await GET(new Request(ROUTE_URL));
    const body = await response.text();

    expect(body.startsWith("\uFEFF")).toBe(false);
    expect(body).toContain("\r\n");
    // No bare LF without CR
    const bareLf = body.replace(/\r\n/gu, "").includes("\n");
    expect(bareLf).toBe(false);
    expect(body.endsWith("\r\n")).toBe(true);
  });

  it("includes settled THB and derived rate for an approved non-THB row", async () => {
    mocks.listAccountingSubmissions.mockResolvedValue([approvedNonThbSubmission]);
    const response = await GET(new Request(ROUTE_URL));
    const body = await response.text();

    expect(body).toContain("520500");
    expect(body).toContain("34.70");
  });

  it("passes the source currency to derived rate calculation", async () => {
    mocks.listAccountingSubmissions.mockResolvedValue([approvedJpySubmission]);
    const response = await GET(new Request(ROUTE_URL));
    const body = await response.text();

    expect(body).toContain(",10000,230000,0.23,");
  });

  it("neutralizes spreadsheet formulas in text cells", async () => {
    mocks.listAccountingSubmissions.mockResolvedValue([
      { ...approvedNonThbSubmission, payee: "=1+1", category: "+SUM(A1:A2)" },
      { ...approvedNonThbSubmission, id: "formula-minus", payee: "-2+3", category: "@SUM(A1:A2)" },
      { ...approvedNonThbSubmission, id: "formula-space", payee: "  =1+1", category: 'travel "quoted"' },
      { ...approvedNonThbSubmission, id: "formula-newline", payee: "\r\n=1+1" },
    ]);

    const response = await GET(new Request(ROUTE_URL));
    const body = await response.text();

    expect(body).toContain("'=1+1,'+SUM(A1:A2)");
    expect(body).toContain("'-2+3,'@SUM(A1:A2)");
    expect(body).toContain("'  =1+1,\"travel \"\"quoted\"\"\"");
    expect(body).toContain("\"'\r\n=1+1\"");
    expect(body).toContain(",15000,520500,34.70,");
  });

  it("leaves settled THB and derived rate empty for an approved THB row", async () => {
    mocks.listAccountingSubmissions.mockResolvedValue([approvedThbSubmission]);
    const response = await GET(new Request(ROUTE_URL));
    const body = await response.text();

    // Header + one data row
    const lines = body.trim().split("\r\n");
    expect(lines).toHaveLength(2);
    const row = lines[1] ?? "";
    // Parse CSV fields naively (no commas in these pays); check empty cells at positions 6 and 7 (0-indexed)
    const cells = row.split(",");
    // amount_minor at 5, settled_thb_minor at 6, derived_rate at 7
    expect(cells[5]).toBe("4500");
    expect(cells[6]).toBe("");
    expect(cells[7]).toBe("");
  });

  it("excludes pending and rejected rows", async () => {
    mocks.listAccountingSubmissions.mockResolvedValue([
      approvedNonThbSubmission,
      pendingSubmission,
      rejectedSubmission,
    ]);
    const response = await GET(new Request(ROUTE_URL));
    const body = await response.text();

    expect(body).toContain("Bangkok Taxi Cooperative");
    expect(body).not.toContain("Pending Vendor");
    expect(body).not.toContain("Rejected Vendor");
  });

  it("filters by inclusive from/to using the Bangkok date for UTC submissions", async () => {
    mocks.listAccountingSubmissions.mockResolvedValue([
      inRangeUtcBoundarySubmission,
      inRangeNormalSubmission,
      outRangeBeforeSubmission,
      outRangeAfterSubmission,
    ]);
    const response = await GET(
      new Request(`${ROUTE_URL}?from=2026-08-15&to=2026-08-31`),
    );
    const body = await response.text();

    expect(body).toContain("Offset Vendor");
    expect(body).toContain(",2026-08-15,Offset Vendor,");
    expect(body).toContain("Normal Vendor");
    expect(body).not.toContain("Before Vendor");
    expect(body).not.toContain("After Vendor");
  });

  it("returns 400 for an invalid from date", async () => {
    const response = await GET(new Request(`${ROUTE_URL}?from=not-a-date`));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid date range",
    });
  });

  it("returns 200 for an ACCOUNTANT", async () => {
    authenticated(accountantUser);
    mocks.listAccountingSubmissions.mockResolvedValue([approvedNonThbSubmission]);
    const response = await GET(new Request(ROUTE_URL));

    expect(response.status).toBe(200);
  });

  it("returns 403 for a STAFF actor", async () => {
    authenticated(staffUser);
    const response = await GET(new Request(ROUTE_URL));

    expect(response.status).toBe(403);
    expect(mocks.listAccountingSubmissions).not.toHaveBeenCalled();
  });

  it("returns header only for an empty scope", async () => {
    mocks.listAccountingSubmissions.mockResolvedValue([]);
    const response = await GET(new Request(ROUTE_URL));
    const body = await response.text();

    expect(body).toBe(HEADER_ROW);
  });
});
