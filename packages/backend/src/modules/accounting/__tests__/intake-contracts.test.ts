/**
 * Red tests for the Accounting intake contracts (`../intake-contracts.ts`).
 *
 * The module does not exist at the base. This file loads it with `existsSync`
 * and a dynamic import, so the failure is an assertion that names the missing
 * file or export and never a bare `Cannot find module` load error.
 *
 * Fake data only: a fake company id, a fake account id, a fake Drive file id,
 * a fake evidence reference, a fake amount in minor units, and the fake payee
 * "Test Counterparty". No real finance document, amount, name, or Drive id
 * enters this file. No hash field exists in any contract.
 *
 * Anti-pattern coverage:
 * - A3: counts are labeled integers (`contract_schemas=11`, `schema_cases=13`).
 * - A4: the behavior-case count is asserted before the loop runs.
 * - A5: every schema case names the export it proves.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

const CONTRACT_SOURCE_PATH = fileURLToPath(
  new URL("../intake-contracts.ts", import.meta.url),
);
const CONTRACT_MODULE_EXISTS = existsSync(CONTRACT_SOURCE_PATH);

type SafeParseResult = { readonly success: boolean };
type ParseableSchema = {
  readonly safeParse: (value: unknown) => SafeParseResult;
};

let contracts: Record<string, unknown> = {};

beforeAll(async () => {
  if (CONTRACT_MODULE_EXISTS) {
    contracts = (await import("../intake-contracts.js")) as Record<
      string,
      unknown
    >;
  }
});

/** Returns one exported schema or fails with the export name. */
function requireSchema(exportName: string): ParseableSchema {
  expect(
    CONTRACT_MODULE_EXISTS,
    `Missing packages/backend/src/modules/accounting/intake-contracts.ts. ` +
      `The intake contract exports cannot be proven until the file exists.`,
  ).toBe(true);
  const value = contracts[exportName];
  expect(
    value,
    `Missing export ${exportName} from intake-contracts.ts. ` +
      `The contract file must export every schema named in plan task 1.1.`,
  ).toBeDefined();
  expect(
    typeof (value as ParseableSchema).safeParse,
    `${exportName} must be a Zod schema with a safeParse member.`,
  ).toBe("function");
  return value as ParseableSchema;
}

/** Checks that a value parses and returns the parsed result. */
function parses(exportName: string, value: unknown): boolean {
  return requireSchema(exportName).safeParse(value).success;
}

const CONTRACT_SCHEMA_EXPORTS = [
  "accountingIntakeDocumentTypeSchema",
  "accountingIntakeStatusSchema",
  "accountingExtractionSchema",
  "accountingDriveFileIdSchema",
  "accountingIntakeDocumentSchema",
  "accountingMonthlyCloseStatusSchema",
  "accountingMonthlyCloseSchema",
  "accountingEvidenceStoreSchema",
  "accountingMonthlyCloseAuditActionSchema",
  "accountingIntakeHistorySourceSchema",
  "accountingEvidenceByteSizeSchema",
] as const;

const CONTRACT_SCHEMA_COUNT = CONTRACT_SCHEMA_EXPORTS.length;
if (CONTRACT_SCHEMA_COUNT !== 11) {
  throw new Error(
    `contract_schemas=${CONTRACT_SCHEMA_COUNT} is wrong; plan task 1.1 names eleven schemas.`,
  );
}

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
const SUBMISSION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DUPLICATE_OF_SUBMISSION_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const DRIVE_FILE_ID = "fake0drive0file0id0000000000000000000000";
const EVIDENCE_REFERENCE = `private-evidence://${COMPANY_ID}/submissions/${SUBMISSION_ID}/evidence`;
const SEEN_AT = "2026-11-09T00:00:00.000Z";

const validIntakeDocument = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  driveFileId: DRIVE_FILE_ID,
  driveFolderId: "fake-folder-id",
  sourceMonth: "2026-11",
  documentType: "receipt",
  status: "pending",
  submissionId: SUBMISSION_ID,
  duplicateOfSubmissionId: null,
  evidenceReference: EVIDENCE_REFERENCE,
  extraction: "human",
  failureReason: null,
  failureCount: 0,
  sightingCount: 1,
  evidenceByteSize: 12345,
  isHistory: false,
  historySource: null,
  firstSeenAt: SEEN_AT,
  lastSeenAt: SEEN_AT,
  scopeCompanyId: COMPANY_ID,
} as const;

const validMonthlyClose = {
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  periodMonth: "2026-11",
  status: "open",
  reportEvidenceReference: EVIDENCE_REFERENCE,
  openedByAccountId: ACCOUNT_ID,
  openedAt: SEEN_AT,
  signedByAccountId: null,
  signedByRole: null,
  signedAt: null,
  lockedAt: null,
  scopeCompanyId: COMPANY_ID,
} as const;

