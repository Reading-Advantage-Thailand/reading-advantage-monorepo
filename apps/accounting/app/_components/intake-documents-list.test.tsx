/**
 * Red test row for the year-file duplicate display in the intake list
 * (plan task 10.3, spec sections 5.5 and 9b, FR-28, decision D-2).
 *
 * The component `apps/accounting/app/_components/intake-documents-list.tsx`
 * does not exist at this base (fact Y6; plan task 7.2 creates it). The row
 * loads the component through a soft loader, so the failure is the assertion
 * that names the missing component file, never a bare load error. When the
 * component exists, the row pins the year-file exception of spec section 9b:
 *
 *   A year-file duplicate row holds no submission id and only
 *   `duplicate_of_intake_document_id`. The list shows the label `duplicate`,
 *   no link to a submission, the first row as plain text through that id, and
 *   no approve or reject action. A voucher duplicate keeps the link of
 *   section 5.5.
 *
 * Fake data only: the row ids, the Drive file ids, and the evidence references
 * are fakes. No real row, amount, payee, or Drive id enters this file.
 *
 * Anti-pattern coverage:
 * - A5: the failure names the missing component path.
 * - A7: the approve and reject checks query the two role names only; the list
 *   uses no bare English exclusion word outside a named query.
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

/** Fake company id of every fixture row. */
const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
/** Row id of the first year-file row, shown as plain text. */
const FIRST_ROW_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
/** Row id of the year-file duplicate row. */
const DUPLICATE_ROW_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
/** The href segment of a submission link; a year-file duplicate holds none. */
const SUBMISSION_LINK_SEGMENT = "/submissions/";

/** One row of `accounting_intake_documents` as the list receives it. */
interface IntakeListRow {
  id: string;
  driveFileId: string;
  driveFolderId: string;
  sourceMonth: string;
  documentType: string;
  status: string;
  submissionId: string | null;
  duplicateOfSubmissionId: string | null;
  duplicateOfIntakeDocumentId: string | null;
  evidenceReference: string | null;
  extraction: string | null;
  failureReason: string | null;
  failureCount: number;
  sightingCount: number;
  evidenceByteSize: number | null;
  isHistory: boolean;
  historySource: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  scopeCompanyId: string;
}

/** The first year-file row of the duplicate pair. */
const FIRST_ROW: IntakeListRow = {
  id: FIRST_ROW_ID,
  driveFileId: "fake-drive-1",
  driveFolderId: "fake-drive-folder-1",
  sourceMonth: "2024-01",
  documentType: "wht-filing-pnd1",
  status: "parsed",
  submissionId: null,
  duplicateOfSubmissionId: null,
  duplicateOfIntakeDocumentId: null,
  evidenceReference: `private-evidence://${COMPANY_ID}/year-files/0001`,
  extraction: "local-text",
  failureReason: null,
  failureCount: 0,
  sightingCount: 1,
  evidenceByteSize: 1234,
  isHistory: true,
  historySource: "document",
  firstSeenAt: "2026-11-13T05:00:00.000Z",
  lastSeenAt: "2026-11-13T05:00:00.000Z",
  scopeCompanyId: COMPANY_ID,
};

/** The year-file duplicate row: no submission id, only the intake duplicate id. */
const DUPLICATE_ROW: IntakeListRow = {
  ...FIRST_ROW,
  id: DUPLICATE_ROW_ID,
  driveFileId: "fake-drive-2",
  status: "duplicate",
  duplicateOfIntakeDocumentId: FIRST_ROW_ID,
  extraction: null,
};

/**
 * Loads the intake list component without a static import, so a missing
 * component fails an assertion instead of the whole file load. The specifier
 * is a runtime URL with `@vite-ignore`, so the bundler keeps no static edge
 * to the missing file.
 * @returns The module, or null when the component is missing.
 */
async function loadIntakeDocumentsList(): Promise<Record<string, unknown> | null> {
  const href = new URL("./intake-documents-list.tsx", import.meta.url).href;
  try {
    return (await import(/* @vite-ignore */ href)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

describe("the year-file duplicate display in the intake list", () => {
  it("renders a year-file duplicate row with the duplicate label, no submission link, and no approve or reject action", async () => {
    const module = await loadIntakeDocumentsList();
    expect(
      module,
      "The component apps/accounting/app/_components/intake-documents-list.tsx is missing. " +
        "Plan task 7.2 creates it; the 10.3 list row fails here until then (fact Y6).",
    ).not.toBeNull();
    const component = module?.IntakeDocumentsList;
    expect(
      typeof component,
      "The component apps/accounting/app/_components/intake-documents-list.tsx does not export IntakeDocumentsList",
    ).toBe("function");

    const IntakeDocumentsList = component as unknown as (input: {
      readonly rows: readonly IntakeListRow[];
    }) => React.ReactNode;
    render(<IntakeDocumentsList rows={[FIRST_ROW, DUPLICATE_ROW]} />);

    expect(
      screen.getAllByText("duplicate").length,
      "the duplicate row shows the label duplicate",
    ).toBeGreaterThanOrEqual(1);

    const submissionLinks = screen
      .queryAllByRole("link")
      .filter((link) =>
        (link.getAttribute("href") ?? "").includes(SUBMISSION_LINK_SEGMENT),
      );
    expect(
      submissionLinks,
      "the year-file duplicate row holds no link to a submission (spec section 9b)",
    ).toEqual([]);

    const firstRowText = screen.getByText(FIRST_ROW_ID);
    expect(
      firstRowText.closest("a"),
      "the first row renders as plain text through duplicate_of_intake_document_id, not as a link",
    ).toBeNull();

    expect(
      screen.queryByRole("button", { name: "approve" }),
      "the year-file duplicate row holds no approve action",
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "reject" }),
      "the year-file duplicate row holds no reject action",
    ).toBeNull();
  });
});
