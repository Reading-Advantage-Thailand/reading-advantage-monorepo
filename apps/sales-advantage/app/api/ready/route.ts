import { randomUUID } from "node:crypto";

import {
  createCompanyIdentityServiceAuthConfig,
  type CompanyIdentityServiceAuthConfig,
} from "@reading-advantage/auth";
import { db, sql } from "@reading-advantage/db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSalesAuthMode } from "@/lib/auth-mode";

const accountsReadinessSchema = z.object({
  status: z.literal("ready"),
  service: z.literal("accounts"),
  database: z.literal("company_identity"),
});

const readyResponseSchema = z.object({
  status: z.literal("ready"),
  service: z.literal("sales-advantage"),
  mode: z.enum(["company", "legacy-school"]),
  dependencies: z.object({
    database: z.literal("ready"),
    accounts: z.enum(["ready", "not-required"]),
  }),
  requestId: z.string().min(1),
});

const unavailableResponseSchema = z.object({
  status: z.literal("unavailable"),
  service: z.literal("sales-advantage"),
  dependency: z.enum(["configuration", "database", "accounts"]),
  requestId: z.string().min(1),
});

class ReadinessDependencyError extends Error {
  /**
   * Creates a dependency-classified readiness failure.
   * @param dependency Dependency which prevented the service from becoming ready.
   * @param cause Original failure retained for structured diagnostics.
   */
  constructor(
    readonly dependency: "configuration" | "database" | "accounts",
    cause: unknown,
  ) {
    super(`Sales readiness dependency unavailable: ${dependency}`, { cause });
    this.name = "ReadinessDependencyError";
  }
}

/**
 * Validates the complete confidential Accounts client through the internal auth adapter.
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
 * Verifies the Sales product database can accept a query.
 * @returns Nothing after the database probe succeeds.
 * @throws When the Sales database is unavailable.
 */
async function probeSalesDatabase(): Promise<void> {
  try {
    await db.execute(sql`SELECT 1 AS ready`);
  } catch (error) {
    throw new ReadinessDependencyError("database", error);
  }
}

/**
 * Verifies Accounts and its identity database are ready for company SSO.
 * @returns Nothing after the validated Accounts response reports readiness.
 * @throws When configuration, transport, status, or response validation fails.
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
 * Reports readiness after validating every dependency required by the active auth mode.
 * @param request Request carrying an optional correlation identifier.
 * @returns A validated ready response or a dependency-classified 503 response.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const requestId = request.headers.get("x-request-id")?.trim() || randomUUID();
  let mode: "company" | "legacy-school" | "unknown" = "unknown";

  try {
    mode = getSalesAuthMode();
    const companyAuthConfig =
      mode === "company" ? getCompanyAuthConfig() : undefined;
    await probeSalesDatabase();
    if (companyAuthConfig) {
      await probeAccounts(companyAuthConfig.issuerUrl);
    }
    return NextResponse.json(
      readyResponseSchema.parse({
        status: "ready",
        service: "sales-advantage",
        mode,
        dependencies: {
          database: "ready",
          accounts: mode === "company" ? "ready" : "not-required",
        },
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
        event: "sales_readiness_failed",
        service: "sales-advantage",
        mode,
        dependency,
        requestId,
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    return NextResponse.json(
      unavailableResponseSchema.parse({
        status: "unavailable",
        service: "sales-advantage",
        dependency,
        requestId,
      }),
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
