import { fetchStudentsByRole } from "@/server/controllers/classroomController";

// GET /api/classroom/students - Get students based on user role (system sees all, teacher sees only their students)
export async function GET() {
  return await fetchStudentsByRole();
}
