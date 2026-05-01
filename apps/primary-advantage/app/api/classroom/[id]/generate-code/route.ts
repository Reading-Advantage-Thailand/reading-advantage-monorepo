import { NextRequest, NextResponse } from "next/server";
import { generateClassCodeController } from "@/server/controllers/classroomController";

// POST /api/classroom/[id]/generate-code - Generate a new class code
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await generateClassCodeController(req, { params });
}

