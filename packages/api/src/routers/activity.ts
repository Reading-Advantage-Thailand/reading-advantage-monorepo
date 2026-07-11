import {
  appendActivityEventsInputSchema,
  assessActivityCheckpointInputSchema,
  assessActivityTutorialInputSchema,
  getActivitySessionInputSchema,
  startActivitySessionInputSchema,
  type ActivityTransportHandlers,
} from "@reading-advantage/activity-runtime/transport";
import type { ActivityActor } from "@reading-advantage/activity-runtime/server";
import { tutorialReportRequestSchema, verifiedTutorialReportSchema } from "@reading-advantage/activity-tutorial/reporting";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Context } from "../trpc.js";
import { protectedProcedure, router } from "../trpc.js";

const activitySessionSummarySchema = z.object({
  sessionId: z.string(), activityId: z.string(), completed: z.boolean(),
  watchedRanges: z.array(z.object({ startSeconds: z.number(), endSeconds: z.number() })),
  checkpointAttempts: z.record(z.object({ attemptNumber: z.number(), answer: z.unknown() })),
  assessedCheckpointResults: z.record(z.object({ attemptNumber: z.number(), isCorrect: z.boolean(), score: z.number() })),
  assessedTutorialResults: z.record(z.object({ attemptNumber: z.number(), isCorrect: z.boolean(), score: z.number() })),
  completedStepIds: z.array(z.string()), openedResourceIds: z.array(z.string()), unresolvedCheckpointIds: z.array(z.string()),
  support: z.object({ hintsUsed: z.number(), revealsUsed: z.number(), interventionLevel: z.number() }),
}).strict();
const activityAssessmentResponseSchema = z.object({ isCorrect: z.boolean(), score: z.number(), session: activitySessionSummarySchema }).strict();

function actorFromContext(auth: { user: { id: string }; tenant: { schoolId: string | null } }): ActivityActor {
  return auth.tenant.schoolId
    ? { learnerId: auth.user.id, schoolId: auth.tenant.schoolId }
    : { learnerId: auth.user.id, schoolId: null, tenantKey: "codecamp" };
}

/**
 * Creates a thin authenticated tRPC adapter over framework-neutral activity handlers.
 * @param handlers Server activity handlers with authored content and persistence dependencies.
 * @returns tRPC router for starting, appending, and reading owned sessions.
 */
export function createActivityRouter(resolveHandlers: (context: Context) => ActivityTransportHandlers & {
  getTeacherSummary(schoolId: string, learnerId: string, sessionId: string): Promise<z.infer<typeof activitySessionSummarySchema> | null>;
  reportTutorial(actor: ActivityActor, input: unknown): Promise<{ verified: z.infer<typeof verifiedTutorialReportSchema>; session: z.infer<typeof activitySessionSummarySchema> }>;
}) {
  return router({
    start: protectedProcedure
      .input(startActivitySessionInputSchema)
      .output(activitySessionSummarySchema)
      .mutation(({ ctx, input }) => resolveHandlers(ctx).start(actorFromContext(ctx.auth), input)),
    append: protectedProcedure
      .input(appendActivityEventsInputSchema)
      .output(activitySessionSummarySchema)
      .mutation(({ ctx, input }) => resolveHandlers(ctx).append(actorFromContext(ctx.auth), input)),
    get: protectedProcedure
      .input(getActivitySessionInputSchema)
      .output(activitySessionSummarySchema.nullable())
      .query(({ ctx, input }) => resolveHandlers(ctx).get(actorFromContext(ctx.auth), input)),
    assessCheckpoint: protectedProcedure
      .input(assessActivityCheckpointInputSchema)
      .output(activityAssessmentResponseSchema)
      .mutation(({ ctx, input }) => resolveHandlers(ctx).assessCheckpoint(actorFromContext(ctx.auth), input)),
    assessTutorial: protectedProcedure
      .input(assessActivityTutorialInputSchema)
      .output(activityAssessmentResponseSchema)
      .mutation(({ ctx, input }) => resolveHandlers(ctx).assessTutorial(actorFromContext(ctx.auth), input)),
    reportTutorial: protectedProcedure
      .input(tutorialReportRequestSchema)
      .output(z.object({ verified: verifiedTutorialReportSchema, session: activitySessionSummarySchema }).strict())
      .mutation(({ ctx, input }) => resolveHandlers(ctx).reportTutorial(actorFromContext(ctx.auth), input)),
    teacherGet: protectedProcedure
      .input(z.object({ learnerId: z.string().min(1), sessionId: z.string().uuid() }).strict())
      .output(activitySessionSummarySchema.nullable())
      .query(({ ctx, input }) => {
        if (!ctx.auth.tenant.schoolId || !["TEACHER", "ADMIN", "SYSTEM"].includes(ctx.auth.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Teacher activity access requires a school-scoped educator" });
        return resolveHandlers(ctx).getTeacherSummary(ctx.auth.tenant.schoolId, input.learnerId, input.sessionId);
      }),
  });
}
