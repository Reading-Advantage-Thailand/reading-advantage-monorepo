/**
 * Red tests for the Accounting monthly close domain module (`../monthly-close.ts`).
 *
 * The module does not exist at the base. This file loads it with `existsSync`
 * and a dynamic import, so each failure is an assertion that names the missing
 * file or export and never a bare `Cannot find module` load error.
 *
 * Contract this file fixes for the Green phase (plan task 2.2):
 * - `openMonthlyClose({ repository, evidenceStore, actor, periodMonth })`
 * - `signMonthlyClose({ repository, actor, closeId })`
 * - `lockMonthlyClose({ repository, actor, closeId })`
 * - `listMonthlyCloses({ repository, actor })`
 * - `FIRST_LIVE_MONTH = "2026-11"`, a code constant.
 * - Repository port members: `findByPeriodMonth`, `listApprovedSubmissions`,
 *   `insert`, `findById`, `save`, `listByScope`, `recordAuditEvent`.
 * - The domain throws `AccountingSubmissionError` with the reasons
 *   `forbidden`, `conflict`, and `invalid-input`.
 *
 * Fake data only: a fake company id, fake account ids, a fake report evidence
 * reference, and the fake amount "100" minor units. No real finance document
 * or amount enters this file.
 *
 * Anti-pattern coverage:
 * - A1/A3: counts are labeled integers (`close_functions`, `close_audit_actions`,
 *   `sign_denied_roles`).
 * - A4: the function count and the denied-role count are asserted before use.
 * - A6: a denial is a positive case for each wrong role, not an absent case.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  accountingSubmissionSchema,
  type AccountingSubmission,
} from "../contracts.js";
import {
  accountingMonthlyCloseAuditEventSchema,
  accountingMonthlyCloseSchema,
  type AccountingMonthlyClose,
  type AccountingMonthlyCloseAuditEvent,
  type AccountingEvidenceStore,
} from "../intake-contracts.js";
import {
  AccountingSubmissionError,
  type AccountingActor,
} from "../submissions.js";

const MODULE_SOURCE_PATH = fileURLToPath(
  new URL("../monthly-close.ts", import.meta.url),
);
const MODULE_EXISTS = existsSync(MODULE_SOURCE_PATH);

type CloseFunction = (request: unknown) => Promise<unknown>;

let closeModule: Record<string, unknown> = {};

beforeAll(async () => {
  if (MODULE_EXISTS) {
    closeModule = (await import("../monthly-close.js")) as Record<
      string,
      unknown
    >;
  }
});

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const OWNER_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const CEO_ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
const ACCOUNTANT_ACCOUNT_ID = "33333333-3333-4333-8333-333333333333";
const STAFF_ACCOUNT_ID = "44444444-4444-4444-8444-444444444444";
const CONTRACTOR_ACCOUNT_ID = "55555555-5555-4555-8555-555555555555";
const CLOSE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_CLOSE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const THIRD_CLOSE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SUBMISSION_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const PERIOD_MONTH = "2026-11";
const MONTH_BEFORE_FIRST_LIVE = "2026-10";
const OPENED_AT = "2026-11-01T02:03:04.000Z";
const REPORT_REFERENCE = `private-evidence://${COMPANY_ID}/monthly-closes/${CLOSE_ID}/report`;

const CLOSE_FUNCTIONS = [
  "openMonthlyClose",
  "signMonthlyClose",
  "lockMonthlyClose",
  "listMonthlyCloses",
] as const;
const AUDIT_ACTIONS = [
  "monthly-close-open",
  "monthly-close-sign",
  "monthly-close-lock",
] as const;
const SIGN_DENIED_ROLES = [
  "OWNER",
  "ACCOUNTANT",
  "STAFF",
  "CONTRACTOR",
] as const;

console.log(`close_functions=${CLOSE_FUNCTIONS.length}`);
console.log(`close_audit_actions=${AUDIT_ACTIONS.length}`);
console.log(`sign_denied_roles=${SIGN_DENIED_ROLES.length}`);

if (CLOSE_FUNCTIONS.length !== 4) {
  throw new Error(
    `close_functions=${CLOSE_FUNCTIONS.length} is wrong; plan task 2.2 names four functions.`,
  );
}
if (AUDIT_ACTIONS.length !== 3) {
  throw new Error(
    `close_audit_actions=${AUDIT_ACTIONS.length} is wrong; FR-5 names three actions.`,
  );
}
if (SIGN_DENIED_ROLES.length !== 4) {
  throw new Error(
    `sign_denied_roles=${SIGN_DENIED_ROLES.length} is wrong; four roles must not sign.`,
  );
}

const ownerActor: AccountingActor = {
  accountId: OWNER_ACCOUNT_ID,
  companyId: COMPANY_ID,
  role: "OWNER",
};
const ceoActor: AccountingActor = {
  accountId: CEO_ACCOUNT_ID,
  companyId: COMPANY_ID,
  role: "CEO",
};
const accountantActor: AccountingActor = {
  accountId: ACCOUNTANT_ACCOUNT_ID,
  companyId: COMPANY_ID,
  role: "ACCOUNTANT",
};
const staffActor: AccountingActor = {
  accountId: STAFF_ACCOUNT_ID,
  companyId: COMPANY_ID,
  role: "STAFF",
};
const contractorActor: AccountingActor = {
  accountId: CONTRACTOR_ACCOUNT_ID,
  companyId: COMPANY_ID,
  role: "CONTRACTOR",
};

const deniedActorByRole: Readonly<Record<string, AccountingActor>> = {
  OWNER: ownerActor,
  ACCOUNTANT: accountantActor,
  STAFF: staffActor,
  CONTRACTOR: contractorActor,
};

/** Returns one exported close function or fails with the export name. */
function requireCloseFunction(name: string): CloseFunction {
  expect(
    MODULE_EXISTS,
    `Missing packages/backend/src/modules/accounting/monthly-close.ts. ` +
      `The close functions cannot be proven until the file exists.`,
  ).toBe(true);
  const value = closeModule[name];
  expect(
    value,
    `Missing export ${name} from monthly-close.ts. ` +
      `The close module must export every function named in plan task 2.2.`,
  ).toBeDefined();
  expect(
    typeof value,
    `${name} must be a function.`,
  ).toBe("function");
  return value as CloseFunction;
}

