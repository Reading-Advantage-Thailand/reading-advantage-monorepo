/**
 * The week loader of the at-home app (spec FR-5, plan tasks 3.1 and 3.1a).
 *
 * The route reads one received week from the content folder, parses it with the app contract, and
 * reports a file that is absent, a file that holds no JSON, and a week that breaks the contract as
 * three separate results. The route maps each result to the HTTP status 404.
 *
 * A published week with a media part that is not approved is blocked like a draft week, and the log
 * names each part (spec FR-5, AC-5.5). `STORYTIME_SHOW_DRAFT_MEDIA=1` shows the draft parts on the
 * review copy. The switch never opens an unpublished week and never opens a week with a missing
 * picture. It is a server-side value, never a `NEXT_PUBLIC_` one.
 *
 * `STORYTIME_CONTENT_DIR` moves the content folder for the review fixture (test strategy P3.7).
 * The value stays on the server: no request can set it. The default folder sits next to the app,
 * because the standalone server changes into the app folder at start.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { weekSchema, type StorytimeWeek } from "./contracts/week";
import { mediaPartsNotApproved, missingPagePictures, readinessBlocker } from "./readiness";

/** The environment value that moves the content folder. */
export const CONTENT_DIRECTORY_ENV = "STORYTIME_CONTENT_DIR";

/** The environment value that shows draft media on the review copy. */
export const DRAFT_MEDIA_ENV = "STORYTIME_SHOW_DRAFT_MEDIA";

/**
 * Reports whether the review copy shows draft media.
 * @returns `true` only when `STORYTIME_SHOW_DRAFT_MEDIA` holds the value `1`.
 */
export function showDraftMedia(): boolean {
  return process.env[DRAFT_MEDIA_ENV] === "1";
}

/**
 * Gives the folder that holds the received weeks.
 * @returns The absolute content folder.
 */
export function contentDirectory(): string {
  return process.env[CONTENT_DIRECTORY_ENV] || resolve(process.cwd(), "content");
}

/**
 * Gives the file of one week.
 * @param level The Storytime level.
 * @param week The week of the level.
 * @returns The absolute file path.
 */
export function weekFile(level: number, week: number): string {
  return resolve(contentDirectory(), `l${level}`, `w${String(week).padStart(2, "0")}.json`);
}

/** The result of one load: the week, an absent file, or a week that breaks the contract. */
export type WeekLoad =
  | { kind: "ok"; week: StorytimeWeek }
  | { kind: "absent" }
  | { kind: "invalid"; issues: string };

/**
 * Loads and parses one week.
 * @param level The Storytime level.
 * @param week The week of the level.
 * @returns The parsed week, `absent` when the file does not exist, or `invalid` with the issue
 * paths when the file holds no JSON or breaks the contract.
 * @throws When the file exists and the read fails for another reason than absence.
 */
export async function loadWeek(level: number, week: number): Promise<WeekLoad> {
  const path = weekFile(level, week);
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { kind: "absent" };
    throw error;
  }

  let source: unknown;
  try {
    source = JSON.parse(text);
  } catch {
    return { kind: "invalid", issues: "the file holds no JSON" };
  }

  const parsed = weekSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(week)"}: ${issue.message}`)
      .join("; ");
    return { kind: "invalid", issues };
  }
  return { kind: "ok", week: parsed.data };
}

/**
 * Loads one week that a child may see (spec FR-5, AC-5.4, AC-5.5).
 *
 * The route calls this function and answers 404 when it returns `null`. The log line names the
 * reason: `absent`, `invalid`, `draft`, `missing_picture`, or `media_not_approved` with each part
 * that is not approved. With `STORYTIME_SHOW_DRAFT_MEDIA=1`, a week with draft media is visible,
 * and the log names the draft parts. The switch never overrides an unpublished week and never
 * overrides a week with a missing picture.
 * @param level The Storytime level.
 * @param week The week of the level.
 * @returns The week, or `null` when the week is absent, invalid, not published, and not ready.
 */
export async function loadVisibleWeek(level: number, week: number): Promise<StorytimeWeek | null> {
  const loaded = await loadWeek(level, week);
  if (loaded.kind !== "ok") {
    console.warn(`storytime week st${level}/${week} blocked: ${loaded.kind}`);
    return null;
  }

  const key = loaded.week.meta.key;
  const blocker = readinessBlocker(loaded.week);
  if (blocker === null) return loaded.week;

  if (blocker === "media_not_approved") {
    const parts = mediaPartsNotApproved(loaded.week).join(", ");
    if (showDraftMedia()) {
      console.warn(`storytime week ${key} shows draft media: ${parts}`);
      return loaded.week;
    }
    console.warn(`storytime week ${key} blocked: media_not_approved (${parts})`);
    return null;
  }

  const missing = missingPagePictures(loaded.week).length;
  console.warn(
    blocker === "missing_picture"
      ? `storytime week ${key} blocked: missing_picture (${missing} page pictures without a file)`
      : `storytime week ${key} blocked: draft`,
  );
  return null;
}
