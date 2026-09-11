// route
// api/v1/level-test/placement

import { getCurrentUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { handleLevelTestPlacement } from "@/server/controllers/level-test-controller";
import { ExtendedNextRequest } from "@/server/controllers/auth-controller";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 401 },
    );
  }
  (req as ExtendedNextRequest).session = { user };
  return handleLevelTestPlacement(req as ExtendedNextRequest);
}
