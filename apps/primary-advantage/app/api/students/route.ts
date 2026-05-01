import { NextRequest, NextResponse } from "next/server";
import {
  getStudentsController,
  createStudentController,
} from "@/server/controllers/studentController";

// GET /api/students - Fetch students data for admin
export async function GET(request: NextRequest) {
  return await getStudentsController(request);
}

// POST /api/students - Create new student
export async function POST(request: NextRequest) {
  return await createStudentController(request);
}
