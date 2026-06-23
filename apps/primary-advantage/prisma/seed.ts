// prisma/seed.ts
// Migrated from a Prisma seed script to a Drizzle seed script.
// The original Prisma logic has been replaced with a Drizzle-based
// implementation, and the `main()` entrypoint is currently a no-op
// until seed data is required (see `// TODO` below).
import { db } from "@reading-advantage/db";

async function main() {
  // TODO: implement with Drizzle — port the legacy Prisma seed logic
  // (fake teacher/student/user creation + role assignment) to use
  // Drizzle `db.insert(...).values(...)` against `users`, `roles`,
  // and `userRoles`.
  console.log("Drizzle seed: no-op (awaiting implementation)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Drizzle's `db` is a postgres-js singleton; the underlying pool
    // closes automatically when the process exits. Explicitly ending
    // it here keeps parity with the legacy `await prisma.$disconnect()`.
    try {
      await (db as unknown as { $client?: { end?: () => Promise<void> } })
        .$client?.end?.();
    } catch {
      // best-effort cleanup
    }
  });