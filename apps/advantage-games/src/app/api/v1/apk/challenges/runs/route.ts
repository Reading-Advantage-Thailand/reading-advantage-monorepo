import { apkChallengeDependencies } from "@/lib/apk/challenge-dependencies";
import { createApkChallengeRunRoute } from "@/lib/apk/challenge-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { POST } = createApkChallengeRunRoute(apkChallengeDependencies);
