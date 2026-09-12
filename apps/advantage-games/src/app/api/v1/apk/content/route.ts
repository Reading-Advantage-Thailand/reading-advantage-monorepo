import { apkContentDependencies } from "@/lib/apk/content-dependencies";
import { createApkContentRoute } from "@/lib/apk/content-route";

/** Run authenticated content queries in the Node.js runtime. */
export const runtime = "nodejs";

/** Prevent student-owned learning content from static generation. */
export const dynamic = "force-dynamic";

/** Authenticated, tenant-scoped APK learning-content GET handler. */
export const { GET } = createApkContentRoute(apkContentDependencies);
