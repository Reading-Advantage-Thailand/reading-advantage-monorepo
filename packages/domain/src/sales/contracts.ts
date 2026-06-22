import type { DB } from "@reading-advantage/db";
import type { UserContext, Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import type {
  RoleplayScenarioOutput,
  RubricOutput,
  RubricCriteria,
  RoleplayEvaluationResult,
} from "./schema.js";

/** Context passed to every sales domain function. */
export interface SalesDomainContext {
  db: TenantDB | DB;
  user: UserContext;
  tenant: Tenant;
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
