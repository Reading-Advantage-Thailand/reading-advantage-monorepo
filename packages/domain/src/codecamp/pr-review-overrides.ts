import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auditEvents, codecampPrReviewAttempts } from "@reading-advantage/db/schema";
import { assertCan, type Tenant, type UserContext } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

/** Stable action name used to query append-only PR-review corrections. */
export const CODECAMP_PR_REVIEW_OVERRIDE_AUDIT_ACTION = "codecamp.pr_review.override.v1";

/** One bounded human correction to a graph-authorized PR objective. */
export const prReviewObjectiveCorrectionSchema = z.strictObject({
  objectiveId: z.string().regex(/^codecamp\.[a-z0-9.-]+$/),
  correctedScore: z.number().int().min(0).max(100),
  correctedConfidence: z.number().int().min(0).max(100),
  reason: z.string().trim().min(10).max(2_000),
});

/** Untrusted command for recording an append-only human PR-review correction. */
export const prReviewOverrideInputSchema = z.strictObject({
  attemptId: z.string().uuid(),
  correctedDisposition: z.enum(["pass", "revise"]),
  reason: z.string().trim().min(10).max(4_000),
  correctedObjectives: z.array(prReviewObjectiveCorrectionSchema).max(24),
});

/** Persisted metadata shape for an append-only PR-review correction audit event. */
export const prReviewOverrideAuditMetadataSchema = z.strictObject({
  schemaVersion: z.literal("codecamp.pr-review-override.v1"),
  tenantKey: z.string().min(1),
  correctedDisposition: z.enum(["pass", "revise"]),
  reason: z.string().trim().min(10).max(4_000),
  correctedObjectives: z.array(prReviewObjectiveCorrectionSchema).max(24),
});

/**
 * Records a human PR-review correction in the append-only audit log.
 * @param args Database, authorized reviewer, tenant, and untrusted correction input.
 * @returns The immutable audit event describing the correction.
 * @throws When the attempt is outside the tenant or the reviewer lacks admin authority.
 */
export async function recordPrReviewOverride(args: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: unknown;
}) {
  assertCan(args.user, "admin:dashboard", args.tenant);
  const input = prReviewOverrideInputSchema.parse(args.input);
  const tenantKey = args.tenant.schoolId ?? "codecamp";
  const rawDb = args.db.unscoped("PR review correction verifies the attempt tenant before append-only audit insertion");
  const [attempt] = await rawDb.select({ id: codecampPrReviewAttempts.id })
    .from(codecampPrReviewAttempts)
    .where(and(
      eq(codecampPrReviewAttempts.id, input.attemptId),
      eq(codecampPrReviewAttempts.tenantKey, tenantKey),
    ))
    .limit(1);
  if (!attempt) throw new Error("PR review attempt not found");
  const [event] = await rawDb.insert(auditEvents).values({
    actorUserId: args.user.id,
    actorRole: args.user.role,
    action: CODECAMP_PR_REVIEW_OVERRIDE_AUDIT_ACTION,
    targetType: "codecamp_pr_review_attempt",
    targetId: attempt.id,
    metadata: prReviewOverrideAuditMetadataSchema.parse({
      schemaVersion: "codecamp.pr-review-override.v1",
      tenantKey,
      correctedDisposition: input.correctedDisposition,
      reason: input.reason,
      correctedObjectives: input.correctedObjectives,
    }),
  }).returning();
  if (!event) throw new Error("PR review override audit insert did not return a row");
  return event;
}

/**
 * Lists append-only human corrections for one PR review attempt.
 * @param args Database, authorized reviewer, tenant, and attempt identity.
 * @returns Corrections ordered from newest to oldest.
 * @throws When the attempt is outside the tenant or the reviewer lacks admin authority.
 */
export async function listPrReviewOverrides(args: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { attemptId: string };
}) {
  assertCan(args.user, "admin:dashboard", args.tenant);
  const input = z.object({ attemptId: z.string().uuid() }).strict().parse(args.input);
  const tenantKey = args.tenant.schoolId ?? "codecamp";
  const rawDb = args.db.unscoped("PR review correction listing verifies the attempt tenant before reading global audit events");
  const [attempt] = await rawDb.select({ id: codecampPrReviewAttempts.id })
    .from(codecampPrReviewAttempts)
    .where(and(
      eq(codecampPrReviewAttempts.id, input.attemptId),
      eq(codecampPrReviewAttempts.tenantKey, tenantKey),
    ))
    .limit(1);
  if (!attempt) throw new Error("PR review attempt not found");
  return rawDb.select().from(auditEvents).where(and(
    eq(auditEvents.action, CODECAMP_PR_REVIEW_OVERRIDE_AUDIT_ACTION),
    eq(auditEvents.targetType, "codecamp_pr_review_attempt"),
    eq(auditEvents.targetId, attempt.id),
  )).orderBy(desc(auditEvents.createdAt));
}
