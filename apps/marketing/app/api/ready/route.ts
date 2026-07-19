import { randomUUID } from "node:crypto";

import {
  createCompanyIdentityServiceAuthConfig,
  type CompanyIdentityServiceAuthConfig,
} from "@reading-advantage/auth";
import { db, sql } from "@reading-advantage/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const accountsReadinessSchema = z.object({
  status: z.literal("ready"),
  service: z.literal("accounts"),
  database: z.literal("company_identity"),
});

const readyResponseSchema = z.object({
  status: z.literal("ready"),
  service: z.literal("marketing"),
  dependencies: z.object({
    database: z.literal("ready"),
    accounts: z.literal("ready"),
  }),
  requestId: z.string().min(1),
});

const unavailableResponseSchema = z.object({
  status: z.literal("unavailable"),
  service: z.literal("marketing"),
  dependency: z.enum(["configuration", "database", "accounts"]),
  requestId: z.string().min(1),
});

class ReadinessDependencyError extends Error {
  /**
   * Creates a dependency-classified readiness failure.
   * @param dependency Dependency which prevented Marketing from becoming ready.
   * @param cause Original failure retained for structured diagnostics.
   */
  constructor(
    readonly dependency: "configuration" | "database" | "accounts",
    cause: unknown,
  ) {
    super(`Marketing readiness dependency unavailable: ${dependency}`, {
      cause,
    });
    this.name = "ReadinessDependencyError";
  }
}

/**
 * Validates the complete confidential Accounts client through the auth adapter.
 * @returns The immutable validated company OIDC client configuration.
 * @throws When any required company OIDC setting is absent or unsafe.
 */
function getCompanyAuthConfig(): CompanyIdentityServiceAuthConfig {
  try {
    return createCompanyIdentityServiceAuthConfig({
      NODE_ENV: process.env.NODE_ENV,
      COMPANY_AUTH_ISSUER_URL: process.env.COMPANY_AUTH_ISSUER_URL,
      COMPANY_AUTH_OIDC_CLIENT_ID: process.env.COMPANY_AUTH_OIDC_CLIENT_ID,
      COMPANY_AUTH_OIDC_CLIENT_SECRET:
        process.env.COMPANY_AUTH_OIDC_CLIENT_SECRET,
      COMPANY_AUTH_OIDC_REDIRECT_URI:
        process.env.COMPANY_AUTH_OIDC_REDIRECT_URI,
      COMPANY_AUTH_EXPECTED_AUDIENCE:
        process.env.COMPANY_AUTH_EXPECTED_AUDIENCE,
      COMPANY_AUTH_CLOCK_SKEW_SECONDS:
        process.env.COMPANY_AUTH_CLOCK_SKEW_SECONDS,
    });
  } catch (error) {
    throw new ReadinessDependencyError("configuration", error);
  }
}

/**
 * Verifies the Marketing product database can accept a query.
 * @returns Nothing after the database probe succeeds.
 * @throws When the Marketing database is unavailable.
 */
async function probeMarketingDatabase(): Promise<void> {
  try {
    await db.execute(sql`SELECT 1 AS ready`);
  } catch (error) {
    throw new ReadinessDependencyError("database", error);
  }
}

/**
 * Verifies Accounts and its identity database are ready for Marketing SSO.
 * @param issuerUrl Validated Accounts issuer origin.
 * @returns Nothing after the Accounts response reports its exact identity.
 * @throws When Accounts transport, status, or response validation fails.
 */
async function probeAccounts(issuerUrl: string): Promise<void> {
  try {
    const response = await fetch(new URL("/api/ready", issuerUrl), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new Error(`Accounts readiness returned HTTP ${response.status}.`);
    }
    accountsReadinessSchema.parse(await response.json());
  } catch (error) {
    throw new ReadinessDependencyError("accounts", error);
  }
}

/**
 * Reports readiness after validating Marketing database and Accounts identity.
 * @param request Request carrying an optional correlation identifier.
 * @returns A validated ready response or a dependency-classified 503 response.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const requestId = request.headers.get("x-request-id")?.trim() || randomUUID();

  try {
    const companyAuthConfig = getCompanyAuthConfig();
    await probeMarketingDatabase();
    await probeAccounts(companyAuthConfig.issuerUrl);
    return NextResponse.json(
      readyResponseSchema.parse({
        status: "ready",
        service: "marketing",
        dependencies: { database: "ready", accounts: "ready" },
        requestId,
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const dependency =
      error instanceof ReadinessDependencyError
        ? error.dependency
        : "configuration";
    console.error(
      JSON.stringify({
        level: "error",
        event: "marketing_readiness_failed",
        service: "marketing",
        dependency,
        requestId,
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    return NextResponse.json(
      unavailableResponseSchema.parse({
        status: "unavailable",
        service: "marketing",
        dependency,
        requestId,
      }),
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
