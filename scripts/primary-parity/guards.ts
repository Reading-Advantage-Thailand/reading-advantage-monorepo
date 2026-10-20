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
/** The matched copies of the acceptance run. The kit may read them; it never writes to them. */
const MATCHED_COPIES = new Set(["primary_legacy_20261011", "primary_parity_20261011"]);
/** Database names that the kit never accepts. */
const PROTECTED_DATABASES = new Set([
  "primary_advantage",
  "primary_legacy_20261007",
  "primary_legacy_20261008",
  "primary_legacy_20261006",
  "primary_etl_20261007",
  "primary_rehearsal1_20261008",
  "primary_rehearsal2_20261010",
  "primary_etl_prod",
]);

/** Input of `assertGuards`. */
export interface GuardInput {
  legacyUrl: string;
  newUrl: string;
  legacyQuery: ReadOnlyQuery;
  newQuery: ReadOnlyQuery;
  baseUrls: string[];
  outputFiles: string[];
  /** The URLs that the tool writes to. A written database name must hold `_run_`. */
  writeTargets?: ("legacy" | "new")[];
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

/**
 * Refuses a database URL that is remote, a unix socket, a protected copy, or (for a write) not a `_run_` copy.
 * @param raw The database URL.
 * @param mode `read` keeps the matched copies readable; `write` needs a name with `_run_`.
 * @throws GuardError `remote-host` or `shared-database`.
 */
export function checkDatabaseUrl(raw: string, mode: "read" | "write" = "read"): void {
  const url = new URL(raw);
  if (!LOCAL_HOSTS.has(url.hostname.replace(/^\[|\]$/g, "")) || url.searchParams.has("host")) {
    throw new GuardError("remote-host", `database host is not local: ${url.searchParams.has("host") ? "host search param" : url.hostname}`);
  }
  const name = decodeURIComponent(url.pathname.slice(1));
  if (PROTECTED_DATABASES.has(name) || (mode === "write" && MATCHED_COPIES.has(name))) {
    throw new GuardError("shared-database", `the protected database ${name} is not allowed`);
  }
  if (mode === "write" && !name.includes("_run_")) {
    throw new GuardError("shared-database", `a written database name must hold _run_, got ${name}`);
  }
}

/**
 * Runs every guard of the kit (spec FR-6) before a run.
 * @param input The two database URLs, a read-only query function for each, the base URLs, and the output files.
 * @throws GuardError with a code for the first failed guard.
 */
export async function assertGuards(input: GuardInput): Promise<void> {
  checkDatabaseUrl(input.legacyUrl, input.writeTargets?.includes("legacy") ? "write" : "read");
  checkDatabaseUrl(input.newUrl, input.writeTargets?.includes("new") ? "write" : "read");
  if ((await findLegacyDatabaseMarkers(input.legacyQuery)).length === 0) {
    throw new GuardError("legacy-marker-missing", "the legacy database URL has no legacy marker table");
  }
  if ((await findLegacyDatabaseMarkers(input.newQuery)).length > 0) {
    throw new GuardError("legacy-marker-present", "the new database URL has a legacy marker table");
  }
  input.baseUrls.forEach(assertLocalBaseUrl);
  assertOutsideRepository(input.outputFiles);
}
