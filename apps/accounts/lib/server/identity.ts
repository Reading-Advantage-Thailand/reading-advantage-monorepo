import { createPrivateKey, randomUUID } from "node:crypto";

import {
  createPostgresCompanyIdentityRepository,
  createPostgresCompanyLoginRateLimit,
  createCompanyIdentityDurableIdempotencyPort,
  createRs256IdentityTokenSigner,
  createCapabilityExecutor,
  createCompanyIdentityCapabilityReferences,
  createCompanyIdentityCapabilityRegistry,
  createCompanyIdentityService,
  fingerprintSecret,
  type CapabilityExecutor,
  type CompanyIdentityService,
  type IdentityPublicJwk,
} from "@reading-advantage/backend";
import {
  createCompanyIdentityCookieConfig,
  createCompanyIdentityIssuerConfig,
  createCompanyIdentitySecurityConfig,
  hashPassword,
  verifyPassword,
} from "@reading-advantage/auth/company-identity";
import { createCompanyIdentityRuntimeClient } from "@reading-advantage/db/company-identity/runtime";

interface IdentityComposition {
  readonly service: CompanyIdentityService;
  readonly executor: CapabilityExecutor;
  readonly cookie: ReturnType<typeof createCompanyIdentityCookieConfig>;
  readonly issuerUrl: string;
  readonly jwk: IdentityPublicJwk;
  readonly close: () => Promise<void>;
}

let compositionPromise: Promise<IdentityComposition> | undefined;

function issuerEnvironment() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    COMPANY_AUTH_ISSUER_URL: process.env.COMPANY_AUTH_ISSUER_URL,
    COMPANY_AUTH_OIDC_SIGNING_PRIVATE_KEY:
      process.env.COMPANY_AUTH_OIDC_SIGNING_PRIVATE_KEY?.replaceAll("\\n", "\n"),
    COMPANY_AUTH_OIDC_SIGNING_KEY_ID: process.env.COMPANY_AUTH_OIDC_SIGNING_KEY_ID,
    COMPANY_AUTH_AUTHORIZATION_CODE_TTL_SECONDS:
      process.env.COMPANY_AUTH_AUTHORIZATION_CODE_TTL_SECONDS,
    COMPANY_AUTH_SSO_IDLE_TTL_SECONDS: process.env.COMPANY_AUTH_SSO_IDLE_TTL_SECONDS,
    COMPANY_AUTH_SSO_ABSOLUTE_TTL_SECONDS:
      process.env.COMPANY_AUTH_SSO_ABSOLUTE_TTL_SECONDS,
    COMPANY_AUTH_APP_SESSION_TTL_SECONDS:
      process.env.COMPANY_AUTH_APP_SESSION_TTL_SECONDS,
    COMPANY_AUTH_CLOCK_SKEW_SECONDS: process.env.COMPANY_AUTH_CLOCK_SKEW_SECONDS,
  };
}

/**
 * Returns the process-local Accounts composition backed by the identity database.
 * @returns Validated identity service, cookie contract, and discovery key.
 */
