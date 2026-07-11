import {
  appendActivityEventsInputSchema,
  getActivitySessionInputSchema,
  startActivitySessionInputSchema,
  type ActivityTransportHandlers,
} from "@reading-advantage/activity-runtime/transport";
import type { ActivityActor } from "@reading-advantage/activity-runtime/server";
import { z } from "zod";
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
export function createActivityRouter(handlers: ActivityTransportHandlers) {
  return router({
    start: protectedProcedure
      .input(startActivitySessionInputSchema)
      .output(activitySessionSummarySchema)
      .mutation(({ ctx, input }) => handlers.start(actorFromContext(ctx.auth), input)),
    append: protectedProcedure
      .input(appendActivityEventsInputSchema)
      .output(activitySessionSummarySchema)
      .mutation(({ ctx, input }) => handlers.append(actorFromContext(ctx.auth), input)),
    get: protectedProcedure
      .input(getActivitySessionInputSchema)
      .output(activitySessionSummarySchema.nullable())
      .query(({ ctx, input }) => handlers.get(actorFromContext(ctx.auth), input)),
  });
}
