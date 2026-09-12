import { apkChallengeDependencies } from "@/lib/apk/challenge-dependencies";
import { createApkChallengeTeacherClassesRoute } from "@/lib/apk/challenge-route";

export const runtime = "nodejs";

export const { GET } = createApkChallengeTeacherClassesRoute(apkChallengeDependencies);
