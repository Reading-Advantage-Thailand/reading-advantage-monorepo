import { pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../schema/index.js";
import { users, accounts } from "../schema/users.js";
import { hashPassword } from "../../../auth/src/index.js";
import {
  buildPostgresOptions,
  normalizePostgresConnectionString,
} from "../connection-options.js";

const seedConnectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (
  process.env.NODE_ENV === "production" ||
  process.env.ALLOW_LOCAL_CODECAMP_USER_SEED !== "1"
) {
  console.error(
    "This local-only seed is disabled. Set ALLOW_LOCAL_CODECAMP_USER_SEED=1 outside production to run it."
  );
  process.exit(1);
}

if (!seedConnectionString) {
  console.error("Please provide DATABASE_URL or DIRECT_DATABASE_URL");
  process.exit(1);
}

const seedClient = postgres(
  normalizePostgresConnectionString(seedConnectionString),
  buildPostgresOptions(seedConnectionString)
);

const db = drizzle(seedClient, { schema });

/**
 * Creates the local development-only Codecamp administrator and intern accounts when absent.
 * @returns A promise that resolves after the local seed transaction completes.
 */
async function seedUsers() {
  console.log("Seeding local codecamp users...");

  const hash = await hashPassword("Password123");

  await db.transaction(async (tx) => {
    // 1. Seed admin user
    const [existingAdmin] = await tx
      .select()
      .from(users)
      .where(eq(users.username, "admin"))
      .limit(1);

    if (!existingAdmin) {
      const adminId = crypto.randomUUID();
      await tx.insert(users).values({
        id: adminId,
        username: "admin",
        displayUsername: "Admin User",
        name: "Admin User",
        role: "ADMIN",
        schoolId: null,
      });

      await tx.insert(accounts).values({
        id: `${adminId}_credential`,
        userId: adminId,
        providerId: "credential",
        password: hash,
      });
      console.log("  ➕ Created local admin account: admin / Password123");
    } else {
      console.log("  ✓ Admin account already exists");
    }

    // 2. Seed intern user
    const [existingIntern] = await tx
      .select()
      .from(users)
      .where(eq(users.username, "intern1"))
      .limit(1);

    if (!existingIntern) {
      const internId = crypto.randomUUID();
      await tx.insert(users).values({
        id: internId,
        username: "intern1",
        displayUsername: "Intern One",
        name: "Intern One",
        role: "INTERN",
        schoolId: null,
      });

      await tx.insert(accounts).values({
        id: `${internId}_credential`,
        userId: internId,
        providerId: "credential",
        password: hash,
      });
      console.log("  ➕ Created local intern account: intern1 / Password123");
    } else {
      console.log("  ✓ Intern account already exists");
    }
  });

  console.log("✅ Local codecamp users seeding completed successfully!");
}

seedUsers()
  .then(() => seedClient.end({ timeout: 5 }))
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("Failed to seed users:", err);
    await seedClient.end({ timeout: 5 }).catch(() => undefined);
    process.exit(1);
  });
