import { createApkCompletionRoute } from "@/lib/apk/completion-route";
import { apkCompletionDependencies } from "@/lib/apk/completion-dependencies";

/** Run the completion endpoint in the Node.js runtime required by auth and PostgreSQL. */
export const runtime = "nodejs";

/** Ensure authenticated completion executes at request time and is never statically exported. */
export const dynamic = "force-dynamic";

/** Authenticated, tenant-scoped generic APK completion POST handler. */
export const { POST } = createApkCompletionRoute(apkCompletionDependencies);
