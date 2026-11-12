// @vitest-environment node
/**
 * Red tests for the Postgres intake repository of the track
 * `accounting_drive_intake_20261109` (plan task 3.8, Review B F304, Review A
 * F309, PM-22).
 *
 * The rows run the repository over a tagged SQL double that records the joined
 * statement text and the bound values. No row opens a database connection.
 * The company id, the row id, the submission id, and the evidence reference are
 * fakes.
 *
 * - Each of the four mark and bump statements binds `scope_company_id` beside
 *   the row id, so a row id of another company never matches.
 * - `listRecentSubmissionEvidence({ scope, limit })` reads the newest
 *   submissions from `accounting_submissions`, scoped by company, newest first.
 * - `findByEvidenceByteSize` and `findByDriveFileId` bind the company id.
 */
import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

/** Fake company id of every fixture. */
const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
/** Fake intake row id of the mark and bump statements. */
const ROW_ID = "44444444-4444-4444-8444-444444444444";
/** Fake earlier submission id of the duplicate mark. */
const SUBMISSION_ID = "55555555-5555-4555-8555-555555555555";
/** Fake evidence reference of the submission rows. */
const EVIDENCE_REFERENCE = `private-evidence://${COMPANY_ID}/submissions/${randomUUID()}/evidence`;
/** Distinct fake limit of the pass 1 statement. */
const PASS_ONE_LIMIT = 37;
/** Distinct fake evidence byte size of the pass 2 statement. */
const BYTE_SIZE = 4321;
/** Fake Drive file id of the file id statement. */
const DRIVE_FILE_ID = "fake-repository-file-id";

/** One recorded SQL call. */
interface SqlCall {
  /** The joined statement text; each bound value shows as `?`. */
  readonly statement: string;
  /** The bound values in order. */
  readonly values: readonly unknown[];
}

/**
 * Creates a tagged SQL double with ordered query responses and captured bindings.
 * @param responses The row list that each statement returns, in order.
 * @returns The recorded calls and the SQL double.
 */
function sqlDouble(responses: readonly (readonly Record<string, unknown>[])[]): {
  readonly calls: SqlCall[];
  readonly sql: unknown;
} {
  const pending = [...responses];
  const calls: SqlCall[] = [];
  const tagged = vi.fn(
    async (strings: TemplateStringsArray, ...values: readonly unknown[]) => {
      calls.push({ statement: strings.join("?"), values });
      const response = pending.shift();
      if (response === undefined) throw new Error("Unexpected SQL statement.");
      return response;
    },
  );
  return { calls, sql: tagged };
}

/**
 * Collapses the whitespace of one statement and lowercases it.
 * @param statement The joined statement text.
 * @returns The normalized statement.
 */
function normalize(statement: string): string {
  return statement.replace(/\s+/gu, " ").trim().toLowerCase();
}

/**
 * Reads the text after the last `where` of one normalized statement.
 * @param statement The normalized statement.
 * @returns The where clause, or an empty string when the statement has none.
 */
function whereClause(statement: string): string {
  const index = statement.lastIndexOf(" where ");
  return index === -1 ? "" : statement.slice(index + " where ".length);
}

/** The repository members that the rows call. */
type Repository = Record<string, (input: unknown) => Promise<unknown>>;

/**
 * Loads the repository module without a static import, so a load failure fails
 * an assertion instead of the whole file load.
 * @returns The module, or null when the module does not load.
 */