/** Builds a valid close row for the fake repository. */
function closeRow(
  overrides: Partial<AccountingMonthlyClose> = {},
): AccountingMonthlyClose {
  return accountingMonthlyCloseSchema.parse({
    id: CLOSE_ID,
    periodMonth: PERIOD_MONTH,
    status: "open",
    reportEvidenceReference: REPORT_REFERENCE,
    openedByAccountId: OWNER_ACCOUNT_ID,
    openedAt: OPENED_AT,
    signedByAccountId: null,
    signedByRole: null,
    signedAt: null,
    lockedAt: null,
    scopeCompanyId: COMPANY_ID,
    ...overrides,
  });
}

/** Builds one approved submission inside the period. */
function approvedSubmission(): AccountingSubmission {
  return accountingSubmissionSchema.parse({
    id: SUBMISSION_ID,
    scope: { companyId: COMPANY_ID },
    status: "approved",
    submittedByAccountId: STAFF_ACCOUNT_ID,
    submittedAt: "2026-11-05T02:03:04.000Z",
    kind: "expense",
    payee: "Test Counterparty",
    category: "supplies",
    money: { amountMinor: "100", currency: "THB" },
    evidenceReference: `private-evidence://${COMPANY_ID}/submissions/${SUBMISSION_ID}/evidence`,
  });
}

