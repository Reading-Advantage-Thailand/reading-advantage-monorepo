import { fetchArticleById } from "@/server/controllers/articleController";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const articles = await fetchArticleById(req.nextUrl.searchParams);

    return NextResponse.json({ articles }, { status: 200 });
  } catch (error) {
    return new Response("Error", { status: 500 });
  }
}