type BehaviorCase = {
  readonly name: string;
  readonly run: () => void;
};

const BEHAVIOR_CASES: readonly BehaviorCase[] = [
  {
    name: "accountingIntakeDocumentTypeSchema accepts the eight document types",
    run: () => {
      for (const documentType of [
        "receipt",
        "tax-invoice",
        "bank-statement",
        "payroll-sheet",
        "withholding-certificate",
        "payment-voucher-sheet",
        "cloud-invoice",
        "openai-invoice",
      ]) {
        expect(
          parses("accountingIntakeDocumentTypeSchema", documentType),
          `accountingIntakeDocumentTypeSchema must accept ${documentType}`,
        ).toBe(true);
      }
      expect(
        parses("accountingIntakeDocumentTypeSchema", "memo"),
        "accountingIntakeDocumentTypeSchema must reject an unknown type",
      ).toBe(false);
    },
  },
  {
    name: "accountingIntakeStatusSchema accepts pending, parsed, failed, duplicate",
    run: () => {
      for (const status of ["pending", "parsed", "failed", "duplicate"]) {
        expect(
          parses("accountingIntakeStatusSchema", status),
          `accountingIntakeStatusSchema must accept ${status}`,
        ).toBe(true);
      }
      expect(
        parses("accountingIntakeStatusSchema", "archived"),
        "accountingIntakeStatusSchema must reject an unknown status",
      ).toBe(false);
    },
  },
  {
    name: "accountingExtractionSchema accepts human, local-text, model",
    run: () => {
      for (const extraction of ["human", "local-text", "model"]) {
        expect(
          parses("accountingExtractionSchema", extraction),
          `accountingExtractionSchema must accept ${extraction}`,
        ).toBe(true);
      }
      expect(
        parses("accountingExtractionSchema", "vertex"),
        "accountingExtractionSchema must reject a value outside the marker set",
      ).toBe(false);
    },
  },
  {
    name: "accountingDriveFileIdSchema accepts a real-shaped id up to 256 characters",
    run: () => {
      expect(
        parses("accountingDriveFileIdSchema", DRIVE_FILE_ID),
        "accountingDriveFileIdSchema must accept a fake real-shaped id",
      ).toBe(true);
      expect(
        parses("accountingDriveFileIdSchema", "a".repeat(256)),
        "accountingDriveFileIdSchema must accept 256 characters",
      ).toBe(true);
      expect(
        parses("accountingDriveFileIdSchema", "a".repeat(257)),
        "accountingDriveFileIdSchema must reject 257 characters",
      ).toBe(false);
    },
  },
  {
    name: "accountingIntakeDocumentSchema parses a draft with extraction model",
    run: () => {
      expect(
        parses("accountingIntakeDocumentSchema", {
          ...validIntakeDocument,
          extraction: "model",
        }),
        "a valid draft with extraction model must parse",
      ).toBe(true);
      expect(
        parses("accountingIntakeDocumentSchema", {
          ...validIntakeDocument,
          extraction: "vertex",
        }),
        "a draft with a value outside the extraction enum must fail",
      ).toBe(false);
    },
  },
  {
    name: "accountingIntakeDocumentSchema rejects duplicate without duplicateOfSubmissionId",
    run: () => {
      expect(
        parses("accountingIntakeDocumentSchema", {
          ...validIntakeDocument,
          status: "duplicate",
        }),
        "status duplicate requires duplicateOfSubmissionId",
      ).toBe(false);
      expect(
        parses("accountingIntakeDocumentSchema", {
          ...validIntakeDocument,
          status: "duplicate",
          duplicateOfSubmissionId: DUPLICATE_OF_SUBMISSION_ID,
        }),
        "status duplicate with duplicateOfSubmissionId must parse",
      ).toBe(true);
    },
  },
  {
    name: "accountingIntakeDocumentSchema rejects failed without failureReason",
    run: () => {
      expect(
        parses("accountingIntakeDocumentSchema", {
          ...validIntakeDocument,
          status: "failed",
        }),
        "status failed requires failureReason",
      ).toBe(false);
      expect(
        parses("accountingIntakeDocumentSchema", {
          ...validIntakeDocument,
          status: "failed",
          failureReason: "schema draft rejected",
        }),
        "status failed with failureReason must parse",
      ).toBe(true);
    },
  },
  {
    name: "accountingIntakeDocumentSchema enforces the history marker both ways",
    run: () => {
      expect(
        parses("accountingIntakeDocumentSchema", {
          ...validIntakeDocument,
          isHistory: true,
        }),
        "isHistory true requires historySource",
      ).toBe(false);
      expect(
        parses("accountingIntakeDocumentSchema", {
          ...validIntakeDocument,
          historySource: "drive-folder",
        }),
        "a non-history row must not carry historySource",
      ).toBe(false);
      expect(
        parses("accountingIntakeDocumentSchema", {
          ...validIntakeDocument,
          isHistory: true,
          historySource: "drive-folder",
        }),
        "a history row with historySource must parse",
      ).toBe(true);
    },
  },
  {
    name: "accountingIntakeHistorySourceSchema accepts the two history sources",
    run: () => {
      for (const source of ["drive-folder", "drive-modified-date"]) {
        expect(
          parses("accountingIntakeHistorySourceSchema", source),
          `accountingIntakeHistorySourceSchema must accept ${source}`,
        ).toBe(true);
      }
      expect(
        parses("accountingIntakeHistorySourceSchema", "drive-owner"),
        "accountingIntakeHistorySourceSchema must reject an unknown source",
      ).toBe(false);
    },
  },
  {
    name: "accountingMonthlyCloseSchema rejects locked without lockedAt",
    run: () => {
      expect(
        parses("accountingMonthlyCloseSchema", {
          ...validMonthlyClose,
          status: "locked",
        }),
        "status locked requires lockedAt",
      ).toBe(false);
      expect(
        parses("accountingMonthlyCloseSchema", {
          ...validMonthlyClose,
          status: "locked",
          signedByAccountId: OTHER_ACCOUNT_ID,
          signedByRole: "CEO",
          signedAt: SEEN_AT,
          lockedAt: SEEN_AT,
        }),
        "a locked close with signedAt and lockedAt must parse",
      ).toBe(true);
    },
  },
  {
    name: "accountingMonthlyCloseStatusSchema accepts open, signed, locked",
    run: () => {
      for (const status of ["open", "signed", "locked"]) {
        expect(
          parses("accountingMonthlyCloseStatusSchema", status),
          `accountingMonthlyCloseStatusSchema must accept ${status}`,
        ).toBe(true);
      }
      expect(
        parses("accountingMonthlyCloseStatusSchema", "closed"),
        "accountingMonthlyCloseStatusSchema must reject an unknown status",
      ).toBe(false);
    },
  },
  {
    name: "accountingMonthlyCloseAuditActionSchema accepts the three actions",
    run: () => {
      for (const action of [
        "monthly-close-open",
        "monthly-close-sign",
        "monthly-close-lock",
      ]) {
        expect(
          parses("accountingMonthlyCloseAuditActionSchema", action),
          `accountingMonthlyCloseAuditActionSchema must accept ${action}`,
        ).toBe(true);
      }
      expect(
        parses("accountingMonthlyCloseAuditActionSchema", "monthly-close-delete"),
        "accountingMonthlyCloseAuditActionSchema must reject an unknown action",
      ).toBe(false);
    },
  },
  {
    name: "accountingEvidenceByteSizeSchema accepts a positive integer only",
    run: () => {
      expect(
        parses("accountingEvidenceByteSizeSchema", 12345),
        "a positive integer must parse",
      ).toBe(true);
      expect(
        parses("accountingEvidenceByteSizeSchema", 0),
        "zero must fail",
      ).toBe(false);
      expect(
        parses("accountingEvidenceByteSizeSchema", -1),
        "a negative value must fail",
      ).toBe(false);
      expect(
        parses("accountingEvidenceByteSizeSchema", 1.5),
        "a non-integer must fail",
      ).toBe(false);
      expect(
        parses("accountingEvidenceByteSizeSchema", "12345"),
        "a digit string must fail because the column is an integer",
      ).toBe(false);
    },
  },
];

