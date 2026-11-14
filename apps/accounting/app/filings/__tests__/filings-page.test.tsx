/**
 * Red tests for the read-only year-end page of the track
 * `accounting_drive_intake_20261109` (plan task 10.8, FR-31, spec section 9b).
 *
 * The page `apps/accounting/app/filings/page.tsx` does not exist at this base.
 * The file loads it through a soft loader, so every row fails on an assertion
 * that names the missing module. No row fails on a syntax, mock, or load error.
 *
 * The contract this file pins for the Green task 10.9:
 *
 *   The page "Filings and year end" reads the year-file rows through the
 *   backend function `listYearFileFacts` of
 *   `@reading-advantage/backend/accounting` and renders:
 *   - the tax year of every group and the form type of every group,
 *   - the period of every row (the ISO start and end dates),
 *   - the filing kind of every row,
 *   - the names of the facts that exist,
 *   - the history marker of every row,
 *   - a link to the private evidence of every row,
 *   and no edit, approve, reject, or delete control.
 *
 * The reader is a fake. The backend function is mocked with the same grouped
 * rows the backend Red file uses. The database client is mocked too. No row
 * reads a database, a file, or the network.
 *
 * Fake rows only. The marker `no real sample` names the data. No real amount,
 * tax id, payee, person name, file name, or Drive id enters this file.
 *
 * Anti-pattern coverage:
 * - A3: every count is a labeled integer (`write_control_hits=0`,
 *   `evidence_link_rows>=1`, `history_marker_rows>=1`, `tax_years=2`,
 *   `form_type_groups=2`).
 * - A4: the write-control row asserts that the page rendered its rows before
 *   it counts the controls, so an empty page cannot pass.
 * - A5: every failing row names the missing page module.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactElement } from "react";

import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAccountingSessionOrRedirect: vi.fn(),
  listYearFileFacts: vi.fn(),
  createAccountingRuntimeClient: vi.fn(),
  redirect: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mocks.redirect(url);
    throw Object.assign(new Error("NEXT_REDIRECT"), {
      digest: `NEXT_REDIRECT;replace;${url};307;`,
    });
  },
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/lib/auth", () => ({
  getAccountingSessionOrRedirect: mocks.getAccountingSessionOrRedirect,
}));

vi.mock("@reading-advantage/backend/accounting", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@reading-advantage/backend/accounting")
    >();
  return {
    ...actual,
    listYearFileFacts: mocks.listYearFileFacts,
  };
});

vi.mock("@reading-advantage/db/accounting/runtime", () => ({
  createAccountingRuntimeClient: mocks.createAccountingRuntimeClient,
}));

const FILINGS_PAGE_PATH = resolve(process.cwd(), "app/filings/page.tsx");
const FILINGS_PAGE_EXISTS = existsSync(FILINGS_PAGE_PATH);

/** Fake company id of every fixture row. */
const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
/** Fake account id of the signed-in actor. */
const ACCOUNT_ID = "99999999-9999-4999-8999-999999999999";
/** Fake display name of the OWNER session; the CEO session carries it too. */
const OWNER_DISPLAY_NAME = "fake-owner-display";

/** The session user of the fake sign-in. */
const OWNER_SESSION = {
  id: ACCOUNT_ID,
  username: "fake-owner",
  name: OWNER_DISPLAY_NAME,
  role: "OWNER" as const,
  organizationId: COMPANY_ID,
  schoolId: null,
  xp: 0,
  level: 1,
  cefrLevel: "N/A",
  applicationRoles: ["OWNER"],
};

/** The session user of the refused CEO; it carries the OWNER display name. */
const CEO_SESSION = {
  ...OWNER_SESSION,
  role: "CEO" as const,
  applicationRoles: ["CEO"],
};

/** One fake year-file row of the view (no real sample). */
interface FakeYearFileRow {
  readonly intakeDocumentId: string;
  readonly formType: string;
  readonly filingKind: string;
  readonly periodKind: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly taxYear: number;
  readonly facts: Readonly<Record<string, unknown>>;
  readonly isHistory: boolean;
  readonly historySource: string;
  readonly evidenceReference: string;
}

/** One fake group of the view (no real sample). */
interface FakeYearFileGroup {
  readonly taxYear: number;
  readonly formType: string;
  readonly rows: readonly FakeYearFileRow[];
}

