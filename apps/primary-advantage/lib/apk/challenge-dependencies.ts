import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import { createClassChallenge, listClassChallenges, listOwnedChallengeClasses, listStudentChallengeClasses, startClassChallengeRun } from "@reading-advantage/domain/challenges";
import { CARTRIDGE_CHALLENGE_CAPABILITIES, cartridgeLoaders } from "@reading-advantage/game-cartridges";
import type { ApkChallengeRouteDependencies } from "@reading-advantage/api/routes/apk-challenges";

import { getCurrentUser } from "@/lib/session";

/** Primary host dependencies for authenticated APK challenge routes. */
export const apkChallengeDependencies: ApkChallengeRouteDependencies = {
  sessionCookieName: "session_token",
  validateSession: async () => {
    const user = await getCurrentUser();
    return user ? { user } : null;
  },
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
    return (await loader()).manifest.inputMode === declared.inputMode ? declared : undefined;
  },
};