/** Fake close repository port. The close domain reads and writes through it. */
function createFakeCloseRepository(
  input: {
    readonly closes?: readonly AccountingMonthlyClose[];
    readonly approvedSubmissions?: readonly AccountingSubmission[];
  } = {},
) {
  const closes = [...(input.closes ?? [])];
  const approvedSubmissions = [...(input.approvedSubmissions ?? [])];
  const auditEvents: AccountingMonthlyCloseAuditEvent[] = [];
  return {
    closes,
    auditEvents,
    approvedSubmissions,
    findByPeriodMonth: vi.fn(
      async (request: {
        readonly scope: { readonly companyId: string };
        readonly periodMonth: string;
      }) =>
        closes.find(
          (close) =>
            close.scopeCompanyId === request.scope.companyId &&
            close.periodMonth === request.periodMonth,
        ),
    ),
    listApprovedSubmissions: vi.fn(
      async (request: {
        readonly scope: { readonly companyId: string };
        readonly periodMonth: string;
      }) =>
        approvedSubmissions.filter(
          (submission) =>
            submission.scope.companyId === request.scope.companyId &&
            submission.status === "approved" &&
            submission.submittedAt.slice(0, 7) === request.periodMonth,
        ),
    ),
    insert: vi.fn(async (close: AccountingMonthlyClose) => {
      closes.push(close);
      return close;
    }),
    findById: vi.fn(
      async (request: {
        readonly scope: { readonly companyId: string };
        readonly closeId: string;
      }) =>
        closes.find(
          (close) =>
            close.scopeCompanyId === request.scope.companyId &&
            close.id === request.closeId,
        ),
    ),
    save: vi.fn(
      async (
        close: AccountingMonthlyClose,
        expectedStatus?: string,
      ): Promise<AccountingMonthlyClose | undefined> => {
        const index = closes.findIndex((stored) => stored.id === close.id);
        const current = index < 0 ? undefined : closes[index];
        if (current === undefined) return undefined;
        if (expectedStatus !== undefined && current.status !== expectedStatus) {
          return undefined;
        }
        closes[index] = close;
        return close;
      },
    ),
    listByScope: vi.fn(
      async (scope: { readonly companyId: string }) =>
        closes.filter((close) => close.scopeCompanyId === scope.companyId),
    ),
    recordAuditEvent: vi.fn(
      async (event: AccountingMonthlyCloseAuditEvent) => {
        auditEvents.push(event);
        return event;
      },
    ),
  };
}

/** Fake private evidence port. It returns one fake report reference. */
function createFakeEvidenceStore() {
  return {
    put: vi.fn(async () => ({
      evidenceReference: REPORT_REFERENCE,
      byteSize: 2048,
    })),
    read: vi.fn(async () => new Uint8Array()),
    sameEvidenceBytes: vi.fn(async () => true),
  } as unknown as AccountingEvidenceStore & {
    readonly put: ReturnType<typeof vi.fn>;
  };
}

describe("monthly close module boundary", () => {
  it("exports the four close functions", () => {
    for (const name of CLOSE_FUNCTIONS) {
      requireCloseFunction(name);
    }
  });

  it("defines FIRST_LIVE_MONTH as a 2026-11 code constant", () => {
    expect(
      MODULE_EXISTS,
      "Missing packages/backend/src/modules/accounting/monthly-close.ts.",
    ).toBe(true);
    expect(
      closeModule.FIRST_LIVE_MONTH,
      "monthly-close.ts must export FIRST_LIVE_MONTH.",
    ).toBe("2026-11");

    const source = readFileSync(MODULE_SOURCE_PATH, "utf8");
    expect(
      /(?:const|let)\s+FIRST_LIVE_MONTH\s*(?::[^=]+)?=\s*"2026-11"/u.test(
        source,
      ),
      "FIRST_LIVE_MONTH must be the code constant \"2026-11\".",
    ).toBe(true);
    expect(
      /process\.env\.FIRST_LIVE_MONTH/u.test(source),
      "FIRST_LIVE_MONTH must be a code constant, not an environment variable.",
    ).toBe(false);
  });
});

