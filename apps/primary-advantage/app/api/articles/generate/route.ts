import { generateAllArticle } from "@/server/controllers/articleController";
import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { amountPerGenre } = await req.json();
    await generateAllArticle(amountPerGenre);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 404 }
    );
  }
}
