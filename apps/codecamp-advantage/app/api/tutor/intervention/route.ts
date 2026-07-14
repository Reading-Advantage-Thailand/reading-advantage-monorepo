import { NextRequest } from "next/server";
import { createAIClient } from "@reading-advantage/ai";
import { getAuthToken } from "@reading-advantage/api/context";
import { requireAuth } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import {
  buildCodecampTutorContext,
  createSafeTutorFallback,
  joinTutorInterventionToVerifiedEvidence,
  persistTutorIntervention,
  recordTutorResourceUse,
  resolveCodecampTutorModel,
} from "@reading-advantage/domain/codecamp";
import { z } from "zod";
import { generateCodecampTutorIntervention } from "@/lib/tutor-intervention";

const tutorRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request"),
    requestId: z.string().uuid(),
    activitySessionId: z.string().uuid(),
    message: z.string().trim().min(1).max(4_000),
    locale: z.enum(["th", "en"]),
    stepId: z.string().trim().min(1).max(256).nullable().optional(),
  }).strict(),
  z.object({
    action: z.literal("resource_use"),
    interventionId: z.string().uuid(),
    resourceId: z.string().trim().min(1).max(256),
    actionType: z.enum(["open", "seek", "highlight"]),
  }).strict(),
  z.object({
    action: z.literal("join_verified_evidence"),
    interventionId: z.string().uuid(),
    activitySessionId: z.string().uuid(),
    verifiedSubmissionId: z.string().trim().min(1).max(256),
  }).strict(),
]);

/**
 * Serves authenticated, activity-bound targeted tutor operations.
 * @param request Learner request containing an opaque activity session and action payload.
 * @returns A structured intervention, audited resource action, evidence join, or sanitized error.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const token = await getAuthToken();
    const session = await requireAuth(db, token);
    const tenant = { schoolId: session.user.schoolId };
    const tenantDb = createTenantDB(db, tenant);
    const input = tutorRequestSchema.parse(await request.json());

    if (input.action === "resource_use") {
      await recordTutorResourceUse({ db: tenantDb, user: session.user, tenant, input });
      return Response.json({ ok: true });
    }

    if (input.action === "join_verified_evidence") {
      await joinTutorInterventionToVerifiedEvidence({ db: tenantDb, user: session.user, tenant, input });
      return Response.json({ ok: true });
    }

    const context = await buildCodecampTutorContext({
      db: tenantDb,
      user: session.user,
      tenant,
      input: { activitySessionId: input.activitySessionId, locale: input.locale, stepId: input.stepId },
    });
    const tutorModel = resolveCodecampTutorModel();
    const generated = process.env.OPENROUTER_API_KEY
      ? await generateCodecampTutorIntervention({
        context,
        learnerMessage: input.message,
        modelAlias: tutorModel,
        client: createAIClient({ provider: "openrouter", apiKey: process.env.OPENROUTER_API_KEY, model: tutorModel }),
      })
      : {
        ok: false,
        intervention: createSafeTutorFallback(context.locale),
        resource: null,
        evidence: null,
        provenance: {
          modelAlias: tutorModel,
          resolvedModel: tutorModel,
          provider: null,
          providerRequestId: null,
          responseId: null,
          latencyMs: null,
          promptPolicyVersion: context.versions.promptPolicy,
          schemaVersion: context.versions.schema,
          graphVersion: context.activity.graphVersion,
          activityVersion: context.activity.version,
        },
      };
    const persisted = await persistTutorIntervention({
      db: tenantDb,
      user: session.user,
      tenant,
      input: {
        requestId: input.requestId,
        activitySessionId: input.activitySessionId,
        context,
        intervention: generated.intervention,
        provenance: generated.provenance,
      },
    });
    return Response.json({
      ok: generated.ok,
      interventionId: persisted.id,
      intervention: generated.intervention,
      resource: generated.resource,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid tutor request" }, { status: 400 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Tutor request failed" },
      { status: 400 },
    );
  }
}