describe("openMonthlyClose", () => {
  it("collects the approved period submissions, stores the report, and keeps the close open", async () => {
    const openMonthlyClose = requireCloseFunction("openMonthlyClose");
    const repository = createFakeCloseRepository({
      approvedSubmissions: [approvedSubmission()],
    });
    const evidenceStore = createFakeEvidenceStore();

    const close = (await openMonthlyClose({
      repository,
      evidenceStore,
      actor: ownerActor,
      periodMonth: PERIOD_MONTH,
    })) as AccountingMonthlyClose;

    expect(repository.listApprovedSubmissions).toHaveBeenCalledWith({
      scope: { companyId: COMPANY_ID },
      periodMonth: PERIOD_MONTH,
    });
    expect(evidenceStore.put).toHaveBeenCalledTimes(1);
    expect(evidenceStore.put.mock.calls[0]?.[0]).toMatchObject({
      companyId: COMPANY_ID,
    });
    expect(repository.insert).toHaveBeenCalledTimes(1);
    expect(close.status).toBe("open");
    expect(close.periodMonth).toBe(PERIOD_MONTH);
    expect(close.reportEvidenceReference).toBe(REPORT_REFERENCE);
    expect(close.scopeCompanyId).toBe(COMPANY_ID);
    expect(accountingMonthlyCloseSchema.safeParse(close).success).toBe(true);

    expect(repository.auditEvents).toHaveLength(1);
    const openEvent = repository.auditEvents[0];
    expect(openEvent).toMatchObject({
      action: "monthly-close-open",
      actorAccountId: OWNER_ACCOUNT_ID,
    });
    expect(accountingMonthlyCloseAuditEventSchema.safeParse(openEvent).success)
      .toBe(true);
  });

  it("refuses a second close for one period month", async () => {
    const openMonthlyClose = requireCloseFunction("openMonthlyClose");
    const repository = createFakeCloseRepository({ closes: [closeRow()] });
    const evidenceStore = createFakeEvidenceStore();

    const error = await openMonthlyClose({
      repository,
      evidenceStore,
      actor: ownerActor,
      periodMonth: PERIOD_MONTH,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect(error).toMatchObject({ reason: "conflict" });
    expect(repository.insert).not.toHaveBeenCalled();
    expect(evidenceStore.put).not.toHaveBeenCalled();
  });

  it("refuses a month before the first live month", async () => {
    const openMonthlyClose = requireCloseFunction("openMonthlyClose");
    const repository = createFakeCloseRepository();
    const evidenceStore = createFakeEvidenceStore();

    const error = await openMonthlyClose({
      repository,
      evidenceStore,
      actor: ownerActor,
      periodMonth: MONTH_BEFORE_FIRST_LIVE,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect(error).toMatchObject({ reason: "invalid-input" });
    expect(repository.insert).not.toHaveBeenCalled();
    expect(evidenceStore.put).not.toHaveBeenCalled();
  });
});

describe("signMonthlyClose", () => {
  it("lets a CEO sign and lock the close, with the sign and lock audit rows", async () => {
    const signMonthlyClose = requireCloseFunction("signMonthlyClose");
    const repository = createFakeCloseRepository({ closes: [closeRow()] });

    const signed = (await signMonthlyClose({
      repository,
      actor: ceoActor,
      closeId: CLOSE_ID,
    })) as AccountingMonthlyClose;

    expect(signed.status).toBe("locked");
    expect(signed.signedAt).not.toBeNull();
    expect(signed.signedByAccountId).toBe(CEO_ACCOUNT_ID);
    expect(signed.lockedAt).not.toBeNull();
    expect(accountingMonthlyCloseSchema.safeParse(signed).success).toBe(true);

    expect(repository.auditEvents).toHaveLength(2);
    expect(repository.auditEvents.map((event) => event.action)).toEqual([
      "monthly-close-sign",
      "monthly-close-lock",
    ]);
    for (const event of repository.auditEvents) {
      expect(event).toMatchObject({
        closeId: CLOSE_ID,
        actorAccountId: CEO_ACCOUNT_ID,
        actorRole: "CEO",
      });
      expect(accountingMonthlyCloseAuditEventSchema.safeParse(event).success)
        .toBe(true);
    }
  });

  it("writes the three close audit actions across one open and one sign", async () => {
    const openMonthlyClose = requireCloseFunction("openMonthlyClose");
    const signMonthlyClose = requireCloseFunction("signMonthlyClose");
    const repository = createFakeCloseRepository({
      approvedSubmissions: [approvedSubmission()],
    });
    const evidenceStore = createFakeEvidenceStore();

    const opened = (await openMonthlyClose({
      repository,
      evidenceStore,
      actor: ownerActor,
      periodMonth: PERIOD_MONTH,
    })) as AccountingMonthlyClose;
    await signMonthlyClose({
      repository,
      actor: ceoActor,
      closeId: opened.id,
    });

    const actions = new Set(
      repository.auditEvents.map((event) => event.action),
    );
    expect([...actions].sort()).toEqual([...AUDIT_ACTIONS].sort());
    expect(actions.size).toBe(AUDIT_ACTIONS.length);
    expect(repository.auditEvents).toHaveLength(3);
  });

  it.each(SIGN_DENIED_ROLES)(
    "refuses a sign from a %s actor",
    async (role) => {
      const signMonthlyClose = requireCloseFunction("signMonthlyClose");
      const repository = createFakeCloseRepository({ closes: [closeRow()] });

      const error = await signMonthlyClose({
        repository,
        actor: deniedActorByRole[role],
        closeId: CLOSE_ID,
      }).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(AccountingSubmissionError);
      expect(error).toMatchObject({ reason: "forbidden" });
      expect(repository.auditEvents).toHaveLength(0);
      expect(repository.closes[0]?.status).toBe("open");
    },
  );

  it("changes no row and writes no audit row on a second sign", async () => {
    const signMonthlyClose = requireCloseFunction("signMonthlyClose");
    const lockedAt = "2026-11-30T02:03:04.000Z";
    const repository = createFakeCloseRepository({
      closes: [
        closeRow({
          status: "locked",
          signedByAccountId: CEO_ACCOUNT_ID,
          signedByRole: "CEO",
          signedAt: lockedAt,
          lockedAt,
        }),
      ],
    });

    const second = (await signMonthlyClose({
      repository,
      actor: ceoActor,
      closeId: CLOSE_ID,
    })) as AccountingMonthlyClose;

    expect(second.status).toBe("locked");
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.auditEvents).toHaveLength(0);
  });

  it("finishes the lock on a close stranded at status signed", async () => {
    const signMonthlyClose = requireCloseFunction("signMonthlyClose");
    const repository = createFakeCloseRepository({
      closes: [
        closeRow({
          status: "signed",
          signedByAccountId: CEO_ACCOUNT_ID,
          signedByRole: "CEO",
          signedAt: "2026-11-30T02:03:04.000Z",
        }),
      ],
    });

    const locked = (await signMonthlyClose({
      repository,
      actor: ceoActor,
      closeId: CLOSE_ID,
    }).catch((caught: unknown) => caught)) as AccountingMonthlyClose;

    expect(locked).not.toBeInstanceOf(AccountingSubmissionError);
    expect(locked.status).toBe("locked");
    expect(locked.lockedAt).not.toBeNull();
    expect(repository.auditEvents).toHaveLength(1);
    expect(repository.auditEvents[0]).toMatchObject({
      action: "monthly-close-lock",
      actorAccountId: CEO_ACCOUNT_ID,
    });
    expect(
      repository.auditEvents.filter(
        (event) => event.action === "monthly-close-sign",
      ),
    ).toHaveLength(0);
  });

  it("refuses a sign that lost the compare-and-swap with conflict and no audit row", async () => {
    const signMonthlyClose = requireCloseFunction("signMonthlyClose");
    const repository = createFakeCloseRepository({
      closes: [
        closeRow({
          status: "locked",
          signedByAccountId: CEO_ACCOUNT_ID,
          signedByRole: "CEO",
          signedAt: "2026-11-30T02:03:04.000Z",
          lockedAt: "2026-11-30T02:03:04.000Z",
        }),
      ],
    });
    vi.mocked(repository.findById).mockResolvedValueOnce(closeRow());

    const error = await signMonthlyClose({
      repository,
      actor: ceoActor,
      closeId: CLOSE_ID,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect(error).toMatchObject({ reason: "conflict" });
    expect(repository.auditEvents).toHaveLength(0);
  });
});

describe("lockMonthlyClose", () => {
  it("lets a CEO lock a signed close with one lock audit row", async () => {
    const lockMonthlyClose = requireCloseFunction("lockMonthlyClose");
    const repository = createFakeCloseRepository({
      closes: [
        closeRow({
          status: "signed",
          signedByAccountId: CEO_ACCOUNT_ID,
          signedByRole: "CEO",
          signedAt: "2026-11-30T02:03:04.000Z",
        }),
      ],
    });

    const locked = (await lockMonthlyClose({
      repository,
      actor: ceoActor,
      closeId: CLOSE_ID,
    })) as AccountingMonthlyClose;

    expect(locked.status).toBe("locked");
    expect(locked.lockedAt).not.toBeNull();
    expect(repository.auditEvents).toHaveLength(1);
    expect(repository.auditEvents[0]).toMatchObject({
      action: "monthly-close-lock",
      actorAccountId: CEO_ACCOUNT_ID,
    });
  });

  it("refuses a lock from an OWNER actor", async () => {
    const lockMonthlyClose = requireCloseFunction("lockMonthlyClose");
    const repository = createFakeCloseRepository({
      closes: [
        closeRow({
          status: "signed",
          signedByAccountId: CEO_ACCOUNT_ID,
          signedByRole: "CEO",
          signedAt: "2026-11-30T02:03:04.000Z",
        }),
      ],
    });

    const error = await lockMonthlyClose({
      repository,
      actor: ownerActor,
      closeId: CLOSE_ID,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect(error).toMatchObject({ reason: "forbidden" });
    expect(repository.auditEvents).toHaveLength(0);
  });
});

describe("listMonthlyCloses", () => {
  const openClose = closeRow({ id: CLOSE_ID, status: "open" });
  const signedClose = closeRow({
    id: OTHER_CLOSE_ID,
    status: "signed",
    signedByAccountId: CEO_ACCOUNT_ID,
    signedByRole: "CEO",
    signedAt: "2026-11-30T02:03:04.000Z",
  });
  const lockedClose = closeRow({
    id: THIRD_CLOSE_ID,
    status: "locked",
    signedByAccountId: CEO_ACCOUNT_ID,
    signedByRole: "CEO",
    signedAt: "2026-11-30T02:03:04.000Z",
    lockedAt: "2026-11-30T02:03:04.000Z",
  });

  it("returns a locked close to a CEO and hides the open and signed closes", async () => {
    const listMonthlyCloses = requireCloseFunction("listMonthlyCloses");
    const repository = createFakeCloseRepository({
      closes: [openClose, signedClose, lockedClose],
    });

    const closes = (await listMonthlyCloses({
      repository,
      actor: ceoActor,
    })) as readonly AccountingMonthlyClose[];

    expect(closes).toEqual([lockedClose]);
  });

  it.each(["OWNER", "ACCOUNTANT"] as const)(
    "returns every close to an %s actor",
    async (role) => {
      const listMonthlyCloses = requireCloseFunction("listMonthlyCloses");
      const repository = createFakeCloseRepository({
        closes: [openClose, signedClose, lockedClose],
      });

      const closes = (await listMonthlyCloses({
        repository,
        actor: { ...ownerActor, role },
      })) as readonly AccountingMonthlyClose[];

      expect(closes).toEqual([openClose, signedClose, lockedClose]);
    },
  );
});

const NOT_A_UUID = "not-a-uuid";

describe("close id validation", () => {
  it("refuses a sign with a close id that is not a UUID and makes no repository call", async () => {
    const signMonthlyClose = requireCloseFunction("signMonthlyClose");
    const repository = createFakeCloseRepository({ closes: [closeRow()] });

    const error = await signMonthlyClose({
      repository,
      actor: ceoActor,
      closeId: NOT_A_UUID,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect(error).toMatchObject({ reason: "invalid-input" });
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.auditEvents).toHaveLength(0);
  });

  it("refuses a lock with a close id that is not a UUID and makes no repository call", async () => {
    const lockMonthlyClose = requireCloseFunction("lockMonthlyClose");
    const repository = createFakeCloseRepository({
      closes: [
        closeRow({
          status: "signed",
          signedByAccountId: CEO_ACCOUNT_ID,
          signedByRole: "CEO",
          signedAt: "2026-11-30T02:03:04.000Z",
        }),
      ],
    });

    const error = await lockMonthlyClose({
      repository,
      actor: ceoActor,
      closeId: NOT_A_UUID,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AccountingSubmissionError);
    expect(error).toMatchObject({ reason: "invalid-input" });
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.auditEvents).toHaveLength(0);
  });
});
