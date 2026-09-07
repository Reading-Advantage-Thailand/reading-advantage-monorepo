import { NextResponse } from "next/server";

/**
 * Returns the migration status for the unavailable Google Classroom sync route.
 * @returns A response that identifies the required migration.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "Google Classroom sync is unavailable until its database migration is complete.",
      track: "firestore_drizzle_migration_20260503",
    },
    { status: 501 },
  );
}
