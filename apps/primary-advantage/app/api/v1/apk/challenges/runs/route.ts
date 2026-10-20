import { createApkChallengeRunRoute } from "@reading-advantage/api/routes/apk-challenges";
import { apkChallengeDependencies } from "@/lib/apk/challenge-dependencies";
import { getCurrentUser } from "@/lib/session";
import { guardStudentRoute } from "@/lib/student-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createApkChallengeRunRoute(apkChallengeDependencies);

/**
 * Starts a challenge run. Staff in Preview mode get 403 `PREVIEW_READ_ONLY`; a missing session
 * falls through to the shared handler, which answers 401.
 * @param request The request with the run body.
 * @returns The shared handler response, or the preview refusal.
 */
export async function POST(request: Parameters<typeof handlers.POST>[0]) {
  const user = await getCurrentUser();
  if (user) {
    const preview = guardStudentRoute(user, "apk_challenge_run");
    if (preview) return preview;
  }
  return handlers.POST(request);
}
