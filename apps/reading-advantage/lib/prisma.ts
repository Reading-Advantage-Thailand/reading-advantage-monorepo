import { PrismaClient } from "@prisma/client";

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Check if DATABASE_URL is a placeholder (used during build)
const isPlaceholder = process.env.DATABASE_URL?.includes("placeholder");
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

// Construct the appropriate DATABASE_URL for the environment
function getDatabaseUrl(): string {
  const dbUrl = process.env.DATABASE_URL;
  
  // If placeholder or build time, return placeholder
  if (isPlaceholder || isBuildTime) {
    return "postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public";
  }

  // Validate DATABASE_URL if provided
  if (dbUrl) {
    // Check if it's a valid format
    try {
      const url = new URL(dbUrl);
      
      // For Unix socket format (Cloud SQL)
      if (dbUrl.includes("/cloudsql/")) {
        // Validate Unix socket format: postgresql://user:pass@/db?host=/cloudsql/...
        const params = new URLSearchParams(url.search);
        const hostParam = params.get("host");
        
        if (!hostParam || !hostParam.startsWith("/cloudsql/")) {
          console.error("❌ DATABASE_URL has invalid Unix socket format");
          throw new Error("Invalid Unix socket format in DATABASE_URL");
        }
        
        // Check username and password are not empty
        if (!url.username || !url.password) {
          console.error("❌ DATABASE_URL missing username or password");
          throw new Error("DATABASE_URL must include username and password");
        }
        
        //console.log(`✅ Using Cloud SQL Unix socket: ${hostParam}`);
        return dbUrl;
      }
      
      // For regular TCP connection
      if (url.hostname && url.username && url.password) {
        //console.log(`✅ Using TCP connection: ${url.hostname}:${url.port || 5432}`);
        return dbUrl;
      }
      
      // If we reach here, format is invalid
      console.error("❌ DATABASE_URL has invalid format:", dbUrl);
      throw new Error("DATABASE_URL is missing required components (host, username, or password)");
      
    } catch (error) {
      console.error("❌ Error parsing DATABASE_URL:", error);
      
      // If in production, throw error
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
      
      // In development, fall through to construct from individual variables
      console.warn("⚠️  Falling back to individual DB_ environment variables");
    }
  }

  // Fallback to constructing from individual variables
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const database = process.env.DB_NAME || "reading_advantage_db";
  const username = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD || "";
  const schema = process.env.DB_SCHEMA || "public";

  // Validate individual variables
  if (!username || !database) {
    throw new Error("Missing required database configuration: DB_USER and DB_NAME must be set");
  }

  // If running on Cloud Run with Cloud SQL, use Unix socket
  if (process.env.CLOUD_SQL_CONNECTION_NAME && host.startsWith("/cloudsql")) {
    const connectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
    const socketHost = `/cloudsql/${connectionName}`;
    //console.log(`🔌 Constructing Unix socket URL: ${socketHost}`);
    return `postgresql://${username}:${password}@/${database}?host=${socketHost}&schema=${schema}`;
  }

  // Otherwise use TCP connection
  //console.log(`🔌 Constructing TCP URL: ${host}:${port}`);
  return `postgresql://${username}:${password}@${host}:${port}/${database}?schema=${schema}`;
}

// During build time with placeholder, create a mock Prisma client
// This prevents errors when Next.js tries to pre-render pages during build
export const prisma: PrismaClient =
  globalForPrisma.prisma ||
  (() => {
    if ((isPlaceholder || isBuildTime) && typeof window === "undefined") {
      // Return a proxy that throws informative errors if used during build
      return new Proxy({} as PrismaClient, {
        get: (target, prop) => {
          if (prop === "$disconnect" || prop === "$connect") {
            return async () => {}; // No-op for lifecycle methods
          }
          console.warn(`⚠️  Prisma client accessed during build time: ${String(prop)}`);
          // Return empty results for build-time queries
          return () => Promise.resolve(null);
        },
      });
    }
    
    // Validate database URL but let Prisma read from env directly
    getDatabaseUrl();
    //console.log(`🔌 Connecting to database...`);
    
    return new PrismaClient({
      // Don't override datasources - let Prisma read DATABASE_URL from .env
      // This ensures proper decoding of URL-encoded passwords
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      // Connection pool configuration for serverless environments
      datasources: {
        db: {
          url: getDatabaseUrl() + (getDatabaseUrl().includes('?') ? '&' : '?') + 
               'connection_limit=10&pool_timeout=20&connect_timeout=30'
        }
      }
    });
  })();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Graceful shutdown for Cloud Run
if (process.env.NODE_ENV === "production" && !isPlaceholder && !isBuildTime) {
  process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
