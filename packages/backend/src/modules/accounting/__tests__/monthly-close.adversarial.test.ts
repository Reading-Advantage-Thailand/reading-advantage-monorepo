/**
 * Adversarial tests for the Accounting monthly close domain module
 * (`../monthly-close.ts`), Phase 2 of accounting_drive_intake_20261109.
 *
 * The fake repository below has a strict compare-and-swap: `save` reports no
 * change unless the stored status equals the expected status, and a missing
 * expected status never matches. Fake data only: fake company ids, fake
 * account ids, and the fake amount "100" minor units.
 *
 * Risks covered: a sign or lock race, a non-CEO sign, a wrong tenant, a hostile
 * close id, a hostile period month, a lost compare-and-swap in the lock, a
 * rethrown driver error, and the audit row count of every step.
 */
import { describe, expect, it, vi } from "vitest";

import {
  accountingSubmissionSchema,
  type AccountingSubmission,
} from "../contracts.js";
import {
  accountingMonthlyCloseAuditEventSchema,
  accountingMonthlyCloseSchema,
  type AccountingEvidenceStore,
  type AccountingMonthlyClose,
  type AccountingMonthlyCloseAuditEvent,
} from "../intake-contracts.js";
import {
  listMonthlyCloses,
  lockMonthlyClose,
  openMonthlyClose,
  signMonthlyClose,
  type AccountingMonthlyCloseRepository,
} from "../monthly-close.js";
import {
  AccountingSubmissionError,
  type AccountingActor,
} from "../submissions.js";

const COMPANY_A = "00000000-0000-4000-8000-0000000000a1";
const COMPANY_B = "00000000-0000-4000-8000-0000000000b2";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const CEO_ID = "22222222-2222-4222-8222-222222222222";
const CEO_TWO_ID = "22222222-2222-4222-8222-222222222223";
const ACCOUNTANT_ID = "33333333-3333-4333-8333-333333333333";
const STAFF_ID = "44444444-4444-4444-8444-444444444444";
const CONTRACTOR_ID = "55555555-5555-4555-8555-555555555555";
const CLOSE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const UNKNOWN_CLOSE_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const SUBMISSION_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const OTHER_SUBMISSION_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddd02";
const PERIOD_MONTH = "2026-11";
const REPORT_REFERENCE = `private-evidence://${COMPANY_A}/monthly-closes/${CLOSE_ID}/report`;
const SIGNED_AT = "2026-11-30T02:03:04.000Z";

const ownerActor: AccountingActor = {
  accountId: OWNER_ID,
  companyId: COMPANY_A,
  role: "OWNER",
};
const accountantActor: AccountingActor = {
  accountId: ACCOUNTANT_ID,
  companyId: COMPANY_A,
  role: "ACCOUNTANT",
};
const ceoActor: AccountingActor = {
  accountId: CEO_ID,
  companyId: COMPANY_A,
  role: "CEO",
};
const secondCeoActor: AccountingActor = {
  accountId: CEO_TWO_ID,
  companyId: COMPANY_A,
  role: "CEO",
};
const foreignCeoActor: AccountingActor = {
  accountId: CEO_ID,
  companyId: COMPANY_B,
  role: "CEO",
};
const foreignOwnerActor: AccountingActor = {
  accountId: OWNER_ID,
  companyId: COMPANY_B,
  role: "OWNER",
};

/** Roles and role-like strings that must never open a close. */
const OPEN_DENIED_ROLES = [
  "CEO",
  "STAFF",
  "CONTRACTOR",
  "ADMIN",
  "owner",
  "Owner ",
  "",
] as const;

/** Roles and role-like strings that must never sign or lock a close. */
const SIGN_DENIED_ROLES = [
  "OWNER",
  "ACCOUNTANT",
  "STAFF",
  "CONTRACTOR",
  "ADMIN",
  "ceo",
  "CEO ",
  "",
] as const;

/** Roles and role-like strings that must never list the closes. */
const LIST_DENIED_ROLES = ["STAFF", "CONTRACTOR", "ADMIN", "ceo", ""] as const;

/** Close ids that hold no UUID shape. */
const HOSTILE_CLOSE_IDS = [
  "",
  " ",
  "not-a-uuid",
  "../../etc/passwd",
  "1' OR '1'='1",
  `${CLOSE_ID}\n`,
  `${CLOSE_ID} `,
  ` ${CLOSE_ID}`,
  CLOSE_ID.split("-").join(""),
  `{${CLOSE_ID}}`,
  undefined as unknown as string,
  null as unknown as string,
  42 as unknown as string,
] as const;

