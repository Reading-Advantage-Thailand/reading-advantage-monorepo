import { eq } from "drizzle-orm";
import { users } from "@reading-advantage/db/schema";
import type { PostgresJsDatabase } from "@reading-advantage/db";
import type * as schema from "@reading-advantage/db/schema";

type Db = PostgresJsDatabase<typeof schema>;

/**
 * Enriches a user object with additional fields from the database.
 * @param db - Database client
 * @param user - The base user object (must have an `id` field)
 * @returns The enriched user object with xp, level, cefrLevel, email, image
 */
export async function enrichAuthUser(
  db: Db,
  user: { id: string; username: string; name: string | null; role: string; schoolId: string | null }
): Promise<{
  id: string;
  username: string;
  name: string | null;
  role: string;
  schoolId: string | null;
  xp: number;
  level: number;
  cefrLevel: string;
  email: string | null;
  image: string | null;
}> {
  const [row] = await db
    .select({
      xp: users.xp,
      level: users.level,
      cefrLevel: users.cefrLevel,
      email: users.email,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    schoolId: user.schoolId,
    xp: row?.xp ?? 0,
    level: row?.level ?? 1,
    cefrLevel: row?.cefrLevel ?? "A1-",
    email: row?.email ?? null,
    image: row?.image ?? null,
  };
}
