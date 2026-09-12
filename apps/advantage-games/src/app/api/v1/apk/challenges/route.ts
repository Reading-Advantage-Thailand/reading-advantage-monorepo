import { apkChallengeDependencies } from "@/lib/apk/challenge-dependencies";
import { createApkChallengeRoute } from "@/lib/apk/challenge-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET, POST } = createApkChallengeRoute(apkChallengeDependencies);
