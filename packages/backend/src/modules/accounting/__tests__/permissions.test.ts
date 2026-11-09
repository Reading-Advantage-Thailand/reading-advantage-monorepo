/**
 * Red tests for the Accounting permissions module (`../permissions.ts`).
 *
 * The module does not exist at the base. This file loads it with `existsSync`
 * and a dynamic import, so a missing module is an assertion that names the
 * file, not a bare `Cannot find module` load error.
 *
 * One row per role per permission of spec section 3.2, with the CEO and the
 * CONTRACTOR included. A denial is a positive row: the function must return
 * false, and an absent function fails.
 *
 * Fake data only: a fake company id and fake account ids.
 *
 * Anti-pattern coverage:
 * - A1: the matrix is structured data, not prose.
 * - A3: counts are labeled integers (`permission_rows=60`, `permission_denials=34`).
 * - A4: the row count and the denial floor are asserted before the functions run.
 * - A5: every failing row names the permission and the role.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import type { AccountingActor } from "../submissions.js";

const PERMISSIONS_SOURCE_PATH = fileURLToPath(
  new URL("../permissions.ts", import.meta.url),
);
const PERMISSIONS_MODULE_EXISTS = existsSync(PERMISSIONS_SOURCE_PATH);

type PermissionCheck = (actor: AccountingActor, close?: unknown) => boolean;
type PermissionModule = Record<string, unknown>;

let permissions: PermissionModule = {};

beforeAll(async () => {
  if (PERMISSIONS_MODULE_EXISTS) {
    permissions = (await import("../permissions.js")) as PermissionModule;
  }
});

/** Returns one permission function or fails with the export name. */
function requirePermissionFunction(exportName: string): PermissionCheck {
  const value = permissions[exportName];
  expect(
    value,
    `Missing export ${exportName} from permissions.ts. ` +
      `The permissions module must export one function per permission of spec section 3.2.`,
  ).toBeDefined();
  expect(
    typeof value,
    `${exportName} must be a function that takes the AccountingActor.`,
  ).toBe("function");
  return value as PermissionCheck;
}

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";

const ROLES = ["OWNER", "CEO", "ACCOUNTANT", "CONTRACTOR", "STAFF"] as const;
type Role = (typeof ROLES)[number];

const ACTORS: Record<Role, AccountingActor> = {
  OWNER: { accountId: ACCOUNT_ID, companyId: COMPANY_ID, role: "OWNER" },
  CEO: { accountId: ACCOUNT_ID, companyId: COMPANY_ID, role: "CEO" },
  ACCOUNTANT: {
    accountId: ACCOUNT_ID,
    companyId: COMPANY_ID,
    role: "ACCOUNTANT",
  },
  CONTRACTOR: {
    accountId: ACCOUNT_ID,
    companyId: COMPANY_ID,
    role: "CONTRACTOR",
  },
  STAFF: { accountId: ACCOUNT_ID, companyId: COMPANY_ID, role: "STAFF" },
};

type ExpectedRoles = Readonly<Record<Role, boolean>>;

type PermissionRow = {
  readonly permission: string;
  readonly functionName: string;
  readonly expected: ExpectedRoles;
};

const yes = true;
const no = false;

const PERMISSION_ROWS: readonly PermissionRow[] = [
  {
    permission: "accounting:submission:submit",
    functionName: "canSubmitAccountingSubmission",
    expected: {
      OWNER: yes,
      CEO: no,
      ACCOUNTANT: yes,
      CONTRACTOR: yes,
      STAFF: yes,
    },
  },
  {
    permission: "accounting:submission:view-own",
    functionName: "canViewOwnAccountingSubmission",
    expected: {
      OWNER: no,
      CEO: no,
      ACCOUNTANT: no,
      CONTRACTOR: yes,
      STAFF: yes,
    },
  },
  {
    permission: "accounting:submission:view-all",
    functionName: "canViewAllAccountingSubmissions",
    expected: {
      OWNER: yes,
      CEO: no,
      ACCOUNTANT: yes,
      CONTRACTOR: no,
      STAFF: no,
    },
  },
  {
    permission: "accounting:submission:view-approved",
    functionName: "canViewApprovedAccountingSubmission",
    expected: {
      OWNER: yes,
      CEO: yes,
      ACCOUNTANT: yes,
      CONTRACTOR: no,
      STAFF: no,
    },
  },
  {
    permission: "accounting:submission:approve",
    functionName: "canApproveAccountingSubmission",
    expected: {
      OWNER: yes,
      CEO: no,
      ACCOUNTANT: yes,
      CONTRACTOR: no,
      STAFF: no,
    },
  },
  {
    permission: "accounting:submission:reject",
    functionName: "canRejectAccountingSubmission",
    expected: {
      OWNER: yes,
      CEO: no,
      ACCOUNTANT: yes,
      CONTRACTOR: no,
      STAFF: no,
    },
  },
  {
    permission: "accounting:submission:export",
    functionName: "canExportAccountingSubmissions",
    expected: {
      OWNER: yes,
      CEO: no,
      ACCOUNTANT: yes,
      CONTRACTOR: no,
      STAFF: no,
    },
  },
  {
    permission: "accounting:evidence:read",
    functionName: "canReadAccountingEvidence",
    expected: {
      OWNER: yes,
      CEO: no,
      ACCOUNTANT: yes,
      CONTRACTOR: no,
      STAFF: no,
    },
  },
  {
    permission: "accounting:evidence:read-approved",
    functionName: "canReadApprovedAccountingEvidence",
    expected: {
      OWNER: yes,
      CEO: yes,
      ACCOUNTANT: yes,
      CONTRACTOR: no,
      STAFF: no,
    },
  },
  {
    permission: "accounting:monthly-close:open",
    functionName: "canOpenMonthlyClose",
    expected: {
      OWNER: yes,
      CEO: no,
      ACCOUNTANT: yes,
      CONTRACTOR: no,
      STAFF: no,
    },
  },
  {
    permission: "accounting:monthly-close:sign",
    functionName: "canSignMonthlyClose",
    expected: {
      OWNER: no,
      CEO: yes,
      ACCOUNTANT: no,
      CONTRACTOR: no,
      STAFF: no,
    },
  },
  {
    permission: "accounting:monthly-close:lock",
    functionName: "canLockMonthlyClose",
    expected: {
      OWNER: no,
      CEO: yes,
      ACCOUNTANT: no,
      CONTRACTOR: no,
      STAFF: no,
    },
  },
];

