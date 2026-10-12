import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { findLegacyDatabaseMarkers, type ReadOnlyQuery } from "../../packages/db/src/legacy-db-guard.js";

/** Reason codes of a refusal. */
export type GuardCode =
  | "remote-host"
  | "shared-database"
  | "legacy-marker-missing"
  | "legacy-marker-present"
  | "remote-base-url"
  | "output-in-repository";

/** A refusal of the kit. The message never holds a database password. */
export class GuardError extends Error {
  /**
   * @param code The reason code.
   * @param message A short reason with no secret.
   */
  constructor(
    readonly code: GuardCode,
    message: string,
  ) {
    super(message);
    this.name = "GuardError";
  }
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const SHARED_DATABASE = "primary_advantage";

/** Input of `assertGuards`. */
export interface GuardInput {
  legacyUrl: string;
  newUrl: string;
  legacyQuery: ReadOnlyQuery;
  newQuery: ReadOnlyQuery;
  baseUrls: string[];
  outputFiles: string[];
}

/**
 * Refuses a base URL that is not `http://localhost:<port>` (or 127.0.0.1 or ::1).
 * @param base The app base URL.
 * @throws GuardError `remote-base-url`.
 */
export function assertLocalBaseUrl(base: string): void {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new GuardError("remote-base-url", "base URL is not a valid URL");
  }
  if (url.protocol !== "http:" || !url.port || !LOCAL_HOSTS.has(url.hostname.replace(/^\[|\]$/g, ""))) {
    throw new GuardError("remote-base-url", `base URL must be http://localhost:<port>, got ${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}`);
  }
}

/**
 * Refuses an output file that has a `.git` folder in one of its parent folders.
 * @param files The files that the kit writes.
 * @throws GuardError `output-in-repository`.
 */
export function assertOutsideRepository(files: string[]): void {
  for (const file of files) {
    for (let dir = dirname(resolve(file)); ; dir = dirname(dir)) {
      if (existsSync(join(dir, ".git"))) throw new GuardError("output-in-repository", `output file is inside a git repository: ${dir}`);
      if (dirname(dir) === dir) break;
    }
  }
}

function checkDatabaseUrl(raw: string): void {
  const url = new URL(raw);
  if (!LOCAL_HOSTS.has(url.hostname.replace(/^\[|\]$/g, ""))) {
    throw new GuardError("remote-host", `database host is not local: ${url.hostname}`);
  }
  if (decodeURIComponent(url.pathname.slice(1)) === SHARED_DATABASE) {
    throw new GuardError("shared-database", `the shared database ${SHARED_DATABASE} is not allowed`);
  }
}

/**
 * Runs every guard of the kit (spec FR-6) before a run.
 * @param input The two database URLs, a read-only query function for each, the base URLs, and the output files.
 * @throws GuardError with a code for the first failed guard.
 */
export async function assertGuards(input: GuardInput): Promise<void> {
  checkDatabaseUrl(input.legacyUrl);
  checkDatabaseUrl(input.newUrl);
  if ((await findLegacyDatabaseMarkers(input.legacyQuery)).length === 0) {
    throw new GuardError("legacy-marker-missing", "the legacy database URL has no legacy marker table");
  }
  if ((await findLegacyDatabaseMarkers(input.newQuery)).length > 0) {
    throw new GuardError("legacy-marker-present", "the new database URL has a legacy marker table");
  }
  input.baseUrls.forEach(assertLocalBaseUrl);
  assertOutsideRepository(input.outputFiles);
}
