// route
// api/v1/level-test/chat

import { getCurrentUser } from "@/lib/session";
import { NextRequest } from "next/server";
import { handleLevelTestChat } from "@/server/controllers/level-test-controller";
import { ExtendedNextRequest } from "@/server/controllers/auth-controller";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  (req as ExtendedNextRequest).session = user ? { user } : undefined;
  return handleLevelTestChat(req as ExtendedNextRequest);
}
