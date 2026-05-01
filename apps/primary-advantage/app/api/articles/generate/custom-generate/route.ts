import {
  generateCustomArticle,
  fetchCustomArticleController,
} from "@/server/controllers/articleController";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return await fetchCustomArticleController(req);
}

export async function POST(req: NextRequest) {
  return await generateCustomArticle(req);
}
