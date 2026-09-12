import { SESSION_COOKIE_NAME, validateSession } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain/db-contract";
import { createClassChallenge, listClassChallenges, listOwnedChallengeClasses, listStudentChallengeClasses, startClassChallengeRun } from "@reading-advantage/domain/challenges";
import { CARTRIDGE_CHALLENGE_CAPABILITIES, cartridgeLoaders } from "@reading-advantage/game-cartridges";

import type { ApkChallengeRouteDependencies } from "./challenge-route";

/** Production dependencies for authenticated APK challenge routes. */
export const apkChallengeDependencies: ApkChallengeRouteDependencies = {
  sessionCookieName: SESSION_COOKIE_NAME,
  validateSession: (token) => validateSession(db, token),
  createTenantDb: (schoolId) => createTenantDB(db, { schoolId }),
  createChallenge: createClassChallenge,
  listChallenges: listClassChallenges,
  listStudentClasses: listStudentChallengeClasses,
  listTeacherClasses: listOwnedChallengeClasses,
  startRun: startClassChallengeRun,
  resolveGameCapability: async (gameId) => {
    const declared = CARTRIDGE_CHALLENGE_CAPABILITIES[gameId];
    const loader = cartridgeLoaders[gameId as keyof typeof cartridgeLoaders];
    if (!declared || !loader) return undefined;
    const cartridge = await loader();
    return cartridge.manifest.inputMode === declared.inputMode ? declared : undefined;
  },
};
