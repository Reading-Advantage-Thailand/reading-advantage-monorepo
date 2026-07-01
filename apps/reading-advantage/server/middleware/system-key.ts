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
import { timingSafeEqual } from "crypto";
import { z } from "zod";

const accessKeySchema = z.string().min(1).optional();

function getValidatedAccessKey(): string | undefined {
  const parsed = accessKeySchema.safeParse(process.env.ACCESS_KEY);
  return parsed.success ? parsed.data : undefined;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Returns a 401 response when the request lacks a valid access key,
 * otherwise returns `null` to indicate the call may proceed.
 *
 * The comparison is timing-safe to avoid leaking the configured key via
 * response timing. The key is validated through Zod (non-empty string) so
 * empty/invalid env values fail closed.
 */
export function assertSystemAccess(req: NextRequest): NextResponse | null {
  const configured = getValidatedAccessKey();
  if (!configured) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Server is missing ACCESS_KEY configuration" },
      { status: 401 }
    );
  }
  const supplied = req.headers.get("Access-Key") ?? req.headers.get("access-key") ?? "";
  if (!constantTimeEqual(supplied, configured)) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Valid Access-Key header is required" },
      { status: 401 }
    );
  }
  return null;
}
