import type { DB } from "@reading-advantage/db";
import type { UserContext, Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { salesAccessScopeSchema } from "./schema.js";
import { SalesAuthError } from "./errors.js";
import type {
  RoleplayScenarioOutput,
  RubricOutput,
  RubricCriteria,
  RoleplayEvaluationResult,
  SalesAccessScope,
} from "./schema.js";

/** Context passed to every sales domain function. */
export interface SalesDomainContext {
  db: TenantDB | DB;
  user: UserContext;
  tenant: Tenant;
  scope: SalesAccessScope;
}

/**
 * Validates a complete Sales scope and rejects mixed tenant boundaries.
 * @param scope Candidate domain scope.
 * @param tenant Compatibility tenant carried by the auth context.
 * @returns The validated discriminated Sales scope.
 * @throws When the scope is partial, mixed, or inconsistent with the tenant.
 */
export function requireSalesAccessScope(
  scope: unknown,
  tenant: Tenant,
): SalesAccessScope {
  const parsed = salesAccessScopeSchema.safeParse(scope);
  if (!parsed.success) throw new SalesAuthError("Sales scope is invalid");
  if (parsed.data.kind === "company" && tenant.schoolId !== null) {
    throw new SalesAuthError("Mixed Sales scope is invalid");
  }
  if (
    parsed.data.kind === "legacy-school" &&
    tenant.schoolId !== parsed.data.schoolId
  ) {
    throw new SalesAuthError("Legacy Sales scope is invalid");
  }
  return parsed.data;
}

/** Scenario + rubric + canonical source excerpts needed to evaluate an attempt. */
export interface RoleplayEvaluationContext {
  scenario: RoleplayScenarioOutput;
  rubric: RubricOutput;
  canonicalSourceExcerpts: string[];
}

/** Callback shape that performs the multimodal LLM evaluation of an audio attempt. */
export type EvaluateRoleplayFn = (
  audio: { buffer: Buffer; mimeType: string },
  scenario: RoleplayScenarioOutput,
  rubric: RubricOutput,
  excerpts: string[],
) => Promise<RoleplayEvaluationResult>;

/**
 * Escape hatch for sales REFERENTIAL tables (no schoolId column).
 * Returns the raw DB when given a TenantDB, or the DB itself otherwise.
 * @param db - The TenantDB or raw DB from the domain context
 * @returns A raw DB safe for querying sales_* tables
 */
export function salesRawDb(db: TenantDB | DB): DB {
  return "unscoped" in db
    ? (db as TenantDB).unscoped("sales-advantage tables have no schoolId")
    : db;
}

/** Re-export for evaluator convenience. */
export type { RubricCriteria };
