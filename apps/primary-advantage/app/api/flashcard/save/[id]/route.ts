import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { eq } from 'drizzle-orm';
import { articles } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';

/**
 * Confirms the caller's article exists before the client saves it locally.
 * @param req Request with the article id in params.
 * @param params Route params carrying the article id.
 * @returns The saved confirmation or a structured error response.
 */
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

  // Authorization decision via the central policy. Flashcard study serves
  // any authenticated user; article:read is the matching low-privilege
  // permission (flashcards derive from articles).
  try {
    assertCan(user, "article:read", { schoolId: user.schoolId ?? null });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const tenantDb = getTenantDB({ schoolId: user.schoolId });
  // articles is REFERENTIAL (no schoolId); single-row lookup by article id.
  const articleDb = getUnscopedDB("articles has no schoolId; single-row lookup by article id");
  const [article] = await articleDb.select().from(articles)
    .where(eq(articles.id, id))
    .limit(1);

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Article saved" }, { status: 200 });
}