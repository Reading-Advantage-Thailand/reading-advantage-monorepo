import { NextRequest } from "next/server";
import { saveArticleAsDraft } from "@/server/controllers/articleController";

export async function POST(req: NextRequest) {
  return await saveArticleAsDraft(req);
}
