import { protect } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";
import { EnchantedLibraryController } from "@/server/controllers/enchanted-library-controller";

const router = createEdgeRouter<NextRequest, {}>();

router.use(logRequest);
router.use(protect);

const getVocabularyHandler = EnchantedLibraryController.getVocabulary;
router.get(getVocabularyHandler as any);

export async function GET(request: NextRequest) {
  return router.run(request, {}) as Promise<Response>;
}