/** Period months that hold no calendar shape, or fall before the first live month. */
const HOSTILE_PERIOD_MONTHS = [
  "",
  "2026-13",
  "2026-00",
  "2026-1",
  "2026-011",
  "202611",
  "2026/11",
  "2026-11-01",
  " 2026-11",
  "2026-11 ",
  "2026-11\n",
  "２０２６-11",
  "2026-1x",
  "2026-10",
  "2025-12",
  "0000-01",
  "2026-11'; drop table accounting_monthly_closes; --",
  undefined as unknown as string,
  null as unknown as string,
  202611 as unknown as string,
] as const;

/** Builds one valid close row. */
function closeRow(
  overrides: Partial<AccountingMonthlyClose> = {},
): AccountingMonthlyClose {
  return accountingMonthlyCloseSchema.parse({
    id: CLOSE_ID,
    periodMonth: PERIOD_MONTH,
    status: "open",
    reportEvidenceReference: REPORT_REFERENCE,
    openedByAccountId: OWNER_ID,
    openedAt: "2026-11-01T02:03:04.000Z",
    signedByAccountId: null,
    signedByRole: null,
    signedAt: null,
    lockedAt: null,
    scopeCompanyId: COMPANY_A,
    ...overrides,
  });
}

/** Builds one signed close row, the state a crash after the sign leaves. */
function signedRow(
  overrides: Partial<AccountingMonthlyClose> = {},
): AccountingMonthlyClose {
  return closeRow({
    status: "signed",
    signedByAccountId: CEO_ID,
    signedByRole: "CEO",
    signedAt: SIGNED_AT,
    ...overrides,
  });
}

/** Builds one locked close row. */
function lockedRow(
  overrides: Partial<AccountingMonthlyClose> = {},
): AccountingMonthlyClose {
  return signedRow({ status: "locked", lockedAt: SIGNED_AT, ...overrides });
}

/** Builds one approved submission of a company inside the period. */
function approvedSubmission(
  id: string,
  companyId: string,
): AccountingSubmission {
  return accountingSubmissionSchema.parse({
    id,
    scope: { companyId },
    status: "approved",
    submittedByAccountId: STAFF_ID,
    submittedAt: "2026-11-05T02:03:04.000Z",
    kind: "expense",
    payee: "Test Counterparty",
    category: "supplies",
    money: { amountMinor: "100", currency: "THB" },
    evidenceReference: `private-evidence://${companyId}/submissions/${id}/evidence`,
  });
}

/** Options of the strict fake repository. */
interface FakeRepositoryOptions {
  readonly closes?: readonly AccountingMonthlyClose[];
  readonly approvedSubmissions?: readonly AccountingSubmission[];
  /** Microtask ticks to wait before each repository call; models interleaving. */
  readonly pause?: () => number;
  readonly insertError?: unknown;
  readonly auditError?: unknown;
}

/**
 * Builds the strict fake close repository. `save` is a real compare-and-swap.
 * @param options Initial rows and failure injection.
 * @returns The fake repository with its row store and audit store.
 */
