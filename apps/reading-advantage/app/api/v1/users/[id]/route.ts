import { getUser, updateUser } from "@/server/controllers/user-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextRequest } from "next/server";
import { handleRequest } from "@/server/utils/handle-request";
import { protect } from "@/server/controllers/auth-controller";

export interface Context {
  params: Promise<{
    id: string;
  }>;
}

const router = createEdgeRouter<NextRequest, Context>();

// Middleware
router.use(logRequest);
router.use(protect);

// /api/users/[id]
router.get(getUser) as any;
router.patch(updateUser) as any;

export const GET = (request: NextRequest, ctx: Context) =>
  handleRequest(router, request, ctx);

export const PATCH = (request: NextRequest, ctx: Context) =>
  handleRequest(router, request, ctx);
