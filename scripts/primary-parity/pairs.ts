import { z } from "zod";

/** Roles that a pair can use. `PUBLIC` means no sign-in. */
export const PairRole = z.enum(["SYSTEM", "ADMIN", "TEACHER", "STUDENT", "PUBLIC"]);

/** The roles that need a sign-in (all roles except `PUBLIC`). */
export const SignedInRole = z.enum(["SYSTEM", "ADMIN", "TEACHER", "STUDENT"]);

/**
 * Placeholder grammar for `legacyPath` and `newPath`.
 *
 * - `{map:<table>:<legacyId>}` becomes the new id from `primary_legacy_id_map`.
 * - `{user:<ROLE>}` becomes the matched user id of that role.
 *
 * @example
 * "/en/student/read/{map:article:abc123}" and "/en/teacher/students/{user:STUDENT}"
 */
export type Placeholder =
  | `{map:${string}:${string}}`
  | `{user:${"SYSTEM" | "ADMIN" | "TEACHER" | "STUDENT"}}`;

/** Matches one placeholder in a path. Groups: 1 = map table, 2 = map legacy id, 3 = user role. */
export const PLACEHOLDER_PATTERN = /\{(?:map:([A-Za-z0-9_]+):([^{}:\s]+)|user:([A-Z]+))\}/g;

/** Query keys that must never appear in a pair path. */
const SECRET_QUERY_KEY = /pass(word|wd)?|secret|token|class_?code/i;

/** A path that starts with a locale segment, for example `/en/system/dashboard`. */
const PagePath = z
  .string()
  .regex(/^\/[a-z]{2}(\/|$)/, "path must start with a locale, for example /en/...")
  .refine((p) => ![...new URLSearchParams(p.split("?")[1] ?? "").keys()].some((k) => SECRET_QUERY_KEY.test(k)), {
    message: "path must not carry a password, token, or class code in the query",
  });

/** One observable behavior that a person checks in the report. */
export const Check = z
  .object({
    id: z.string().min(1),
    behavior: z.string().min(1),
    /** Optional regular expression (source text). The capture lists the request paths that match it. */
    network: z
      .string()
      .refine((p) => {
        try {
          new RegExp(p);
          return true;
        } catch {
          return false;
        }
      }, "network must be a valid regular expression")
      .optional(),
  })
  .strict();

/** One legacy page and one new page that do the same job. */
export const Pair = z
  .object({
    id: z.string().min(1),
    rows: z.array(z.string().min(1)).min(1),
    role: PairRole,
    legacyPath: PagePath,
    newPath: PagePath,
    widths: z.array(z.number().int().positive()).min(1).default([375, 1280]),
    colorSchemes: z.array(z.enum(["light", "dark"])).min(1).default(["light"]),
    waitFor: z.object({ legacy: z.string().optional(), new: z.string().optional() }).strict().optional(),
    /**
     * The matched user (`users.id`) and the classroom (new classroom id) that the pair needs.
     * The capture refuses to run the pair when the accounts file holds another user or class.
     */
    requires: z.object({ userId: z.string().min(1).optional(), classroomId: z.string().min(1).optional() }).strict().optional(),
    /** Path of a module (relative to the pairs file) that exports `legacy(page)` and `new(page)`. */
    steps: z.string().optional(),
    checks: z.array(Check).min(1),
  })
  .strict();

/**
 * The file `measure/tracks/<member>/acceptance-pairs.json`.
 * It holds no name, no password, and no class code. Unknown fields fail the parse.
 */
export const PairList = z
  .object({
    member: z.string().min(1),
    pairs: z.array(Pair).min(1),
  })
  .strict()
  .refine((l) => new Set(l.pairs.map((p) => p.id)).size === l.pairs.length, {
    message: "pair ids must be unique",
  });

/** Input type of the pair list (before the defaults apply). */
export type PairListInput = z.input<typeof PairList>;
/** Parsed pair list (after the defaults apply). */
export type PairListData = z.output<typeof PairList>;
/** One parsed pair. */
export type PairData = z.output<typeof Pair>;

/** Lookups that `resolvePlaceholders` uses. */
export interface PlaceholderContext {
  /** Returns the new id for a legacy id of a legacy table, or undefined when no row exists. */
  map: (table: string, legacyId: string) => string | undefined;
  /** The matched user id of each signed-in role. */
  users: Partial<Record<z.output<typeof SignedInRole>, string>>;
}

