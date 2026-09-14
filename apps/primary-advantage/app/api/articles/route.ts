import { fetchArticles } from "@/server/controllers/articleController";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articles, totalArticles } = await fetchArticles(
      req.nextUrl.searchParams
    );

    return NextResponse.json({ articles, totalArticles }, { status: 200 });
  } catch (error) {
    return new Response("Error", { status: 500 });
  }
}
