import {
  SESSION_COOKIE_NAME,
  validateSession,
} from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain/db-contract";
import {
  createConfiguredSpeechObjectResolver,
  createStoredSpeechClipLookup,
  listGameLearningContent,
} from "@reading-advantage/domain/games";
import { getStorageClient } from "@reading-advantage/storage";

import type { ApkContentRouteDependencies } from "./content-route";

/** Environment key for the reviewed Wizard speech object manifest. */
export const WIZARD_SPEECH_MANIFEST_ENV = "APK_WIZARD_SPEECH_MANIFEST";

/**
 * Creates the configured Wizard lookup through the internal storage adapter.
 * @returns A prepared clip lookup, or undefined when listening is not configured.
 */
export function getWizardSpeechLookup() {
  const manifest = process.env[WIZARD_SPEECH_MANIFEST_ENV];
  if (!manifest) return undefined;
  return createStoredSpeechClipLookup({
    storage: getStorageClient(),
    resolveObject: createConfiguredSpeechObjectResolver(manifest),
  });
}

/** Production dependencies for the authenticated APK content route. */
export const apkContentDependencies: ApkContentRouteDependencies = {
  sessionCookieName: SESSION_COOKIE_NAME,
  validateSession: (token) => validateSession(db, token),
  createTenantDb: (schoolId) => createTenantDB(db, { schoolId }),
  listContent: listGameLearningContent,
  getSpeechLookup: getWizardSpeechLookup,
};
