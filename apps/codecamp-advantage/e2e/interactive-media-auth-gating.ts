import fs, { constants, lstatSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

/** Supported server authentication modes for the media fixture. */
export type InteractiveMediaAuthMode = "company" | "legacy";

/** Authentication execution path selected for the media fixture. */
export type InteractiveMediaAuthPlan =
  | "company-session"
  | "legacy-credentials"
  | "blocked";

/**
 * Inputs that determine whether the media fixture has an approved auth source.
 * @property hasCompanyStorageState Whether an explicit company-session state file is configured.
 * @property hasLegacyCredentials Whether both legacy credential fields are configured.
 */
export interface InteractiveMediaAuthGate {
  hasCompanyStorageState: boolean;
  hasLegacyCredentials: boolean;
}

/**
 * Resolves an explicitly configured Playwright storage-state file under the app root.
 * @param input Relative storage-state path supplied by the test environment.
 * @param appRoot Absolute Codecamp app root that contains the state file.
 * @returns Absolute readable regular-file path, or undefined when no path is configured.
 * @throws When the path is absolute, escapes the app root, is not a regular file, or is unreadable.
 */
export function resolveMediaStorageStatePath(
  input: string | undefined,
  appRoot: string,
): string | undefined {
  const configuredPath = input?.trim();
  if (!configuredPath) return undefined;
  if (isAbsolute(configuredPath)) {
    throw new Error(
      "CODECAMP_MEDIA_STORAGE_STATE must be a relative app-contained path.",
    );
  }

  const resolvedPath = resolve(appRoot, configuredPath);
  const relativePath = relative(appRoot, resolvedPath);
  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(
      "CODECAMP_MEDIA_STORAGE_STATE must stay inside the Codecamp app root.",
    );
  }

  let configuredStat;
  try {
    configuredStat = lstatSync(resolvedPath);
  } catch {
    configuredStat = undefined;
  }
  if (configuredStat?.isSymbolicLink()) {
    throw new Error(
      "CODECAMP_MEDIA_STORAGE_STATE must not be a symlink at the configured path.",
    );
  }

  let canonicalAppRoot: string;
  let canonicalResolvedPath: string;
  try {
    canonicalAppRoot = realpathSync(appRoot);
    canonicalResolvedPath = realpathSync(resolvedPath);
  } catch {
    throw new Error(
      "CODECAMP_MEDIA_STORAGE_STATE must point to a regular readable file.",
    );
  }
  const canonicalRelativePath = relative(
    canonicalAppRoot,
    canonicalResolvedPath,
  );
  if (
    !canonicalRelativePath ||
    canonicalRelativePath === ".." ||
    canonicalRelativePath.startsWith(`..${sep}`) ||
    isAbsolute(canonicalRelativePath)
  ) {
    throw new Error(
      "CODECAMP_MEDIA_STORAGE_STATE must resolve inside the canonical Codecamp app root.",
    );
  }

  let fileIsRegular = false;
  try {
    fileIsRegular = statSync(canonicalResolvedPath).isFile();
  } catch {
    fileIsRegular = false;
  }
  if (!fileIsRegular) {
    throw new Error(
      "CODECAMP_MEDIA_STORAGE_STATE must point to a regular readable file.",
    );
  }

  try {
    fs.accessSync(canonicalResolvedPath, constants.R_OK);
  } catch {
    throw new Error(
      "CODECAMP_MEDIA_STORAGE_STATE must point to a regular readable file.",
    );
  }
  return canonicalResolvedPath;
}

/**
 * Summarizes the explicitly configured authentication inputs for the fixture.
 * @param input Legacy credentials and optional company storage-state path.
 * @returns Boolean auth-input availability used by the mode-specific plan selector.
 */
export function getInteractiveMediaAuthGate(input: {
  hasUsername: boolean;
  hasPassword: boolean;
  storageStatePath?: string;
}): InteractiveMediaAuthGate {
  return {
    hasCompanyStorageState: Boolean(input.storageStatePath),
    hasLegacyCredentials: input.hasUsername && input.hasPassword,
  };
}

/**
 * Selects an auth path without allowing company mode to post legacy credentials.
 * @param mode Validated server authentication mode.
 * @param gate Explicitly configured auth inputs.
 * @returns The only permitted auth plan for the mode and inputs.
 */
export function selectInteractiveMediaAuthPlan(
  mode: InteractiveMediaAuthMode,
  gate: InteractiveMediaAuthGate,
): InteractiveMediaAuthPlan {
  if (mode === "company") {
    return gate.hasCompanyStorageState ? "company-session" : "blocked";
  }
  return gate.hasLegacyCredentials ? "legacy-credentials" : "blocked";
}
