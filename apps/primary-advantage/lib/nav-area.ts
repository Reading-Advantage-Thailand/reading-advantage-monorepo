/** Signed-in areas that have their own navigation. */
export type NavArea = "student" | "teacher" | "admin" | "system";

const ROLE_AREAS: Record<string, NavArea> = {
  STUDENT: "student",
  TEACHER: "teacher",
  ADMIN: "admin",
  SYSTEM: "system",
};

/**
 * Finds the nav area that matches a session role (used by shared pages such as settings).
 * @param role The session role in any casing.
 * @returns The area, or null for roles that have no Primary navigation.
 */
export function areaForRole(role: string | null | undefined): NavArea | null {
  return ROLE_AREAS[(role ?? "").toUpperCase()] ?? null;
}

/** A nav item reduced to its key and the path prefixes that make it active. */
export interface ActiveCandidate {
  key: string;
  prefixes: string[];
}

/**
 * Picks the one active item for a path: the longest prefix that equals the path or
 * contains it as a parent folder. When two items share that prefix, the later item wins.
 * @param items The items with their prefixes.
 * @param pathname The current path without the locale.
 * @returns The key of the active item, or null when no item matches.
 */
export function activeKey(items: ActiveCandidate[], pathname: string): string | null {
  let best: { key: string; length: number } | null = null;
  for (const item of items) {
    for (const prefix of item.prefixes) {
      const matches = pathname === prefix || pathname.startsWith(`${prefix}/`);
      if (matches && (!best || prefix.length >= best.length)) best = { key: item.key, length: prefix.length };
    }
  }
  return best?.key ?? null;
}
