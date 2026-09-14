import { generateAllArticle } from "@/server/controllers/articleController";
import { NextResponse, NextRequest } from "next/server";
import { currentUser } from "@/lib/session";
import { amountPerGenreSchema, canRunContentTooling } from "@/lib/authorization";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canRunContentTooling(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { amountPerGenre } = await req.json();
    const parsed = amountPerGenreSchema.safeParse(amountPerGenre);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "amountPerGenre must be an integer from 1 to 10" },
        { status: 400 },
      );
    }
    await generateAllArticle(parsed.data);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 404 }
    );
  }
}