function createStrictRepository(options: FakeRepositoryOptions = {}) {
  const closes = [...(options.closes ?? [])];
  const approved = [...(options.approvedSubmissions ?? [])];
  const auditEvents: AccountingMonthlyCloseAuditEvent[] = [];

  async function pause(): Promise<void> {
    const ticks = options.pause?.() ?? 0;
    for (let tick = 0; tick < ticks; tick += 1) await Promise.resolve();
  }

  const repository = {
    findByPeriodMonth: vi.fn(
      async (input: {
        readonly scope: { readonly companyId: string };
        readonly periodMonth: string;
      }) => {
        await pause();
        return closes.find(
          (close) =>
            close.scopeCompanyId === input.scope.companyId &&
            close.periodMonth === input.periodMonth,
        );
      },
    ),
    listApprovedSubmissions: vi.fn(
      async (input: {
        readonly scope: { readonly companyId: string };
        readonly periodMonth: string;
      }) => {
        await pause();
        return approved.filter(
          (submission) =>
            submission.scope.companyId === input.scope.companyId &&
            submission.submittedAt.slice(0, 7) === input.periodMonth,
        );
      },
    ),
    insert: vi.fn(async (close: AccountingMonthlyClose) => {
      await pause();
      if (options.insertError !== undefined) throw options.insertError;
      const duplicate = closes.some(
        (stored) =>
          stored.scopeCompanyId === close.scopeCompanyId &&
          stored.periodMonth === close.periodMonth,
      );
      if (duplicate) throw new AccountingSubmissionError("conflict");
      closes.push(close);
      return close;
    }),
    findById: vi.fn(
      async (input: {
        readonly scope: { readonly companyId: string };
        readonly closeId: string;
      }) => {
        await pause();
        return closes.find(
          (close) =>
            close.scopeCompanyId === input.scope.companyId &&
            close.id === input.closeId,
        );
      },
    ),
    save: vi.fn(
      async (close: AccountingMonthlyClose, expectedStatus: string) => {
        await pause();
        const index = closes.findIndex(
          (stored) =>
            stored.id === close.id &&
            stored.scopeCompanyId === close.scopeCompanyId,
        );
        const current = index < 0 ? undefined : closes[index];
        if (current === undefined) return undefined;
        if (current.status !== expectedStatus) return undefined;
        closes[index] = close;
        return close;
      },
    ),
    listByScope: vi.fn(async (scope: { readonly companyId: string }) => {
      await pause();
      return closes.filter((close) => close.scopeCompanyId === scope.companyId);
    }),
    recordAuditEvent: vi.fn(async (event: AccountingMonthlyCloseAuditEvent) => {
      await pause();
      if (options.auditError !== undefined) throw options.auditError;
      auditEvents.push(event);
      return event;
    }),
  };

  return { ...repository, closes, auditEvents, port: repository as AccountingMonthlyCloseRepository };
}

/** Counts every call made on the fake repository. */
function repositoryCalls(
  repository: ReturnType<typeof createStrictRepository>,
): number {
  return (
    repository.findByPeriodMonth.mock.calls.length +
    repository.listApprovedSubmissions.mock.calls.length +
    repository.insert.mock.calls.length +
    repository.findById.mock.calls.length +
    repository.save.mock.calls.length +
    repository.listByScope.mock.calls.length +
    repository.recordAuditEvent.mock.calls.length
  );
}

/** Builds a fake evidence store that records every put. */
function createEvidenceStore(putError?: unknown) {
  const bodies: Uint8Array[] = [];
  const put = vi.fn(
    async (input: {
      readonly companyId: string;
      readonly contentType: string;
      readonly body: Uint8Array;
    }) => {
      if (putError !== undefined) throw putError;
      bodies.push(input.body);
      return { evidenceReference: REPORT_REFERENCE, byteSize: input.body.byteLength };
    },
  );
  return {
    put,
    bodies,
    store: { put } as unknown as AccountingEvidenceStore,
  };
}

/** Runs a promise and returns its rejection, or fails the test. */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("The call resolved; a rejection was expected.");
    },
    (error: unknown) => error,
  );
}

describe("openMonthlyClose, a hostile caller", () => {
  it.each(OPEN_DENIED_ROLES)(
    "refuses the role %j with forbidden and makes no repository or evidence call",
    async (role) => {
      const repository = createStrictRepository();
      const evidence = createEvidenceStore();

      const error = await rejection(
        openMonthlyClose({
          repository: repository.port,
          evidenceStore: evidence.store,
          actor: { ...ownerActor, role },
          periodMonth: PERIOD_MONTH,
        }),
      );

      expect(error).toBeInstanceOf(AccountingSubmissionError);
      expect(error).toMatchObject({ reason: "forbidden" });
      expect(repositoryCalls(repository)).toBe(0);
      expect(evidence.put).not.toHaveBeenCalled();
      expect(repository.closes).toHaveLength(0);
      expect(repository.auditEvents).toHaveLength(0);
    },
  );

  it("refuses a denied role before it reads the hostile period month", async () => {
    const repository = createStrictRepository();
    const evidence = createEvidenceStore();

    const error = await rejection(
      openMonthlyClose({
        repository: repository.port,
        evidenceStore: evidence.store,
        actor: { ...ownerActor, role: "STAFF" },
        periodMonth: "2026-13",
      }),
    );

    expect(error).toMatchObject({ reason: "forbidden" });
  });

  it.each(HOSTILE_PERIOD_MONTHS)(
    "refuses the period month %j with invalid-input and makes no repository or evidence call",
    async (periodMonth) => {
      const repository = createStrictRepository();
      const evidence = createEvidenceStore();

      const error = await rejection(
        openMonthlyClose({
          repository: repository.port,
          evidenceStore: evidence.store,
          actor: ownerActor,
          periodMonth,
        }),
      );

      expect(error).toBeInstanceOf(AccountingSubmissionError);
      expect(error).toMatchObject({ reason: "invalid-input" });
      expect(repositoryCalls(repository)).toBe(0);
      expect(evidence.put).not.toHaveBeenCalled();
      expect(repository.auditEvents).toHaveLength(0);
    },
  );

  it.each(["2026-11", "2026-12", "2027-01"])(
    "accepts the calendar month %s on the boundary of the first live month",
    async (periodMonth) => {
      const repository = createStrictRepository();
      const evidence = createEvidenceStore();

      const close = await openMonthlyClose({
        repository: repository.port,
        evidenceStore: evidence.store,
        actor: accountantActor,
        periodMonth,
      });

      expect(close.periodMonth).toBe(periodMonth);
      expect(close.status).toBe("open");
      expect(close.openedByAccountId).toBe(ACCOUNTANT_ID);
    },
  );
});

