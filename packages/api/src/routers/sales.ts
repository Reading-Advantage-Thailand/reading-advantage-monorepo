import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, middleware } from "../trpc.js";
import { AuthError } from "@reading-advantage/auth";
import * as sales from "@reading-advantage/domain/sales";
import {
  moduleOutputSchema,
  moduleBySlugOutputSchema,
  lessonDetailOutputSchema,
  scenarioDetailOutputSchema,
  dashboardModuleOutputSchema,
  adminCurriculumOutputSchema,
  roleplayAttemptOutputSchema,
  quizSubmissionInputSchema,
  quizResultOutputSchema,
  progressOutputSchema,
  chatMessageInputSchema,
  chatMessageOutputSchema,
  approveContentInputSchema,
  approveContentOutputSchema,
  salesCohortRepOutputSchema,
  salesRepDetailOutputSchema,
  ScenarioNotFoundError,
  RubricNotApprovedError,
  CurriculumNotApprovedError,
  LessonPrerequisiteNotMetError,
  ModulePrerequisiteNotMetError,
  AudioStorageError,
  SalesError,
  SalesAuthError,
  salesAccessScopeSchema,
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
  console.error(
    JSON.stringify({
      level: "error",
      event: "sales_operation_failed",
      errorName: err instanceof Error ? err.name : "UnknownError",
      salesCode: err instanceof SalesError ? err.code : undefined,
      detail: err instanceof Error ? err.message : String(err),
    }),
  );
  if (err instanceof AuthError) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sales access denied" });
  }
  if (err instanceof SalesAuthError) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sales resource unavailable",
    });
  }
  if (err instanceof ScenarioNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
  }
  if (
    err instanceof RubricNotApprovedError ||
    err instanceof CurriculumNotApprovedError ||
    err instanceof LessonPrerequisiteNotMetError ||
    err instanceof ModulePrerequisiteNotMetError
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Sales curriculum prerequisite not met",
    });
  }
  if (err instanceof AudioStorageError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Sales service temporarily unavailable",
    });
  }
  if (err instanceof SalesError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Sales request could not be completed",
    });
  }
  if (err instanceof Error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Sales service temporarily unavailable",
    });
  }
  throw err;
}

/**
 * Validates a complete Sales scope against the authenticated tenant model.
 * @param scope Candidate product scope.
 * @param schoolId Authenticated legacy school ID, or null for company mode.
 * @returns Parsed compatible Sales scope.
 * @throws When the scope is absent, partial, or mixed with another tenant model.
 */
function requireCompatibleSalesScope(scope: unknown, schoolId: string | null) {
  const parsed = salesAccessScopeSchema.safeParse(scope);
  const compatible =
    parsed.success &&
    ((parsed.data.kind === "company" && schoolId === null) ||
      (parsed.data.kind === "legacy-school" &&
        schoolId === parsed.data.schoolId));
  if (!compatible) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Verified Sales scope required",
    });
  }
  return parsed.data;
}

/** Middleware that requires the SALES_REP or SALES_ADMIN role. */
const salesRepOrAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  if (
    ctx.auth.user.role !== "SALES_REP" &&
    ctx.auth.user.role !== "SALES_ADMIN"
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sales access required",
    });
  }
  const parsedScope = requireCompatibleSalesScope(
    ctx.auth.productScope,
    ctx.auth.tenant.schoolId,
  );
  return next({
    ctx: {
      ...ctx,
      auth: { ...ctx.auth, productScope: parsedScope.data },
    },
  });
});

