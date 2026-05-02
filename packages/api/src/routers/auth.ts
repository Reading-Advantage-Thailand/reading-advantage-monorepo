import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { users, refreshTokens } from "@reading-advantage/db/schema";
import {
  createTokenPair,
  verifyRefreshToken,
  type AccessTokenPayload,
} from "@reading-advantage/auth";
import bcrypt from "bcryptjs";

export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user || !user.password) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const valid = await bcrypt.compare(input.password, user.password);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const payload: AccessTokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      };

      const tokens = createTokenPair(payload);

      // Store refresh token
      await ctx.db.insert(refreshTokens).values({
        id: crypto.randomUUID(),
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId,
        },
      };
    }),

  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already registered",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const [user] = await ctx.db
        .insert(users)
        .values({
          id: crypto.randomUUID(),
          email: input.email,
          name: input.name,
          password: hashedPassword,
          role: "STUDENT",
        })
        .returning();

      const payload: AccessTokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      };

      const tokens = createTokenPair(payload);

      await ctx.db.insert(refreshTokens).values({
        id: crypto.randomUUID(),
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId,
        },
      };
    }),

  session: protectedProcedure.query(async ({ ctx }) => {
    return {
      user: ctx.auth.user,
      tenant: ctx.auth.tenant,
    };
  }),

  refresh: publicProcedure
    .input(
      z.object({
        refreshToken: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { userId } = verifyRefreshToken(input.refreshToken);

        // Check refresh token exists in DB
        const [stored] = await ctx.db
          .select()
          .from(refreshTokens)
          .where(eq(refreshTokens.token, input.refreshToken))
          .limit(1);

        if (!stored || stored.expiresAt < new Date()) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid or expired refresh token",
          });
        }

        // Get user
        const [user] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not found",
          });
        }

        // Rotate refresh token — delete old, create new
        await ctx.db
          .delete(refreshTokens)
          .where(eq(refreshTokens.token, input.refreshToken));

        const payload: AccessTokenPayload = {
          userId: user.id,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
        };

        const tokens = createTokenPair(payload);

        await ctx.db.insert(refreshTokens).values({
          id: crypto.randomUUID(),
          userId: user.id,
          token: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        return {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        };
      } catch {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid refresh token",
        });
      }
    }),

  logout: protectedProcedure
    .input(
      z.object({
        refreshToken: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.refreshToken) {
        await ctx.db
          .delete(refreshTokens)
          .where(eq(refreshTokens.token, input.refreshToken));
      }

      return { success: true };
    }),
});