describe("openMonthlyClose, the stored result", () => {
  it("stores a report body that names the period, the close, and the approved submissions of the actor company only", async () => {
    const repository = createStrictRepository({
      approvedSubmissions: [
        approvedSubmission(SUBMISSION_ID, COMPANY_A),
        approvedSubmission(OTHER_SUBMISSION_ID, COMPANY_B),
      ],
    });
    const evidence = createEvidenceStore();

    await openMonthlyClose({
      repository: repository.port,
      evidenceStore: evidence.store,
      actor: ownerActor,
      periodMonth: PERIOD_MONTH,
    });

    expect(repository.listApprovedSubmissions).toHaveBeenCalledWith({
      scope: { companyId: COMPANY_A },
      periodMonth: PERIOD_MONTH,
    });
    expect(evidence.put).toHaveBeenCalledTimes(1);
    expect(evidence.put.mock.calls[0]?.[0]).toMatchObject({
      companyId: COMPANY_A,
      contentType: "application/json",
    });
    const report = JSON.parse(
      new TextDecoder().decode(evidence.bodies[0]),
    ) as {
      periodMonth: string;
      close: { scopeCompanyId: string; status: string };
      submissions: { id: string; scope: { companyId: string } }[];
    };
    expect(report.periodMonth).toBe(PERIOD_MONTH);
    expect(report.close).toMatchObject({
      scopeCompanyId: COMPANY_A,
      status: "open",
    });
    expect(report.submissions.map((submission) => submission.id)).toEqual([
      SUBMISSION_ID,
    ]);
    expect(
      report.submissions.every(
        (submission) => submission.scope.companyId === COMPANY_A,
      ),
    ).toBe(true);
    expect(new TextDecoder().decode(evidence.bodies[0])).not.toContain(
      OTHER_SUBMISSION_ID,
    );
  });

  it("stores the close under the actor company and writes exactly one open audit row for the actor", async () => {
    const repository = createStrictRepository();
    const evidence = createEvidenceStore();

    const close = await openMonthlyClose({
      repository: repository.port,
      evidenceStore: evidence.store,
      actor: foreignOwnerActor,
      periodMonth: PERIOD_MONTH,
    });

    expect(close.scopeCompanyId).toBe(COMPANY_B);
    expect(repository.closes.map((stored) => stored.scopeCompanyId)).toEqual([
      COMPANY_B,
    ]);
    expect(evidence.put.mock.calls[0]?.[0]).toMatchObject({
      companyId: COMPANY_B,
    });
    expect(repository.auditEvents).toHaveLength(1);
    expect(repository.auditEvents[0]).toMatchObject({
      action: "monthly-close-open",
      closeId: close.id,
      actorAccountId: OWNER_ID,
      actorRole: "OWNER",
    });
  });

  it("does not see the month of another company as a second close", async () => {
    const repository = createStrictRepository({
      closes: [closeRow({ scopeCompanyId: COMPANY_B })],
    });
    const evidence = createEvidenceStore();

    const close = await openMonthlyClose({
      repository: repository.port,
      evidenceStore: evidence.store,
      actor: ownerActor,
      periodMonth: PERIOD_MONTH,
    });

    expect(close.scopeCompanyId).toBe(COMPANY_A);
    expect(repository.closes).toHaveLength(2);
  });
});

