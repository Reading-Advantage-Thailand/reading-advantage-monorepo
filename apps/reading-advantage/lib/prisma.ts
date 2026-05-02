import { PrismaClient } from "@prisma/client";

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Check if DATABASE_URL is a placeholder (used during build)
const isPlaceholder = process.env.DATABASE_URL?.includes("placeholder");
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

function getDatabaseUrl(): string {
  const dbUrl = process.env.DATABASE_URL;

  if (isPlaceholder || isBuildTime) {
    return "postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public";
  }

  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  try {
    const url = new URL(dbUrl);
    if (!url.hostname || !url.username) {
      throw new Error("DATABASE_URL missing host or username");
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    console.warn("⚠️  Invalid DATABASE_URL, using placeholder for build");
    return "postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public";
  }

  return dbUrl;
}

// During build time with placeholder, create a mock Prisma client
export const prisma: PrismaClient =
  globalForPrisma.prisma ||
  (() => {
    if ((isPlaceholder || isBuildTime) && typeof window === "undefined") {
      return new Proxy({} as PrismaClient, {
        get: (target, prop) => {
          if (prop === "$disconnect" || prop === "$connect") {
            return async () => {};
          }
          console.warn(`⚠️  Prisma client accessed during build time: ${String(prop)}`);
          return () => Promise.resolve(null);
        },
      });
    }

    getDatabaseUrl();

    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  })();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Graceful shutdown
if (process.env.NODE_ENV === "production" && !isPlaceholder && !isBuildTime) {
  process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
