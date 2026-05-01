import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await currentUser();
  const body = await req.json();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const article = await prisma.article.findUnique({
    where: { id },
  });

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }
  console.log(body);

  return NextResponse.json({ message: "Article saved" }, { status: 200 });
}