describe("openMonthlyClose, a failure path", () => {
  it("maps a lost open race to conflict and writes no audit row", async () => {
    const repository = createStrictRepository({
      insertError: new AccountingSubmissionError("conflict"),
    });
    const evidence = createEvidenceStore();

    const error = await rejection(
      openMonthlyClose({
        repository: repository.port,
        evidenceStore: evidence.store,
        actor: ownerActor,
        periodMonth: PERIOD_MONTH,
      }),
    );

    expect(error).toMatchObject({ reason: "conflict" });
    expect(repository.auditEvents).toHaveLength(0);
  });

  it("rethrows an evidence failure unchanged and inserts no row and no audit row", async () => {
    const failure = new Error("storage unavailable");
    const repository = createStrictRepository();
    const evidence = createEvidenceStore(failure);

    const error = await rejection(
      openMonthlyClose({
        repository: repository.port,
        evidenceStore: evidence.store,
        actor: ownerActor,
        periodMonth: PERIOD_MONTH,
      }),
    );

    expect(error).toBe(failure);
    expect(repository.insert).not.toHaveBeenCalled();
    expect(repository.auditEvents).toHaveLength(0);
  });

  it("rethrows a non-domain insert failure unchanged and writes no audit row", async () => {
    const failure = Object.assign(new Error("connection reset"), {
      code: "08006",
    });
    const repository = createStrictRepository({ insertError: failure });
    const evidence = createEvidenceStore();

    const error = await rejection(
      openMonthlyClose({
        repository: repository.port,
        evidenceStore: evidence.store,
        actor: ownerActor,
        periodMonth: PERIOD_MONTH,
      }),
    );

    expect(error).toBe(failure);
    expect(repository.auditEvents).toHaveLength(0);
  });

  it("rethrows an audit failure and does not hide it", async () => {
    const failure = new Error("audit table unavailable");
    const repository = createStrictRepository({ auditError: failure });
    const evidence = createEvidenceStore();

    const error = await rejection(
      openMonthlyClose({
        repository: repository.port,
        evidenceStore: evidence.store,
        actor: ownerActor,
        periodMonth: PERIOD_MONTH,
      }),
    );

    expect(error).toBe(failure);
  });

  it("lets exactly one of two concurrent opens of one month win", async () => {
    let seed = 7;
    const repository = createStrictRepository({
      pause: () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed % 4;
      },
    });
    const evidence = createEvidenceStore();

    const results = await Promise.allSettled([
      openMonthlyClose({
        repository: repository.port,
        evidenceStore: evidence.store,
        actor: ownerActor,
        periodMonth: PERIOD_MONTH,
      }),
      openMonthlyClose({
        repository: repository.port,
        evidenceStore: evidence.store,
        actor: accountantActor,
        periodMonth: PERIOD_MONTH,
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatchObject({ reason: "conflict" });
    expect(repository.closes).toHaveLength(1);
    expect(repository.auditEvents.map((event) => event.action)).toEqual([
      "monthly-close-open",
    ]);
  });
});

describe("signMonthlyClose, a hostile caller", () => {
  it.each(SIGN_DENIED_ROLES)(
    "refuses the role %j before any repository call and leaves the close open",
    async (role) => {
      const repository = createStrictRepository({ closes: [closeRow()] });

      const error = await rejection(
        signMonthlyClose({
          repository: repository.port,
          actor: { ...ceoActor, role },
          closeId: CLOSE_ID,
        }),
      );

      expect(error).toBeInstanceOf(AccountingSubmissionError);
      expect(error).toMatchObject({ reason: "forbidden" });
      expect(repositoryCalls(repository)).toBe(0);
      expect(repository.closes[0]?.status).toBe("open");
      expect(repository.auditEvents).toHaveLength(0);
    },
  );

  it("gives a denied role the same error for a known and an unknown close", async () => {
    const repository = createStrictRepository({ closes: [closeRow()] });

    const known = await rejection(
      signMonthlyClose({
        repository: repository.port,
        actor: ownerActor,
        closeId: CLOSE_ID,
      }),
    );
    const unknown = await rejection(
      signMonthlyClose({
        repository: repository.port,
        actor: ownerActor,
        closeId: UNKNOWN_CLOSE_ID,
      }),
    );

    expect(known).toMatchObject({ reason: "forbidden", message: "forbidden" });
    expect(unknown).toMatchObject({ reason: "forbidden", message: "forbidden" });
  });

  it("refuses a denied role with a hostile close id as forbidden, not invalid-input", async () => {
    const repository = createStrictRepository({ closes: [closeRow()] });

    const error = await rejection(
      signMonthlyClose({
        repository: repository.port,
        actor: { ...ceoActor, role: "STAFF" },
        closeId: "not-a-uuid",
      }),
    );

    expect(error).toMatchObject({ reason: "forbidden" });
  });

  it.each(HOSTILE_CLOSE_IDS)(
    "refuses the close id %j with invalid-input and makes no repository call",
    async (closeId) => {
      const repository = createStrictRepository({ closes: [closeRow()] });

      const error = await rejection(
        signMonthlyClose({ repository: repository.port, actor: ceoActor, closeId }),
      );

      expect(error).toBeInstanceOf(AccountingSubmissionError);
      expect(error).toMatchObject({ reason: "invalid-input" });
      expect(repositoryCalls(repository)).toBe(0);
    },
  );
});

describe("signMonthlyClose, tenant and unknown close", () => {
  it("returns not-found for an unknown close and writes nothing", async () => {
    const repository = createStrictRepository({ closes: [closeRow()] });

    const error = await rejection(
      signMonthlyClose({
        repository: repository.port,
        actor: ceoActor,
        closeId: UNKNOWN_CLOSE_ID,
      }),
    );

    expect(error).toMatchObject({ reason: "not-found" });
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.auditEvents).toHaveLength(0);
  });

  it("returns not-found when a CEO of another company signs the close and leaves the row open", async () => {
    const repository = createStrictRepository({ closes: [closeRow()] });

    const error = await rejection(
      signMonthlyClose({
        repository: repository.port,
        actor: foreignCeoActor,
        closeId: CLOSE_ID,
      }),
    );

    expect(error).toMatchObject({ reason: "not-found" });
    expect(repository.findById).toHaveBeenCalledWith({
      scope: { companyId: COMPANY_B },
      closeId: CLOSE_ID,
    });
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.closes[0]?.status).toBe("open");
    expect(repository.auditEvents).toHaveLength(0);
  });
});

describe("signMonthlyClose, the steps of one sign", () => {
  it("saves twice with the expected statuses open then signed and writes the sign row then the lock row", async () => {
    const repository = createStrictRepository({ closes: [closeRow()] });

    const locked = await signMonthlyClose({
      repository: repository.port,
      actor: ceoActor,
      closeId: CLOSE_ID,
    });

    expect(repository.save.mock.calls.map((call) => call[1])).toEqual([
      "open",
      "signed",
    ]);
    expect(repository.save.mock.calls.map((call) => call[0].status)).toEqual([
      "signed",
      "locked",
    ]);
    expect(locked).toMatchObject({
      status: "locked",
      signedByAccountId: CEO_ID,
      signedByRole: "CEO",
    });
    expect(Date.parse(locked.lockedAt ?? "")).toBeGreaterThanOrEqual(
      Date.parse(locked.signedAt ?? ""),
    );
    expect(repository.auditEvents.map((event) => event.action)).toEqual([
      "monthly-close-sign",
      "monthly-close-lock",
    ]);
    expect(new Set(repository.auditEvents.map((event) => event.id)).size).toBe(2);
    for (const event of repository.auditEvents) {
      expect(accountingMonthlyCloseAuditEventSchema.safeParse(event).success).toBe(
        true,
      );
      expect(event).toMatchObject({ actorAccountId: CEO_ID, closeId: CLOSE_ID });
    }
  });

  it("keeps the first signer on the row when a second CEO repeats the sign on a locked close", async () => {
    const repository = createStrictRepository({ closes: [lockedRow()] });

    const result = await signMonthlyClose({
      repository: repository.port,
      actor: secondCeoActor,
      closeId: CLOSE_ID,
    });

    expect(result.signedByAccountId).toBe(CEO_ID);
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.auditEvents).toHaveLength(0);
  });

  it("writes the lock row of the second CEO and no sign row on a stranded signed close", async () => {
    const repository = createStrictRepository({ closes: [signedRow()] });

    const result = await signMonthlyClose({
      repository: repository.port,
      actor: secondCeoActor,
      closeId: CLOSE_ID,
    });

    expect(result.status).toBe("locked");
    expect(result.signedByAccountId).toBe(CEO_ID);
    expect(repository.save.mock.calls.map((call) => call[1])).toEqual(["signed"]);
    expect(repository.auditEvents).toHaveLength(1);
    expect(repository.auditEvents[0]).toMatchObject({
      action: "monthly-close-lock",
      actorAccountId: CEO_TWO_ID,
    });
  });

  it("writes the sign row but no lock row and reports conflict when the lock loses the compare-and-swap", async () => {
    const repository = createStrictRepository({ closes: [closeRow()] });
    const realFindById = repository.findById.getMockImplementation();
    let findCalls = 0;
    repository.findById.mockImplementation(async (input) => {
      findCalls += 1;
      const found = await realFindById?.(input);
      if (findCalls === 2 && found !== undefined) {
        // A peer moved the row between the sign save and the lock read: the
        // lock read still sees `signed`, but the row is gone by the lock save.
        repository.closes[0] = lockedRow({ signedByAccountId: CEO_TWO_ID });
        return found;
      }
      return found;
    });

    const error = await rejection(
      signMonthlyClose({
        repository: repository.port,
        actor: ceoActor,
        closeId: CLOSE_ID,
      }),
    );

    expect(error).toMatchObject({ reason: "conflict" });
    expect(repository.auditEvents.map((event) => event.action)).toEqual([
      "monthly-close-sign",
    ]);
    expect(repository.closes[0]?.signedByAccountId).toBe(CEO_TWO_ID);
  });

  it("rethrows an audit failure of the sign step and writes no lock row", async () => {
    const failure = new Error("audit table unavailable");
    const repository = createStrictRepository({
      closes: [closeRow()],
      auditError: failure,
    });

    const error = await rejection(
      signMonthlyClose({
        repository: repository.port,
        actor: ceoActor,
        closeId: CLOSE_ID,
      }),
    );

    expect(error).toBe(failure);
    expect(repository.save.mock.calls.map((call) => call[1])).toEqual(["open"]);
    expect(repository.auditEvents).toHaveLength(0);
  });
});

