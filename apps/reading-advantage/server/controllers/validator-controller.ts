import { NextResponse, type NextRequest } from "next/server";

/**
 * Returns the migration status for the unavailable article validator.
 * @param req The incoming validation request.
 * @param params The route parameters supplied by the router.
 * @param next The next router callback.
 * @returns A response that identifies the required database migration.
 */
export async function validateArticle(
  req: NextRequest,
  params: unknown,
  next: () => void,
) {
  void req;
  void params;
  void next;
  return NextResponse.json(
    {
      error: "Article validation is unavailable until its database migration is complete.",
      track: "firestore_drizzle_migration_20260503",
    },
    { status: 501 },
  );
}