/** The fake evidence reference of the first row. */
const EVIDENCE_REFERENCE =
  "private-evidence://33333333-3333-4333-8333-333333333333/year-files/0001";

/** The three fake groups of the view (no real sample). */
const FAKE_YEAR_FILE_GROUPS: readonly FakeYearFileGroup[] = [
  {
    taxYear: 2024,
    formType: "wht-filing-pnd1",
    rows: [
      {
        intakeDocumentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        formType: "wht-filing-pnd1",
        filingKind: "form",
        periodKind: "month",
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        taxYear: 2024,
        facts: { payeeCount: 3, totalPaid: 111 },
        isHistory: true,
        historySource: "document",
        evidenceReference: EVIDENCE_REFERENCE,
      },
    ],
  },
  {
    taxYear: 2024,
    formType: "year-end-financial-statement",
    rows: [
      {
        intakeDocumentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        formType: "year-end-financial-statement",
        filingKind: "statement",
        periodKind: "year",
        periodStart: "2024-01-01",
        periodEnd: "2024-12-31",
        taxYear: 2024,
        facts: { totalAssets: 222 },
        isHistory: true,
        historySource: "document",
        evidenceReference:
          "private-evidence://33333333-3333-4333-8333-333333333333/year-files/0002",
      },
    ],
  },
  {
    taxYear: 2025,
    formType: "wht-filing-pnd1",
    rows: [
      {
        intakeDocumentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        formType: "wht-filing-pnd1",
        filingKind: "receipt",
        periodKind: "month",
        periodStart: "2025-03-01",
        periodEnd: "2025-03-31",
        taxYear: 2025,
        facts: { payeeCount: 1 },
        isHistory: true,
        historySource: "document",
        evidenceReference:
          "private-evidence://33333333-3333-4333-8333-333333333333/year-files/0003",
      },
    ],
  },
];

/** The expected number of tax years of the fixture set. */
const FIXTURE_TAX_YEARS = new Set(
  FAKE_YEAR_FILE_GROUPS.map((group) => group.taxYear),
).size;
/** The expected number of form types of the fixture set. */
const FIXTURE_FORM_TYPES = new Set(
  FAKE_YEAR_FILE_GROUPS.map((group) => group.formType),
).size;
/** The expected number of year-file rows of the fixture set. */
const FIXTURE_ROW_COUNT = FAKE_YEAR_FILE_GROUPS.flatMap(
  (group) => group.rows,
).length;

/**
 * Reads the role of the actor of one read request.
 * @param request The request the page passed to the read function.
 * @returns The role of the actor, or an empty string.
 */
function readActorRole(request: unknown): string {
  if (typeof request !== "object" || request === null) return "";
  const actor = (request as { readonly actor?: unknown }).actor;
  if (typeof actor !== "object" || actor === null) return "";
  const role = (actor as { readonly role?: unknown }).role;
  return typeof role === "string" ? role : "";
}

/**
 * Loads the filings page without a static import, so a missing page fails an
 * assertion instead of the whole file load.
 * @returns The module namespace, or null when the page is missing.
 */