describe("signMonthlyClose, concurrent signs", () => {
  /** Runs `count` concurrent signs under one pseudo-random interleaving. */
  async function runRace(seed: number, count: number) {
    let state = seed;
    const repository = createStrictRepository({
      closes: [closeRow()],
      pause: () => {
        state = (state * 1103515245 + 12345) % 2147483648;
        return Math.floor(state / 65536) % 5;
      },
    });
    const results = await Promise.allSettled(
      Array.from({ length: count }, () =>
        signMonthlyClose({
          repository: repository.port,
          actor: ceoActor,
          closeId: CLOSE_ID,
        }),
      ),
    );
    return { repository, results };
  }

  it("writes exactly one sign row and one lock row and ends locked under 300 interleavings of two signs", async () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const { repository, results } = await runRace(seed, 2);
      const actions = repository.auditEvents.map((event) => event.action);

      expect(actions.filter((action) => action === "monthly-close-sign")).toHaveLength(1);
      expect(actions.filter((action) => action === "monthly-close-lock")).toHaveLength(1);
      expect(repository.closes[0]?.status).toBe("locked");
      expect(results.some((result) => result.status === "fulfilled")).toBe(true);
      for (const result of results) {
        if (result.status === "fulfilled") {
          expect(result.value.status).toBe("locked");
        } else {
          expect(result.reason).toBeInstanceOf(AccountingSubmissionError);
          expect(result.reason).toMatchObject({ reason: "conflict" });
        }
      }
    }
  });

  it("writes exactly one sign row and one lock row under 300 interleavings of three signs", async () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const { repository, results } = await runRace(seed * 31, 3);
      const actions = repository.auditEvents.map((event) => event.action);

      expect(actions.filter((action) => action === "monthly-close-sign")).toHaveLength(1);
      expect(actions.filter((action) => action === "monthly-close-lock")).toHaveLength(1);
      expect(repository.closes[0]?.status).toBe("locked");
      for (const result of results) {
        if (result.status === "rejected") {
          expect(result.reason).toMatchObject({ reason: "conflict" });
        }
      }
    }
  });
});

