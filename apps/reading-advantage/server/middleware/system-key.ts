/**
 * System Access Key Guard
 *
 * The Cloud Scheduler endpoints (/api/v1/system/refresh-views,
 * /api/v1/ai/insights/refresh, /api/v1/articles/generate) are intentionally
 * callable without a logged-in user because they are triggered by the cloud
 * scheduler. The trade-off is that they MUST be guarded by a shared secret
 * carried in the `Access-Key` header.
 *
 * The same secret is normally enforced by `restrictAccessKey` in the route
 * middleware, but tests invoke the controller functions directly — bypassing
 * that middleware. To fail closed regardless of how the controller is reached,
 * we enforce the same header check inside the controller.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Returns a 401 response when the request lacks a valid access key,
 * otherwise returns `null` to indicate the call may proceed.
 */
export function assertSystemAccess(req: NextRequest): NextResponse | null {
  const configured = process.env.ACCESS_KEY;
  if (!configured) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Server is missing ACCESS_KEY configuration" },
      { status: 401 }
    );
  }
  const supplied = req.headers.get("Access-Key") ?? req.headers.get("access-key");
  if (supplied !== configured) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Valid Access-Key header is required" },
      { status: 401 }
    );
  }
  return null;
}
