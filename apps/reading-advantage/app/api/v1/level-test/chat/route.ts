// route
// api/v1/level-test/chat

import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { handleLevelTestChat } from "@/server/controllers/level-test-controller";
import { ExtendedNextRequest } from "@/server/controllers/auth-controller";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  (req as ExtendedNextRequest).session = session ?? undefined;
  return handleLevelTestChat(req as ExtendedNextRequest);
}
