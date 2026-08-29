import type { UserContext } from "@reading-advantage/auth";

import type { SessionUser } from "@/lib/session";

/**
 * Maps a Reading session user onto the shared auth user context.
 * @param user Authenticated Reading session user.
 * @returns Domain user context used by games commands.
 */
export function toUserContext(user: SessionUser): UserContext {
  return {
    id: user.id,
    username: user.username,
    name: user.display_name ?? null,
    role: user.role as UserContext["role"],
    schoolId: user.school_id ?? null,
    xp: user.xp ?? 0,
    level: user.level ?? 1,
    cefrLevel: user.cefr_level ?? "",
  };
}
