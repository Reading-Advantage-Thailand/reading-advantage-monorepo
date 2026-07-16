import postgres from "postgres";

/**
 * Issues raw SQL directly from a transport route.
 * @returns HTTP response containing the raw query result.
 */
export async function GET() {
  const sql = postgres(process.env.DATABASE_URL!);
  const rows = await sql.unsafe("SELECT 1");
  return Response.json(rows);
}