/** Middleware that requires the SALES_ADMIN role. */
const salesAdminOnly = middleware(async ({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  if (ctx.auth.user.role !== "SALES_ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sales admin access required",
    });
  }
  const parsedScope = requireCompatibleSalesScope(
    ctx.auth.productScope,
    ctx.auth.tenant.schoolId,
  );
  return next({
    ctx: {
      ...ctx,
      auth: { ...ctx.auth, productScope: parsedScope.data },
    },
  });
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
          scope: ctx.auth.productScope,
        });
      } catch (err) {
        throw mapSalesError(err);
      }
    }),

  moduleBySlug: salesProcedure
    .input(z.object({ slug: z.string() }))
    .output(moduleBySlugOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await sales.getModuleBySlug(
          {
            db: ctx.tenantDb,
            user: ctx.auth.user,
            tenant: ctx.auth.tenant,
            scope: ctx.auth.productScope,
          },
          input,
        );
      } catch (err) {
        throw mapSalesError(err);
      }
    }),

  lesson: salesProcedure
    .input(z.object({ lessonId: z.string().uuid() }))
    .output(lessonDetailOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await sales.getLesson(
          {
            db: ctx.tenantDb,
            user: ctx.auth.user,
            tenant: ctx.auth.tenant,
            scope: ctx.auth.productScope,
          },
          input,
        );
      } catch (err) {
        throw mapSalesError(err);
      }
    }),

  scenario: salesProcedure
    .input(z.object({ scenarioId: z.string().uuid() }))
    .output(scenarioDetailOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await sales.getScenario(
          {
            db: ctx.tenantDb,
            user: ctx.auth.user,
            tenant: ctx.auth.tenant,
            scope: ctx.auth.productScope,
          },
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
          {
            db: ctx.tenantDb,
            user: ctx.auth.user,
            tenant: ctx.auth.tenant,
            scope: ctx.auth.productScope,
          },
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
          scope: ctx.auth.productScope,
        });
      } catch (err) {
        throw mapSalesError(err);
      }
    }),

  dashboard: salesProcedure
    .output(z.array(dashboardModuleOutputSchema))
    .query(async ({ ctx }) => {
      try {
        return await sales.getDashboardData({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          scope: ctx.auth.productScope,
        });
      } catch (err) {
        throw mapSalesError(err);
      }
    }),

  markTheoryLessonComplete: salesProcedure
    .input(z.object({ lessonId: z.string().uuid() }))
    .output(progressOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await sales.markTheoryLessonComplete(
          {
            db: ctx.tenantDb,
            user: ctx.auth.user,
            tenant: ctx.auth.tenant,
            scope: ctx.auth.productScope,
          },
          input,
        );
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
          {
            db: ctx.tenantDb,
            user: ctx.auth.user,
            tenant: ctx.auth.tenant,
            scope: ctx.auth.productScope,
          },
          input,
        );
      } catch (err) {
        throw mapSalesError(err);
      }
    }),

  saveChatMessage: salesProcedure
    .input(chatMessageInputSchema)
    .output(
      z.object({
        message: chatMessageOutputSchema,
        conversationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await sales.saveChatMessage(
          {
            db: ctx.tenantDb,
            user: ctx.auth.user,
            tenant: ctx.auth.tenant,
            scope: ctx.auth.productScope,
          },
          input,
        );
      } catch (err) {
        throw mapSalesError(err);
      }
    }),

  admin: router({
    curriculum: salesAdminProcedure
      .output(adminCurriculumOutputSchema)
      .query(async ({ ctx }) => {
        try {
          return await sales.getAdminCurriculum({
            db: ctx.tenantDb,
            user: ctx.auth.user,
            tenant: ctx.auth.tenant,
            scope: ctx.auth.productScope,
          });
        } catch (err) {
          throw mapSalesError(err);
        }
      }),

    cohortOverview: salesAdminProcedure
      .output(z.array(salesCohortRepOutputSchema))
      .query(async ({ ctx }) => {
        try {
          return await sales.getCohortOverview({
            db: ctx.tenantDb,
            user: ctx.auth.user,
            tenant: ctx.auth.tenant,
            scope: ctx.auth.productScope,
          });
        } catch (err) {
          throw mapSalesError(err);
        }
      }),

    repDetail: salesAdminProcedure
      .input(z.object({ repId: z.string().min(1) }))
      .output(salesRepDetailOutputSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await sales.getSalesRepDetail(
            {
              db: ctx.tenantDb,
              user: ctx.auth.user,
              tenant: ctx.auth.tenant,
              scope: ctx.auth.productScope,
            },
            input,
          );
        } catch (err) {
          throw mapSalesError(err);
        }
      }),

    approveContent: salesAdminProcedure
      .input(approveContentInputSchema)
      .output(approveContentOutputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await sales.approveCurriculumContent(
            {
              db: ctx.tenantDb,
              user: ctx.auth.user,
              tenant: ctx.auth.tenant,
              scope: ctx.auth.productScope,
            },
            input,
          );
        } catch (err) {
          throw mapSalesError(err);
        }
      }),
  }),
});
