import { NextRequest } from "next/server";
import { saveArticleAndPublish } from "@/server/controllers/articleController";

export async function POST(req: NextRequest) {
  return await saveArticleAndPublish(req);
}
