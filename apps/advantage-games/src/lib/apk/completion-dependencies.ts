import {
  SESSION_COOKIE_NAME,
  validateSession,
} from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import { recordGameCompletion } from "@reading-advantage/domain/games";
import type { ApkCompletionRouteDependencies } from "./completion-route";

/** Production dependencies for the authenticated APK completion route. */
export const apkCompletionDependencies: ApkCompletionRouteDependencies = {
  sessionCookieName: SESSION_COOKIE_NAME,
  validateSession: (token) => validateSession(db, token),
  createTenantDb: (schoolId) => createTenantDB(db, { schoolId }),
  recordCompletion: recordGameCompletion,
};
