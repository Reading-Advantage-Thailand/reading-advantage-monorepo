import { createApkChallengeClassesRoute } from "@reading-advantage/api/routes/apk-challenges";
import { apkChallengeDependencies } from "@/lib/apk/challenge-dependencies";

export const runtime = "nodejs";

export const { GET } = createApkChallengeClassesRoute(apkChallengeDependencies);
