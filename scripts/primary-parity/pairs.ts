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

/** A path that starts with a locale segment, for example `/en/system/dashboard`. */
const PagePath = z.string().regex(/^\/[a-z]{2}(\/|$)/, "path must start with a locale, for example /en/...");

/** One observable behavior that a person checks in the report. */
export const Check = z
  .object({
    id: z.string().min(1),
    behavior: z.string().min(1),
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

export type PairListInput = z.input<typeof PairList>;
export type PairListData = z.output<typeof PairList>;
export type PairData = z.output<typeof Pair>;