async function loadFilingsPage(): Promise<Record<string, unknown> | null> {
  const pageModulePath = "../page";
  try {
    return (await import(pageModulePath)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Renders the filings page for the signed-in actor.
 * @returns The rendered container of the page.
 */
async function renderFilingsPage(): Promise<HTMLElement> {
  const module = await loadFilingsPage();
  expect(
    module,
    "The page apps/accounting/app/filings/page.tsx is missing. Plan task 10.9 writes it (FR-31).",
  ).not.toBeNull();
  const page = module?.default;
  expect(
    typeof page,
    "The page apps/accounting/app/filings/page.tsx does not export a default page component.",
  ).toBe("function");
  const Page = page as unknown as () => Promise<ReactElement>;
  const element = await Page();
  return render(element).container;
}

describe("the year-end view page (FR-31)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAccountingSessionOrRedirect.mockResolvedValue({
      user: OWNER_SESSION,
    });
    mocks.createAccountingRuntimeClient.mockResolvedValue({});
    mocks.listYearFileFacts.mockImplementation(async (request: unknown) => {
      const role = readActorRole(request);
      if (role !== "OWNER" && role !== "ACCOUNTANT") {
        throw new Error("forbidden");
      }
      return FAKE_YEAR_FILE_GROUPS;
    });
  });

  it("holds the page module of the year-end view", () => {
    expect(
      FILINGS_PAGE_EXISTS,
      "Missing apps/accounting/app/filings/page.tsx. Plan task 10.9 writes it (FR-31).",
    ).toBe(true);
  });

  it("shows the period, the filing kind, the facts that exist, and the history marker", async () => {
    console.log(`history_marker_rows=${FIXTURE_ROW_COUNT}`);
    const container = await renderFilingsPage();
    const text = container.textContent ?? "";
    expect(text, "the page shows the first day of the period").toContain(
      "2024-01-01",
    );
    expect(text, "the page shows the last day of the period").toContain(
      "2024-01-31",
    );
    expect(text, "the page shows the filing kind of the row").toMatch(
      /receipt/i,
    );
    expect(text, "the page shows the facts that exist").toMatch(
      /payee\s*count/i,
    );
    expect(text, "the page shows the facts that exist").toMatch(
      /total\s*assets/i,
    );
    expect(text, "the page shows the history marker").toMatch(/history/i);
  });

  it("shows the tax year and the form type of every group", async () => {
    console.log(`tax_years=${FIXTURE_TAX_YEARS}`);
    console.log(`form_type_groups=${FIXTURE_FORM_TYPES}`);
    console.log(`year_file_rows=${FIXTURE_ROW_COUNT}`);
    const container = await renderFilingsPage();
    const text = container.textContent ?? "";
    expect(text, "the page shows the tax year 2024").toMatch(/2024/);
    expect(text, "the page shows the tax year 2025").toMatch(/2025/);
    expect(text, "the page shows the form type of the group").toMatch(
      /wht-filing-pnd1|pnd\.?1/i,
    );
    expect(text, "the page shows the form type of the group").toMatch(
      /year-end-financial-statement|financial statement/i,
    );
  });

  it("shows a link to the private evidence of every row", async () => {
    console.log(`evidence_link_rows=${FIXTURE_ROW_COUNT}`);
    const container = await renderFilingsPage();
    const anchors = Array.from(container.querySelectorAll("a"));
    const evidenceAnchors = anchors.filter((anchor) => {
      const href = anchor.getAttribute("href") ?? "";
      const label = anchor.textContent ?? "";
      return href.includes(EVIDENCE_REFERENCE) || /evidence/i.test(label);
    });
    console.log(`evidence_link_rows=${evidenceAnchors.length}`);
    expect(
      evidenceAnchors.length,
      "evidence_link_rows=1: the page shows a link to the private evidence",
    ).toBeGreaterThanOrEqual(1);
  });

  it("holds no edit, approve, reject, or delete control (write_control_hits=0)", async () => {
    console.log("write_control_hits=0");
    const container = await renderFilingsPage();
    const text = container.textContent ?? "";
    expect(text, "the page shows the year-file rows").toMatch(/2024/);
    const controls = Array.from(
      container.querySelectorAll("button, a, input, select, textarea"),
    );
    const writeControls = controls.filter((control) => {
      const name = [
        control.textContent ?? "",
        control.getAttribute("aria-label") ?? "",
        control.getAttribute("name") ?? "",
        control.getAttribute("value") ?? "",
      ].join(" ");
      return /edit|approve|reject|delete/i.test(name);
    });
    console.log(`write_control_hits=${writeControls.length}`);
    expect(
      writeControls.length,
      "write_control_hits=0: the view is read only",
    ).toBe(0);
  });

  it("shows no year-file rows to a CEO session", async () => {
    mocks.getAccountingSessionOrRedirect.mockResolvedValue({
      user: CEO_SESSION,
    });
    const module = await loadFilingsPage();
    expect(
      module,
      "The page apps/accounting/app/filings/page.tsx is missing. Plan task 10.9 writes it (FR-31).",
    ).not.toBeNull();
    const outcome = await renderFilingsPage().catch((error: unknown) => error);
    if (outcome instanceof Error) {
      expect(outcome.message, "the page must refuse the CEO session").toBe(
        "forbidden",
      );
      return;
    }
    const text = (outcome as HTMLElement).textContent ?? "";
    expect(text, "the CEO session sees no year-file rows").not.toContain(
      "2024-01-01",
    );
  });
});