describe("lockMonthlyClose, a hostile caller and a bad state", () => {
  it.each(SIGN_DENIED_ROLES)(
    "refuses the role %j before any repository call",
    async (role) => {
      const repository = createStrictRepository({ closes: [signedRow()] });

      const error = await rejection(
        lockMonthlyClose({
          repository: repository.port,
          actor: { ...ceoActor, role },
          closeId: CLOSE_ID,
        }),
      );

      expect(error).toMatchObject({ reason: "forbidden" });
      expect(repositoryCalls(repository)).toBe(0);
      expect(repository.closes[0]?.status).toBe("signed");
    },
  );

  it.each(HOSTILE_CLOSE_IDS)(
    "refuses the close id %j with invalid-input and makes no repository call",
    async (closeId) => {
      const repository = createStrictRepository({ closes: [signedRow()] });

      const error = await rejection(
        lockMonthlyClose({ repository: repository.port, actor: ceoActor, closeId }),
      );

      expect(error).toMatchObject({ reason: "invalid-input" });
      expect(repositoryCalls(repository)).toBe(0);
    },
  );

  it("refuses to lock a close that nobody signed, with conflict, no save, and no audit row", async () => {
    const repository = createStrictRepository({ closes: [closeRow()] });

    const error = await rejection(
      lockMonthlyClose({
        repository: repository.port,
        actor: ceoActor,
        closeId: CLOSE_ID,
      }),
    );

    expect(error).toMatchObject({ reason: "conflict" });
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.closes[0]?.status).toBe("open");
    expect(repository.auditEvents).toHaveLength(0);
  });

  it("returns not-found for an unknown close and for a close of another company", async () => {
    const repository = createStrictRepository({ closes: [signedRow()] });

    const unknown = await rejection(
      lockMonthlyClose({
        repository: repository.port,
        actor: ceoActor,
        closeId: UNKNOWN_CLOSE_ID,
      }),
    );
    const foreign = await rejection(
      lockMonthlyClose({
        repository: repository.port,
        actor: foreignCeoActor,
        closeId: CLOSE_ID,
      }),
    );

    expect(unknown).toMatchObject({ reason: "not-found" });
    expect(foreign).toMatchObject({ reason: "not-found" });
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.auditEvents).toHaveLength(0);
  });

  it("returns an already locked close with no save and no audit row", async () => {
    const repository = createStrictRepository({ closes: [lockedRow()] });

    const result = await lockMonthlyClose({
      repository: repository.port,
      actor: ceoActor,
      closeId: CLOSE_ID,
    });

    expect(result.status).toBe("locked");
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.auditEvents).toHaveLength(0);
  });

  it("reports conflict and writes no audit row when the lock loses the compare-and-swap", async () => {
    const repository = createStrictRepository({ closes: [lockedRow()] });
    repository.findById.mockResolvedValueOnce(signedRow());

    const error = await rejection(
      lockMonthlyClose({
        repository: repository.port,
        actor: ceoActor,
        closeId: CLOSE_ID,
      }),
    );

    expect(error).toMatchObject({ reason: "conflict" });
    expect(repository.save.mock.calls.map((call) => call[1])).toEqual(["signed"]);
    expect(repository.auditEvents).toHaveLength(0);
  });
});

