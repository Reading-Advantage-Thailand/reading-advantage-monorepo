import NextAuth from "next-auth";
import { User } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { signInSchema } from "./zod";
import { ZodError } from "zod";
import { getUserByEmail } from "@/server/models/userModel";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        type: { label: "Type", type: "text" },
      },
      authorize: async (credentials): Promise<User | null> => {
        try {
          if (!credentials) return null;

          const { email, password, type } =
            await signInSchema.parseAsync(credentials);

          const user = await getUserByEmail(email);

          if (!user) return null;

          const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.roles.map((role) => role.role.name).join(", "),
            xp: user.xp,
            level: user.level,
            cefrLevel: user.cefrLevel,
            schoolId: user.schoolId,
          } as User;

          if (type === "student") {
            return userData;
          }

          if (type === "other") {
            const isPasswordValid = await bcrypt.compare(
              password,
              user.password ?? "",
            );
            if (isPasswordValid) {
              return userData;
            }
          }
          return null;
        } catch (error) {
          if (error instanceof ZodError) {
            console.error("Validation error:", error.errors);
            return null;
          }
          console.error("Sign-in error:", error);
          return null;
        }
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          scope: "openid profile email",
        },
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id as string;
        token.email = user.email as string;
        token.name = user.name as string;
        token.role = user.role;
        token.xp = user.xp;
        token.level = user.level;
        token.cefrLevel = user.cefrLevel;
        token.schoolId = user.schoolId;
      }

      if (trigger === "update" && token.email) {
        const dbUser = await getUserByEmail(token.email as string);
        if (dbUser) {
          token.id = dbUser.id;
          token.email = dbUser.email as string;
          token.name = dbUser.name as string;
          token.xp = dbUser.xp;
          token.level = dbUser.level;
          token.cefrLevel = dbUser.cefrLevel as string;
          token.role = dbUser.roles.map((role) => role.role.name).join(", ");
          token.schoolId = dbUser.schoolId as string;
        }
      }

      // Handle Google OAuth users
      if (account?.provider === "google" && user?.email) {
        // Fetch user from database to get role
        const dbUser = await getUserByEmail(user.email);

        const role = await prisma.role.findFirst({
          where: { name: "user" },
        });

        if (!dbUser) {
          const newUser = await prisma.user.create({
            data: {
              name: user.name || "",
              email: user.email!,
              image: user.image,
              emailVerified: new Date(),
            },
          });

          await prisma.userRole.create({
            data: {
              userId: newUser.id,
              roleId: role?.id as string,
            },
          });
        }

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.roles.map((role) => role.role.name).join(", ");
          token.xp = dbUser.xp;
          token.level = dbUser.level;
          token.cefrLevel = dbUser.cefrLevel as string;
          token.schoolId = dbUser.schoolId as string;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.xp = token.xp;
        session.user.level = token.level;
        session.user.cefrLevel = token.cefrLevel;
        session.user.schoolId = token.schoolId;
      }
      return session;
    },
  },
});