/**
 * Replaces each `{map:<table>:<legacyId>}` and `{user:<ROLE>}` placeholder in a path.
 * @param path A pair path, with or without placeholders.
 * @param context The lookups for the map and the users.
 * @returns The path with every placeholder replaced.
 * @throws When a placeholder has an unknown kind or role, or when a lookup finds no value.
 * @example
 * resolvePlaceholders("/en/teacher/students/{user:STUDENT}", { map, users: { STUDENT: "u1" } });
 */
export function resolvePlaceholders(path: string, context: PlaceholderContext): string {
  return path.replace(/\{([^{}]*)\}/g, (_whole, body: string) => {
    const [kind, a, b] = body.split(":");
    if (kind === "map" && a && b) {
      const id = context.map(a, b);
      if (!id) throw new Error(`no map row for ${a}:${b}`);
      return id;
    }
    if (kind === "user" && a && b === undefined) {
      const role = SignedInRole.safeParse(a);
      if (!role.success) throw new Error(`unknown role in placeholder: ${a}`);
      const id = context.users[role.data];
      if (!id) throw new Error(`no matched user for role ${a}`);
      return id;
    }
    throw new Error(`unknown placeholder kind: ${kind}`);
  });
}

/**
 * Lists the roles that one capture run must sign in for, over several pair lists.
 * @param lists The pair lists of the members in the run.
 * @param app The app under capture; a new-app STUDENT sign-in also needs the TEACHER.
 * @returns The roles without `PUBLIC`, without duplicates.
 */
export function rolesNeeded(lists: PairListData[], app: "legacy" | "new"): Exclude<PairData["role"], "PUBLIC">[] {
  const roles = new Set(lists.flatMap((l) => l.pairs.map((p) => p.role)));
  if (app === "new" && roles.has("STUDENT")) roles.add("TEACHER");
  roles.delete("PUBLIC");
  return [...roles] as Exclude<PairData["role"], "PUBLIC">[];
}

/**
 * Reduces a request URL to its path, so that no query string (a possible token) is stored.
 * @param url An absolute request URL.
 * @returns The path, or the input when it is not a URL.
 */
export function requestPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * Selects the request paths that match a check pattern.
 * @param paths Request paths seen during a page capture.
 * @param pattern The `network` regular expression of a check.
 * @returns The distinct matching paths in first-seen order.
 */
export function matchRequests(paths: string[], pattern: string): string[] {
  const re = new RegExp(pattern);
  return [...new Set(paths.filter((p) => re.test(p)))];
}

/**
 * Tells whether the legacy proxy sent the page to sign-in because it saw an expired session.
 * @param url The final URL of a page capture.
 * @returns True when the URL is the sign-in page with `session=expired`.
 */
export function isExpiredRedirect(url: string): boolean {
  try {
    const u = new URL(url);
    return u.pathname.endsWith("/auth/signin") && u.searchParams.get("session") === "expired";
  } catch {
    return false;
  }
}

/**
 * Compares the `requires` of a pair with the accounts file entry of its role.
 * @param pair The pair (id, role, and optional requires).
 * @param entries The accounts file entries by role.
 * @returns A refusal message that names the pair, or undefined when the accounts match or the pair has no `requires`.
 */
export function checkRequires(
  pair: { id: string; role: string; requires?: { userId?: string; classroomId?: string } },
  entries: Record<string, { userId: string; new: { classroomId?: string } } | undefined>,
): string | undefined {
  const need = pair.requires;
  if (!need) return undefined;
  const entry = entries[pair.role];
  if (need.userId && entry?.userId !== need.userId) {
    return `pair ${pair.id} (role ${pair.role}) needs user ${need.userId}, but the accounts file has another user`;
  }
  if (need.classroomId && entry?.new.classroomId !== need.classroomId) {
    return `pair ${pair.id} (role ${pair.role}) needs class ${need.classroomId}, but the accounts file has another class`;
  }
  return undefined;
}

/**
 * Tells whether the final URL of a capture has another path than the request.
 * A placeholder in the requested path matches one path segment. The query and the host are ignored.
 * @param requested The pair path, with or without placeholders.
 * @param finalUrl The final URL after redirects.
 * @returns True when the paths differ.
 */
export function pathMismatch(requested: string, finalUrl: string): boolean {
  const want = requested.split("?")[0].replace(/\/+$/, "");
  const got = requestPath(finalUrl).replace(/\/+$/, "");
  const re = new RegExp("^" + want.split(/\{[^{}]*\}/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^/]+") + "$");
  return !re.test(got);
}