describe("listMonthlyCloses, a hostile caller", () => {
  it.each(LIST_DENIED_ROLES)(
    "refuses the role %j before any repository call",
    async (role) => {
      const repository = createStrictRepository({ closes: [lockedRow()] });

      const error = await rejection(
        listMonthlyCloses({
          repository: repository.port,
          actor: { ...ceoActor, role },
        }),
      );

      expect(error).toMatchObject({ reason: "forbidden" });
      expect(repositoryCalls(repository)).toBe(0);
    },
  );

  it("lists the closes of the actor company only, whatever the role", async () => {
    const foreignClose = lockedRow({
      id: UNKNOWN_CLOSE_ID,
      scopeCompanyId: COMPANY_B,
    });
    const repository = createStrictRepository({
      closes: [lockedRow(), foreignClose],
    });

    const ceoList = await listMonthlyCloses({
      repository: repository.port,
      actor: ceoActor,
    });
    const ownerList = await listMonthlyCloses({
      repository: repository.port,
      actor: ownerActor,
    });
    const foreignList = await listMonthlyCloses({
      repository: repository.port,
      actor: foreignCeoActor,
    });

    expect(ceoList.map((close) => close.id)).toEqual([CLOSE_ID]);
    expect(ownerList.map((close) => close.id)).toEqual([CLOSE_ID]);
    expect(foreignList.map((close) => close.id)).toEqual([UNKNOWN_CLOSE_ID]);
    expect(repository.listByScope.mock.calls.map((call) => call[0])).toEqual([
      { companyId: COMPANY_A },
      { companyId: COMPANY_A },
      { companyId: COMPANY_B },
    ]);
  });

  it("gives a CEO an empty list while every close is open or signed", async () => {
    const repository = createStrictRepository({
      closes: [closeRow(), signedRow({ id: UNKNOWN_CLOSE_ID, periodMonth: "2026-12" })],
    });

    const result = await listMonthlyCloses({
      repository: repository.port,
      actor: ceoActor,
    });

    expect(result).toEqual([]);
  });
});
