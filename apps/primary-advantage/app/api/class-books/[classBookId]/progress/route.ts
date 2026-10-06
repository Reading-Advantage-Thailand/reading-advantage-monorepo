import { NextRequest, NextResponse } from "next/server";
import { exportClassBookProgress } from "@/server/controllers/classBookController";
import { currentUser } from "@/lib/session";

/**
 * GET /api/class-books/[classBookId]/progress
 * The class grid of a class book as CSV (FR-6 export), for the teachers of the class.
 * @param _req The request.
 * @param context The route params with the class book id.
 * @returns The CSV file, 401 without a user, 403 when the user may not manage the class.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ classBookId: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { classBookId } = await params;
  try {
    const { csv, bookKey } = await exportClassBookProgress(user, classBookId);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="class-book-${bookKey}-progress.csv"`,
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("API Error - GET /api/class-books/[classBookId]/progress:", error);
    return NextResponse.json({ error: "Failed to export class progress" }, { status: 500 });
  }
}
