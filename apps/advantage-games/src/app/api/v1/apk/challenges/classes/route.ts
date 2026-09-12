import { apkChallengeDependencies } from "@/lib/apk/challenge-dependencies";
import { createApkChallengeClassesRoute } from "@/lib/apk/challenge-route";

export const runtime = "nodejs";

export const { GET } = createApkChallengeClassesRoute(apkChallengeDependencies);
