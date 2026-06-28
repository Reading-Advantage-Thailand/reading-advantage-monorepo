import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, middleware } from "../trpc.js";
import { AuthError } from "@reading-advantage/auth";
import * as sales from "@reading-advantage/domain/sales";
import {
  moduleOutputSchema,
  lessonOutputSchema,
  roleplayScenarioOutputSchema,
  rubricOutputSchema,
  roleplayAttemptOutputSchema,
  quizSubmissionInputSchema,
  quizResultOutputSchema,
  progressOutputSchema,
  chatMessageInputSchema,
  chatMessageOutputSchema,
  createRepInputSchema,
  approveContentInputSchema,
  ScenarioNotFoundError,
  RubricNotApprovedError,
  CurriculumNotApprovedError,
  ModulePrerequisiteNotMetError,
  AudioStorageError,
  SalesError,
} from "@reading-advantage/domain/sales";

/**
 * Maps sales domain errors to tRPC TRPCError instances.
 *
 * Uses `instanceof` against typed domain error classes so that generic
 * errors (e.g. `Error("Database connection not found")`) do not get
 * misclassified as NOT_FOUND. String-based matching was the previous
 * fragile implementation (see Wave 0 Phase 3 plan, CA-003 / F-SF-017).
 *
 * @param err - The error to map
 * @returns Never; always throws a TRPCError
 */
function mapSalesError(err: unknown): never {
  if (err instanceof AuthError) {
    throw new TRPCError({ code: "FORBIDDEN", message: err.message });
  }
  if (err instanceof ScenarioNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: err.message });
  }
  if (
    err instanceof RubricNotApprovedError ||
    err instanceof CurriculumNotApprovedError ||
    err instanceof ModulePrerequisiteNotMetError
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  if (err instanceof AudioStorageError) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
  }
  if (err instanceof SalesError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  if (err instanceof Error) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
  }
  throw err;
}

/** Middleware that requires the SALES_REP or SALES_ADMIN role. */
const salesRepOrAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  if (ctx.auth.user.role !== "SALES_REP" && ctx.auth.user.role !== "SALES_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sales access required" });
  }
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

/** Middleware that requires the SALES_ADMIN role. */
const salesAdminOnly = middleware(async ({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  if (ctx.auth.user.role !== "SALES_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sales admin access required" });
  }
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

const salesProcedure = protectedProcedure.use(salesRepOrAdmin);
const salesAdminProcedure = protectedProcedure.use(salesAdminOnly);

export const salesRouter = router({
  modules: salesProcedure
    .output(z.array(moduleOutputSchema))
    .query(async ({ ctx }) => {
      try {
        return await sales.getModules({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
        });
      } catch (err) {
        throw mapSalesError(err);
      }
    }),

  moduleBySlug: salesProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        return await sales.getModuleBySlug(
          { db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant },
          input,
        );
      } catch (err) {
        throw mapSalesError(err);
      }
    }),

  lesson: salesProcedure
    .input(z.object({ lessonId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await sales.getLesson(
          { db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant },
          input,
        );
      } catch (err) {
        throw mapSalesError(err);
      }
    }),

  scenario: salesProcedure
    .input(z.object({ scenarioId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await sales.getScenario(
          { db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant },
          input,
        );
      } catch (err) {
        throw mapSalesError(err);
      }
    }),

  attemptHistory: salesProcedure
    .input(z.object({ scenarioId: z.string().uuid() }))
    .output(z.array(roleplayAttemptOutputSchema))
    .query(async ({ ctx, input }) => {
      try {
        return await sales.getAttemptsForScenario(
          { db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant },
          input,
        );
      } catch (err) {
        throw mapSalesError(err);
      }
    }),

  progress: salesProcedure
    .output(z.array(progressOutputSchema))
    .query(async ({ ctx }) => {
      try {
        return await sales.getProgressForUser({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
        });
      } catch (err) {
        throw mapSalesError(err);
      }
    }),

  dashboard: salesProcedure.query(async ({ ctx }) => {
    try {
      return await sales.getDashboardData({
        db: ctx.tenantDb,
        user: ctx.auth.user,
        tenant: ctx.auth.tenant,
      });
    } catch (err) {
      throw mapSalesError(err);
    }
  }),

  submitQuiz: salesProcedure
    .input(quizSubmissionInputSchema)
    .output(quizResultOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await sales.submitQuiz(
          { db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant },
          input,
        );
      } catch (err) {
        throw mapSalesError(err);
      }
    }),

  saveChatMessage: salesProcedure
    .input(chatMessageInputSchema)
    .output(z.object({ message: chatMessageOutputSchema, conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await sales.saveChatMessage(
          { db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant },
          input,
        );
      } catch (err) {
        throw mapSalesError(err);
      }
    }),

  admin: router({
    createRep: salesAdminProcedure
      .input(createRepInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await sales.createRepAccount(
            { db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant },
            input,
          );
        } catch (err) {
          throw mapSalesError(err);
        }
      }),

    cohortOverview: salesAdminProcedure
      .output(z.array(progressOutputSchema))
      .query(async ({ ctx }) => {
        try {
          return await sales.getCohortOverview({
            db: ctx.tenantDb,
            user: ctx.auth.user,
            tenant: ctx.auth.tenant,
          });
        } catch (err) {
          throw mapSalesError(err);
        }
      }),

    approveContent: salesAdminProcedure
      .input(approveContentInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await sales.approveCurriculumContent(
            { db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant },
            input,
          );
        } catch (err) {
          throw mapSalesError(err);
        }
      }),
  }),
});
