/**
 * Automated refresh endpoint for Cloud Scheduler
 *
 * This endpoint uses restrictAccessKey for authentication (no user login required)
 * Designed to be called by Google Cloud Scheduler daily
 *
 * Refreshes AI insights for all active users, classrooms, and licenses
 */

import {
  refreshAIInsightsAutomated,
  getAIInsightsRefreshStatus,
} from "@/server/controllers/ai-insight-refresh-controller";
import { NextRequest, NextResponse } from "next/server";
import { restrictAccessKey } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";

interface ExtendedNextRequest {
  params: Promise<Record<string, never>>;
}

const router = createEdgeRouter<NextRequest, ExtendedNextRequest>();

// Middleware - only access key required (for Cloud Scheduler)
router.use(logRequest);
router.use(restrictAccessKey);

// GET: Health check and status (for monitoring)
router.get(getAIInsightsRefreshStatus) as any;

// POST: Refresh all AI insights
router.post(refreshAIInsightsAutomated) as any;

export async function GET(request: NextRequest, ctx: ExtendedNextRequest) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

export async function POST(request: NextRequest, ctx: ExtendedNextRequest) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
