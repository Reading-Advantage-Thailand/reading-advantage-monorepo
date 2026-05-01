import { NextRequest, NextResponse } from "next/server";
import {
  getTeachersController,
  createTeacherController,
} from "@/server/controllers/teacherController";

// GET /api/teachers - Fetch teachers data for admin
export async function GET(request: NextRequest) {
  return await getTeachersController(request);
}

// POST /api/teachers - Create new teacher
export async function POST(request: NextRequest) {
  return await createTeacherController(request);
}
