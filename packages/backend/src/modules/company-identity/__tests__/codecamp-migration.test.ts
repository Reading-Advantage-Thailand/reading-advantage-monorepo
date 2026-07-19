import { describe, expect, it } from "vitest";

import {
  CodecampMigrationPlanningError,
  classifyCodecampPasswordHash,
  fingerprintCodecampMigrationSource,
  planCodecampIdentityMigration,
  summarizeCodecampMigrationPlan,
  type CodecampSourceIdentity,
} from "../codecamp-migration.js";

const organizationId = "10000000-0000-4000-8000-000000000001";
const ownership = [
  {
    table: "codecamp_user_progress",
    rowCount: 3,
    ownerCount: 2,
    fingerprint: "b".repeat(64),
  },
] as const;

function source(
  id: string,
  username: string,
  role: CodecampSourceIdentity["role"] = "INTERN",
  passwordHash = "$argon2id$v=19$m=19456,t=2,p=1$salt$hash",
): CodecampSourceIdentity {
  return {
    id,
    username,
    displayUsername: username,
    displayName: `Employee ${id}`,
    githubUsername: null,
    role,
    createdAt: new Date("2026-01-02T03:04:05.000Z"),
    passwordHash,
  };
}

describe("Codecamp identity migration contracts", () => {
  it("plans exact Codecamp roles with deterministic account and membership IDs", () => {
    const identities = [
      source("legacy-admin", "Admin", "ADMIN"),
      source("legacy-intern", "intern.one"),
      source("legacy-teacher", "teacher", "TEACHER"),
      source("legacy-student", "student", "STUDENT"),
    ];
    const first = planCodecampIdentityMigration({
      sourceIdentities: identities,
      targetIdentities: [],
      organizationId,
    });
    const second = planCodecampIdentityMigration({
      sourceIdentities: [...identities].reverse(),
      targetIdentities: [],
      organizationId,
    });

    expect(
      first.records
        .map((record) => ({
          account: record.companyAccountId,
          membership: record.companyMembershipId,
          role: record.role,
        }))
        .sort((left, right) => left.account.localeCompare(right.account)),
    ).toEqual(
      second.records
        .map((record) => ({
          account: record.companyAccountId,
          membership: record.companyMembershipId,
          role: record.role,
        }))
        .sort((left, right) => left.account.localeCompare(right.account)),
    );
    expect(summarizeCodecampMigrationPlan(first)).toEqual({
      sourceAccountCount: 4,
      roleCounts: { ADMIN: 1, INTERN: 1, TEACHER: 1, STUDENT: 1 },
      credentialAlgorithmCounts: { ARGON2ID: 4 },
    });
  });

  it("admits Argon2id and bcrypt but rejects every other credential prefix", () => {
    expect(
      classifyCodecampPasswordHash("$argon2id$v=19$m=19456,t=2,p=1$salt$hash"),
    ).toBe("ARGON2ID");
    expect(classifyCodecampPasswordHash("$2b$12$legacy")).toBe("BCRYPT");
    expect(classifyCodecampPasswordHash("$2y$12$legacy")).toBe("BCRYPT");
    expect(() =>
      classifyCodecampPasswordHash("plaintext-private-password"),
    ).toThrow("unsupported password algorithm");
  });

  it("fails closed on NFKC source collisions without exposing identities", () => {
    const secretUsername = "PrivateUser";
    try {
      planCodecampIdentityMigration({
        sourceIdentities: [
          source("one", secretUsername),
          source("two", " privateuser "),
        ],
        targetIdentities: [],
        organizationId,
      });
      throw new Error("expected collision");
    } catch (error) {
      expect(error).toBeInstanceOf(CodecampMigrationPlanningError);
      expect(String(error)).toContain("1 normalized source username collision");
      expect(String(error)).not.toContain(secretUsername);
    }
  });

  it("allows deterministic resume but never automatically merges a target collision", () => {
    const planned = planCodecampIdentityMigration({
      sourceIdentities: [source("one", "employee.one")],
      targetIdentities: [],
      organizationId,
    });
    const record = planned.records[0]!;
    expect(() =>
      planCodecampIdentityMigration({
        sourceIdentities: [source("one", "employee.one")],
        targetIdentities: [
          {
            id: record.companyAccountId,
            normalizedUsername: record.normalizedUsername,
            displayName: record.displayName,
            status: "ACTIVE",
          },
        ],
        organizationId,
      }),
    ).not.toThrow();

    expect(() =>
      planCodecampIdentityMigration({
        sourceIdentities: [source("one", "employee.one")],
        targetIdentities: [
          {
            id: "20000000-0000-4000-8000-000000000002",
            normalizedUsername: record.normalizedUsername,
            displayName: "Different account",
            status: "ACTIVE",
          },
        ],
        organizationId,
      }),
    ).toThrow("automatic merge is disabled");
  });

  it("fingerprints credentials, source identity, GitHub mapping, and product ownership", () => {
    const first = planCodecampIdentityMigration({
      sourceIdentities: [source("one", "employee.one")],
      targetIdentities: [],
      organizationId,
    });
    const changed = planCodecampIdentityMigration({
      sourceIdentities: [
        {
          ...source("one", "employee.one"),
          githubUsername: "changed-github-product-identity",
        },
      ],
      targetIdentities: [],
      organizationId,
    });
    const baseline = fingerprintCodecampMigrationSource({
      records: first.records,
      ownership,
    });
    expect(baseline).toMatch(/^[a-f0-9]{64}$/);
    expect(
      fingerprintCodecampMigrationSource({
        records: changed.records,
        ownership,
      }),
    ).not.toBe(baseline);
    expect(
      fingerprintCodecampMigrationSource({
        records: first.records,
        ownership: [{ ...ownership[0], rowCount: 4 }],
      }),
    ).not.toBe(baseline);
  });
});