describe("Accounting intake contracts at the Red base", () => {
  it("plans eleven contract schemas (contract_schemas=11)", () => {
    expect(CONTRACT_SCHEMA_COUNT, "contract_schemas=11").toBe(11);
  });

  it("plans at least eight behavior cases (schema_cases>=8)", () => {
    expect(
      BEHAVIOR_CASES.length,
      `schema_cases=${BEHAVIOR_CASES.length} — the floor is 8.`,
    ).toBeGreaterThanOrEqual(8);
  });

  it("exports all eleven contract schemas (contract_schemas=11)", () => {
    const missing: string[] = [];
    for (const exportName of CONTRACT_SCHEMA_EXPORTS) {
      if (!CONTRACT_MODULE_EXISTS) {
        missing.push(exportName);
        continue;
      }
      const value = contracts[exportName];
      if (
        value === undefined ||
        typeof (value as ParseableSchema).safeParse !== "function"
      ) {
        missing.push(exportName);
      }
    }
    expect(
      missing,
      `contract_schemas=${CONTRACT_SCHEMA_COUNT}; missing exports: ${missing.join(", ")}. ` +
        `Missing module: packages/backend/src/modules/accounting/intake-contracts.ts.`,
    ).toEqual([]);
  });

  for (const behaviorCase of BEHAVIOR_CASES) {
    it(behaviorCase.name, behaviorCase.run);
  }
});