const CLOSE_STATUSES = ["open", "signed", "locked"] as const;
type CloseStatus = (typeof CLOSE_STATUSES)[number];

const CLOSE_READ_EXPECTED: Readonly<
  Record<CloseStatus, Readonly<Record<Role, boolean>>>
> = {
  open: {
    OWNER: yes,
    CEO: no,
    ACCOUNTANT: yes,
    CONTRACTOR: no,
    STAFF: no,
  },
  signed: {
    OWNER: yes,
    CEO: no,
    ACCOUNTANT: yes,
    CONTRACTOR: no,
    STAFF: no,
  },
  locked: {
    OWNER: yes,
    CEO: yes,
    ACCOUNTANT: yes,
    CONTRACTOR: no,
    STAFF: no,
  },
};

const PERMISSION_ROW_COUNT = PERMISSION_ROWS.length * ROLES.length;
const PERMISSION_DENIAL_COUNT = PERMISSION_ROWS.reduce(
  (total, row) =>
    total + ROLES.filter((role) => row.expected[role] === false).length,
  0,
);
const CLOSE_STATUS_ROW_COUNT = CLOSE_STATUSES.length * ROLES.length;
const CLOSE_STATUS_DENIAL_COUNT = CLOSE_STATUSES.reduce(
  (total, status) =>
    total +
    ROLES.filter((role) => CLOSE_READ_EXPECTED[status][role] === false).length,
  0,
);

describe("Accounting permissions at the Red base", () => {
  it("exists at packages/backend/src/modules/accounting/permissions.ts", () => {
    expect(
      PERMISSIONS_MODULE_EXISTS,
      "Missing packages/backend/src/modules/accounting/permissions.ts.",
    ).toBe(true);
  });

  it("holds one row per role per permission with a denial floor (A4 guard)", () => {
    expect(
      PERMISSION_ROW_COUNT,
      `permission_rows=${PERMISSION_ROW_COUNT} — the floor is 13.`,
    ).toBeGreaterThanOrEqual(13);
    expect(
      PERMISSION_DENIAL_COUNT,
      `permission_denials=${PERMISSION_DENIAL_COUNT} — the floor is 8.`,
    ).toBeGreaterThanOrEqual(8);
    expect(
      CLOSE_STATUS_ROW_COUNT,
      `close_status_rows=${CLOSE_STATUS_ROW_COUNT} — the floor is 15.`,
    ).toBe(15);
    expect(
      CLOSE_STATUS_DENIAL_COUNT,
      `close_status_denials=${CLOSE_STATUS_DENIAL_COUNT} — the floor is 8.`,
    ).toBeGreaterThanOrEqual(8);
  });
});

describe("Accounting permission matrix (spec section 3.2)", () => {
  for (const row of PERMISSION_ROWS) {
    it(`${row.permission} matches the role matrix`, () => {
      const check = requirePermissionFunction(row.functionName);
      const failures: string[] = [];
      for (const role of ROLES) {
        const actual = check(ACTORS[role]);
        const expected = row.expected[role];
        if (actual !== expected) {
          failures.push(
            `${row.permission} for ${role}: expected ${expected}, received ${actual}`,
          );
        }
      }
      expect(
        failures,
        `permission_rows=${PERMISSION_ROW_COUNT}; mismatches: ${failures.join("; ")}`,
      ).toEqual([]);
    });
  }
});

describe("Accounting monthly close read by status", () => {
  for (const status of CLOSE_STATUSES) {
    it(`canReadMonthlyClose for a ${status} close matches the role matrix`, () => {
      const check = requirePermissionFunction("canReadMonthlyClose");
      const close = { status };
      const failures: string[] = [];
      for (const role of ROLES) {
        const actual = check(ACTORS[role], close);
        const expected = CLOSE_READ_EXPECTED[status][role];
        if (actual !== expected) {
          failures.push(
            `monthly-close:read ${status} for ${role}: expected ${expected}, received ${actual}`,
          );
        }
      }
      expect(
        failures,
        `close_status_rows=${CLOSE_STATUS_ROW_COUNT}; mismatches: ${failures.join("; ")}`,
      ).toEqual([]);
    });
  }
});