export async function getIdentityComposition(): Promise<IdentityComposition> {
  compositionPromise ??= (async () => {
    const issuer = createCompanyIdentityIssuerConfig(issuerEnvironment());
    const security = createCompanyIdentitySecurityConfig({
      COMPANY_AUTH_IDENTIFIER_HASH_KEY: process.env.COMPANY_AUTH_IDENTIFIER_HASH_KEY,
    });
    const cookie = createCompanyIdentityCookieConfig({
      NODE_ENV: process.env.NODE_ENV,
      COMPANY_AUTH_ISSUER_URL: process.env.COMPANY_AUTH_ISSUER_URL,
      COMPANY_AUTH_COOKIE_NAME: process.env.COMPANY_AUTH_COOKIE_NAME,
      COMPANY_AUTH_COOKIE_SECURE: process.env.COMPANY_AUTH_COOKIE_SECURE,
      COMPANY_AUTH_COOKIE_SAME_SITE: process.env.COMPANY_AUTH_COOKIE_SAME_SITE,
      COMPANY_AUTH_COOKIE_DOMAIN: process.env.COMPANY_AUTH_COOKIE_DOMAIN,
      COMPANY_AUTH_COOKIE_PATH: process.env.COMPANY_AUTH_COOKIE_PATH,
    });
    const databaseUrl = process.env.COMPANY_AUTH_DATABASE_URL;
    if (!databaseUrl) throw new Error("COMPANY_AUTH_DATABASE_URL_REQUIRED");
    const sql = await createCompanyIdentityRuntimeClient({ databaseUrl });
    const signer = createRs256IdentityTokenSigner({
      keyId: issuer.signingKeyId,
      privateKey: createPrivateKey(issuer.signingPrivateKey),
      issuerUrl: issuer.issuerUrl,
      clockSkewSeconds: issuer.clockSkewSeconds,
    });
    const repository = createPostgresCompanyIdentityRepository(sql);
    const service = createCompanyIdentityService({
      repository,
      passwords: {
        hash: hashPassword,
        verify: verifyPassword,
        fingerprint: (password) => fingerprintSecret(
          Buffer.from(security.identifierHashKey, "base64url"),
          "company-credential-idempotency-v1",
          password,
        ),
      },
      rateLimit: createPostgresCompanyLoginRateLimit({
        sql,
        identifierHashKey: security.identifierHashKey,
      }),
      tokenSigner: signer,
      config: issuer,
    });
    const references = createCompanyIdentityCapabilityReferences();
    const registry = createCompanyIdentityCapabilityRegistry(service, references);
    const executor = createCapabilityExecutor({
      registry,
      authentication: {
        authenticate: async ({ evidence }) => {
          if (evidence.kind !== "session") return null;
          const employee = await service.currentEmployee(evidence.opaqueSessionRef);
          return employee ? {
            userId: employee.id,
            roles: employee.companyRoles,
            schoolId: null,
          } : null;
        },
      },
      tenancy: { resolve: async () => ({ mode: "global" }) as never },
      authorization: {
        authorize: async ({ policyId, principal }) => ({
          allowed: policyId === "company-identity.company-admin" &&
            principal?.roles.includes("COMPANY_ADMIN") === true,
          ...(policyId === "company-identity.company-admin" &&
              principal?.roles.includes("COMPANY_ADMIN") === true
            ? {}
            : { safeReasonCode: "COMPANY_ADMIN_REQUIRED" }),
        }) as never,
      },
      transactions: {
        run: async () => {
          throw new Error("Company identity capability transactions are repository-owned.");
        },
      },
      idempotency: createCompanyIdentityDurableIdempotencyPort(sql),
      audit: {
        append: async (event) => {
          await repository.appendAudit({
            correlationId: event.correlationId,
            actorAccountId: event.actor.type === "user" ? event.actor.id : undefined,
            operation: event.capabilityId,
            outcome: event.outcome === "success" ? "SUCCEEDED"
              : event.outcome === "denied" ? "DENIED" : "FAILED",
            reasonCode: event.outcome === "success" ? undefined : event.outcome.toUpperCase(),
            metadata: {
              source: "accounts-capability-kernel",
            },
          });
          return { eventId: event.eventId, persistedAt: new Date().toISOString() };
        },
      },
      references,
      adapters: {
        get: () => {
          throw new Error("No external adapter is registered for identity handlers.");
        },
      },
      logger: { debug: () => {}, info: () => {}, warn: () => {} },
      span: { setAttributes: () => {} },
      clock: { now: () => new Date() },
      createCorrelationId: randomUUID,
    });
    return {
      service,
      executor,
      cookie,
      issuerUrl: issuer.issuerUrl,
      jwk: signer.jwk(),
      close: () => sql.end({ timeout: 5 }),
    };
  })();
  return compositionPromise;
}
