import { protect } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";
// import { prisma } from "@/lib/prisma";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";
import { DragonFlightController } from "@/server/controllers/dragon-flight-controller";

const router = createEdgeRouter<NextRequest, {}>();

router.use(logRequest);
router.use(protect);

const getVocabularyForDragonFlight = DragonFlightController.getVocabulary;
router.get(getVocabularyForDragonFlight as any);

export async function GET(request: NextRequest) {
  const result = await router.run(request, {});
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
