import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PasswordUtils } from "@/lib/password-utils";
import { LicenseType } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: false,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              teacherClassrooms: {
                select: {
                  classroomId: true,
                },
              },
              studentClassrooms: {
                select: {
                  classroomId: true,
                },
              },
              licenseOnUsers: {
                select: {
                  licenseId: true,
                  license: {
                    select: {
                      expiresAt: true,
                      licenseType: true,
                    },
                  },
                },
                take: 1,
              },
            },
          });

          if (!user) {
            return null;
          }
          let isValidPassword = false;

          if (user.password) {
            if (PasswordUtils.isHashed(user.password)) {
              isValidPassword = await PasswordUtils.comparePassword(
                credentials.password,
                user.password,
              );
            } else {
              isValidPassword = user.password === credentials.password;
            }
          }

          if (!isValidPassword) {
            return null;
          }

          const currentDate = new Date();

          // Get active license info
          const activeLicenseId =
            user.licenseOnUsers[0]?.licenseId || user.licenseId;
          const activeLicense = user.licenseOnUsers[0]?.license;

          // Use license expiration date if available, otherwise use user expiration date
          const effectiveExpirationDate =
            activeLicense?.expiresAt || user.expiredDate;

          const isExpired = effectiveExpirationDate
            ? effectiveExpirationDate < currentDate
            : false;

          // Determine license level based on active license
          let licenseLevel: LicenseType | "EXPIRED";
          if (isExpired) {
            licenseLevel = "EXPIRED" as const;
          } else if (activeLicense?.licenseType) {
            licenseLevel = activeLicense.licenseType;
          } else if (activeLicenseId) {
            licenseLevel = "BASIC" as const;
          } else {
            licenseLevel = "EXPIRED" as const;
          }

          const teacherClassIds = user.teacherClassrooms.map(
            (tc) => tc.classroomId,
          );
          const studentClassIds = user.studentClassrooms.map(
            (sc) => sc.classroomId,
          );

          const returnUser = {
            id: user.id,
            email: user.email,
            display_name: user.name ?? "",
            role: user.role,
            level: user.level,
            email_verified: !!user.emailVerified,
            picture: user.image ?? "",
            xp: user.xp,
            cefr_level: user.cefrLevel ?? "",
            expired_date: effectiveExpirationDate?.toISOString() ?? "",
            expired: isExpired,
            license_id: activeLicenseId ?? "",
            onborda: user.onborda ?? false,
            license_level: licenseLevel,
            school_id: user.schoolId ?? undefined,
            teacher_class_ids:
              teacherClassIds.length > 0 ? teacherClassIds : undefined,
            student_class_ids:
              studentClassIds.length > 0 ? studentClassIds : undefined,
          };

          return returnUser;
        } catch (error) {
          console.error("AUTHORIZE ERROR:", error);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      if (account?.provider === "google") {
        return true;
      }
      if (account?.provider === "credentials") {
        return true;
      }

      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.display_name = user.display_name;
        token.role = user.role;
        token.level = user.level;
        token.email_verified = user.email_verified;
        token.picture = user.picture;
        token.xp = user.xp;
        token.cefr_level = user.cefr_level;
        token.expired_date = user.expired_date;
        token.expired = user.expired;
        token.license_id = user.license_id;
        token.onborda = user.onborda;
        token.license_level = user.license_level;
        token.school_id = user.school_id;
        token.teacher_class_ids = user.teacher_class_ids;
        token.student_class_ids = user.student_class_ids;
      }

      // Always refresh level, xp, and cefr_level from database to ensure latest values
      // This is important after level test or any XP-earning activity
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              level: true,
              xp: true,
              cefrLevel: true,
              // FIX: Fetch latest role from DB to ensure session sync works
              role: true,
            },
          });
          if (dbUser) {
            token.level = dbUser.level;
            token.xp = dbUser.xp;
            token.cefr_level = dbUser.cefrLevel ?? "";
            // FIX: Update token role from DB
            token.role = dbUser.role;
          }
        } catch (error) {
          console.error("Error refreshing user level from database:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.display_name = token.display_name;
        session.user.role = token.role;
        session.user.level = token.level;
        session.user.email_verified = token.email_verified;
        session.user.picture = token.picture;
        session.user.xp = token.xp;
        session.user.cefr_level = token.cefr_level;
        session.user.expired_date = token.expired_date;
        session.user.expired = token.expired;
        session.user.license_id = token.license_id;
        session.user.onborda = token.onborda;
        session.user.license_level = token.license_level;
        session.user.school_id = token.school_id;
        session.user.teacher_class_ids = token.teacher_class_ids;
        session.user.student_class_ids = token.student_class_ids;
      }
      return session;
    },
  },
};
