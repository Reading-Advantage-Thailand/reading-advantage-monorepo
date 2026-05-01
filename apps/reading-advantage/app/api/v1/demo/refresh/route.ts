import { NextRequest, NextResponse } from "next/server";
import { createEdgeRouter } from "next-connect";
import { logRequest } from "@/server/middleware";
import { restrictAccessKey } from "@/server/controllers/auth-controller";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface RequestContext {
  params: Promise<Record<string, never>>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

// Middleware
router.use(logRequest);
router.use(restrictAccessKey);

/**
 * POST /api/v1/demo/refresh
 * Refresh demo data (requires access key)
 */
async function refreshDemoData(req: NextRequest) {
  try {
    console.log("[Demo Refresh] Starting demo data refresh...");

    // Execute the demo seed script
    const { stdout, stderr } = await execAsync("npm run db:seed:demo", {
      cwd: process.cwd(),
    });

    console.log("[Demo Refresh] Output:", stdout);
    if (stderr) {
      console.error("[Demo Refresh] Errors:", stderr);
    }

    return NextResponse.json({
      message: "Demo data refreshed successfully",
      output: stdout,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Demo Refresh] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to refresh demo data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

router.post(refreshDemoData as any);

export async function POST(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
