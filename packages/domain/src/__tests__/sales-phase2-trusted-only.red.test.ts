// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import type { MasteryPersistencePort } from "../mastery/persistence-ports.js";
import {
  createSalesMasteryProjection,
  SalesMasteryProjectionError,
  type CompanyIdentityVerificationPort,
  type SalesPersistenceFactory,
  type VerifiedSalesIdentity,
} from "../sales-mastery.js";

const TRUSTED_IDENTITY_TOKEN = "company-identity-session-token";
const ORGANIZATION_A = "20000000-0000-4000-8000-000000000101";
const PRINCIPAL_A = "sales:00000000-0000-4000-8000-000000000111";
const ISSUER = "https://accounts.example.test";
const GRAPH_RELEASE = "knowledge-space-sales-mastery-v1.0.0";
const BINDINGS_DIGEST =
  "e8843314e2f381a44143acb08c6ff6596bdeac4e9da32fbdb9a5851c8ed32197";

interface ConstructorDependencies {
  readonly database: {
    readonly select: ReturnType<typeof vi.fn>;
    readonly insert: ReturnType<typeof vi.fn>;
    readonly transaction: ReturnType<typeof vi.fn>;
  };
  readonly mastery: MasteryPersistencePort;
  readonly companyIdentity: CompanyIdentityVerificationPort;
  readonly masteryFactory: SalesPersistenceFactory;
}

/** Creates a database double for constructor access assertions. */
function databaseDouble(): ConstructorDependencies["database"] {
  return {
    select: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
  };
}

/** Creates a Mastery double for trusted-boundary access assertions. */
function masteryDouble(): MasteryPersistencePort {
  return {
    readSnapshot: vi.fn(),
    commitMasteryEvidence: vi.fn(),
    approveMasteryCalibration: vi.fn(),
  };
}

/** Creates a valid verifier result for the trusted Sales scope. */
function verifiedIdentity(): VerifiedSalesIdentity {
  return {
    issuer: ISSUER,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    organizationId: ORGANIZATION_A,
    organizationKey: "internal-company",
    principalId: PRINCIPAL_A,
  };
}

/** Creates a verifier double that returns one controlled trusted result. */
function identityVerifier(
  result: VerifiedSalesIdentity,
): CompanyIdentityVerificationPort {
  return {
    verify: vi.fn().mockResolvedValue(result),
  };
}

/** Creates a scoped Mastery factory double. */
function masteryFactory(
  mastery: MasteryPersistencePort,
): SalesPersistenceFactory {
  return {
    create: vi.fn().mockReturnValue(mastery),
  };
}

/** Creates valid dependencies for a trusted projection. */
function constructorDependencies(
  result: VerifiedSalesIdentity = verifiedIdentity(),
): ConstructorDependencies {
  const mastery = masteryDouble();
  return {
    database: databaseDouble(),
    mastery,
    companyIdentity: identityVerifier(result),
    masteryFactory: masteryFactory(mastery),
  };
}

/** Captures a synchronous constructor rejection for mode-boundary assertions. */
function captureConstructorError(options: unknown): unknown {
  const createProjection = createSalesMasteryProjection as unknown as (
    value: unknown,
  ) => unknown;
  try {
    createProjection(options);
    return undefined;
  } catch (error) {
    return error;
  }
}

/** Creates a raw claim object that must not satisfy the verifier adapter. */
function rawCompanyIdentityClaims(): Record<string, unknown> {
  return {
    iss: ISSUER,
    sub: "00000000-0000-4000-8000-000000000111",
    username: "sales.rep",
    displayName: "Sales Rep",
    aud: "sales",
    exp: 1_900_000_000,
    iat: 1_800_000_000,
    nonce: "trusted-only-nonce",
    sid: "00000000-0000-4000-8000-000000000112",
    organizationId: ORGANIZATION_A,
    organizationKey: "internal-company",
    status: "ACTIVE",
    roles: ["SALES_REP"],
    authVersion: 1,
  };
}

/** Creates the legacy fallback payload that lacks a reviewed activity binding. */
function legacyFallbackInput(): Record<string, unknown> {
  return {
    identity: TRUSTED_IDENTITY_TOKEN,
    sourceAttemptId: "trusted-only-legacy-fallback-attempt",
    idempotencyKey: "trusted-only-legacy-fallback-idempotency",
    sourceApplication: "sales-advantage",
    graphRelease: GRAPH_RELEASE,
    bindingsDigest: BINDINGS_DIGEST,
    payload: {
      objectiveId: "sales.value-proposition",
      variantKey: "quiz.recognition",
      rubricVersion: "sales-rubric.v1",
      score: 0.9,
    },
  };
}

describe("Sales Phase 2 trusted-only constructor and input Red", () => {
  it("rejects legacy-only constructor options", () => {
    const dependencies = constructorDependencies();
    const error = captureConstructorError({
      database: dependencies.database,
      mastery: dependencies.mastery,
    });

    expect(error).toBeInstanceOf(SalesMasteryProjectionError);
    expect(error).toMatchObject({ code: "CONFIGURATION_ERROR" });
    expect(dependencies.database.select).not.toHaveBeenCalled();
    expect(dependencies.database.insert).not.toHaveBeenCalled();
    expect(dependencies.database.transaction).not.toHaveBeenCalled();
    expect(dependencies.mastery.readSnapshot).not.toHaveBeenCalled();
    expect(dependencies.mastery.commitMasteryEvidence).not.toHaveBeenCalled();
  });

  it("rejects raw Company Identity claims without a verifier", () => {
    const dependencies = constructorDependencies();
    const error = captureConstructorError({
      database: dependencies.database,
      companyIdentity: rawCompanyIdentityClaims(),
      masteryFactory: dependencies.masteryFactory,
    });

    expect(error).toBeInstanceOf(SalesMasteryProjectionError);
    expect(error).toMatchObject({ code: "CONFIGURATION_ERROR" });
    expect(dependencies.masteryFactory.create).not.toHaveBeenCalled();
    expect(dependencies.database.transaction).not.toHaveBeenCalled();
  });

  it("rejects mixed legacy and trusted constructor options", () => {
    const dependencies = constructorDependencies();
    const error = captureConstructorError({
      database: dependencies.database,
      mastery: dependencies.mastery,
      companyIdentity: dependencies.companyIdentity,
      masteryFactory: dependencies.masteryFactory,
    });

    expect(error).toBeInstanceOf(SalesMasteryProjectionError);
    expect(error).toMatchObject({ code: "CONFIGURATION_ERROR" });
    expect(dependencies.companyIdentity.verify).not.toHaveBeenCalled();
    expect(dependencies.masteryFactory.create).not.toHaveBeenCalled();
    expect(dependencies.database.transaction).not.toHaveBeenCalled();
  });

  it("rejects the legacy unreviewed activity fallback before Mastery access", async () => {
    const dependencies = constructorDependencies();
    const projection = createSalesMasteryProjection({
      database: dependencies.database,
      companyIdentity: dependencies.companyIdentity,
      masteryFactory: dependencies.masteryFactory,
    });

    await expect(
      projection.project(legacyFallbackInput()),
    ).rejects.toMatchObject({ code: "ACTIVITY_BINDING_FORBIDDEN" });
    expect(dependencies.masteryFactory.create).not.toHaveBeenCalled();
    expect(dependencies.mastery.readSnapshot).not.toHaveBeenCalled();
    expect(dependencies.mastery.commitMasteryEvidence).not.toHaveBeenCalled();
  });
});
