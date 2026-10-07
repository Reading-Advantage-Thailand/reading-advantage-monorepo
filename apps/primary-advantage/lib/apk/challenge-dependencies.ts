import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import { createClassChallenge, listClassChallenges, listOwnedChallengeClasses, listStudentChallengeClasses, startClassChallengeRun } from "@reading-advantage/domain/challenges";
import type { ApkChallengeRouteDependencies } from "@reading-advantage/api/routes/apk-challenges";

import { challengeCapabilityOf } from "@/lib/games/catalog";
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
  // The 3D manifests declare the capability (a legacy game id resolves to its 3D game).
  resolveGameCapability: async (gameId) => challengeCapabilityOf(gameId),
};