async function loadRepositoryModule(): Promise<Record<string, unknown> | null> {
  const href = new URL("../accounting-intake-document-repository.ts", import.meta.url)
    .href;
  try {
    return (await import(/* @vite-ignore */ href)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Builds the repository over one SQL double.
 * @param responses The row list that each statement returns, in order.
 * @returns The repository and the recorded calls.
 */
async function createRepository(
  responses: readonly (readonly Record<string, unknown>[])[],
): Promise<{ readonly repository: Repository; readonly calls: SqlCall[] }> {
  const module = await loadRepositoryModule();
  expect(
    module,
    "The module apps/accounting/app/lib/accounting-intake-document-repository.ts does not load",
  ).not.toBeNull();
  const factory = module?.createAccountingIntakeDocumentRepository;
  expect(typeof factory).toBe("function");
  const double = sqlDouble(responses);
  const repository = (
    factory as (input: { readonly sql: unknown }) => Repository
  )({ sql: double.sql });
  return { repository, calls: double.calls };
}

describe("the intake document repository statements", () => {
  it("binds scope_company_id beside the row id in each of the four mark and bump statements", async () => {
    const { repository, calls } = await createRepository([[], [], [], []]);
    const scope = { companyId: COMPANY_ID };
    const requests: readonly {
      readonly member: string;
      readonly input: Record<string, unknown>;
    }[] = [
      {
        member: "markDuplicate",
        input: {
          scope,
          id: ROW_ID,
          duplicateOfSubmissionId: SUBMISSION_ID,
          failureReason: "A content duplicate of an earlier submission",
        },
      },
      {
        member: "markParsed",
        input: {
          scope,
          id: ROW_ID,
          submissionId: SUBMISSION_ID,
          extraction: "local-text",
        },
      },
      {
        member: "markFailed",
        input: { scope, id: ROW_ID, failureReason: "review: the document read failed" },
      },
      {
        member: "bumpSighting",
        input: {
          scope,
          id: ROW_ID,
          sightingCount: 2,
          lastSeenAt: "2026-11-13T02:00:00.000Z",
        },
      },
    ];

    for (const request of requests) {
      expect(typeof repository[request.member], request.member).toBe("function");
      await repository[request.member]?.(request.input);
    }

    expect(calls.length).toBe(requests.length);
    let scopedUpdates = 0;
    calls.forEach((call, index) => {
      const member = requests[index]?.member ?? "";
      const statement = normalize(call.statement);
      expect(statement.startsWith("update accounting_intake_documents"), member).toBe(true);
      const where = whereClause(statement);
      expect(where, `${member} where clause`).toMatch(/scope_company_id\s*=\s*\?/u);
      expect(where, `${member} where clause`).toMatch(/(?:^|[^a-z_])id\s*=\s*\?/u);
      expect(call.values, `${member} bound values`).toContain(COMPANY_ID);
      expect(call.values, `${member} bound values`).toContain(ROW_ID);
      scopedUpdates += 1;
    });
    console.log(`scoped_updates=${scopedUpdates}`);
    expect(scopedUpdates).toBe(4);
  });

  it("reads the newest submissions from accounting_submissions with the company scope and the limit", async () => {
    const { repository, calls } = await createRepository([
      [{ id: SUBMISSION_ID, evidence_reference: EVIDENCE_REFERENCE }],
    ]);

    expect(typeof repository.listRecentSubmissionEvidence).toBe("function");
    const result = await repository.listRecentSubmissionEvidence?.({
      scope: { companyId: COMPANY_ID },
      limit: PASS_ONE_LIMIT,
    });

    expect(calls.length).toBe(1);
    const statement = normalize(calls[0]?.statement ?? "");
    expect(statement).toContain("from accounting_submissions");
    expect(statement).not.toContain("accounting_intake_documents");
    expect(whereClause(statement.replace(/order by.*$/u, ""))).toMatch(
      /scope_company_id\s*=\s*\?/u,
    );
    expect(statement).toMatch(/order by submitted_at desc/u);
    expect(calls[0]?.values).toContain(COMPANY_ID);
    expect(calls[0]?.values).toContain(PASS_ONE_LIMIT);
    expect(result).toEqual([
      { submissionId: SUBMISSION_ID, evidenceReference: EVIDENCE_REFERENCE },
    ]);
  });

  it("has no listRecentWithEvidence member after the port change", async () => {
    const { repository } = await createRepository([]);

    expect("listRecentWithEvidence" in repository).toBe(false);
  });

  it("binds the company id in the findByEvidenceByteSize statement", async () => {
    const { repository, calls } = await createRepository([[]]);

    expect(typeof repository.findByEvidenceByteSize).toBe("function");
    await repository.findByEvidenceByteSize?.({
      scope: { companyId: COMPANY_ID },
      evidenceByteSize: BYTE_SIZE,
    });

    expect(calls.length).toBe(1);
    const statement = normalize(calls[0]?.statement ?? "");
    expect(statement).toContain("from accounting_intake_documents");
    expect(whereClause(statement)).toMatch(/scope_company_id\s*=\s*\?/u);
    expect(calls[0]?.values).toContain(COMPANY_ID);
    expect(calls[0]?.values).toContain(BYTE_SIZE);
  });

  it("binds the company id in the findByDriveFileId statement", async () => {
    const { repository, calls } = await createRepository([[]]);

    expect(typeof repository.findByDriveFileId).toBe("function");
    await repository.findByDriveFileId?.({
      scope: { companyId: COMPANY_ID },
      driveFileId: DRIVE_FILE_ID,
    });

    expect(calls.length).toBe(1);
    const statement = normalize(calls[0]?.statement ?? "");
    expect(statement).toContain("from accounting_intake_documents");
    expect(whereClause(statement)).toMatch(/scope_company_id\s*=\s*\?/u);
    expect(calls[0]?.values).toContain(COMPANY_ID);
    expect(calls[0]?.values).toContain(DRIVE_FILE_ID);
  });
});
