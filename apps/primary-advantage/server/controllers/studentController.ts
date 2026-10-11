import { NextRequest, NextResponse } from "next/server";
import { passwordSchema } from "@reading-advantage/auth";
import { currentUser } from "@/lib/session";
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentStatistics,
} from "@/server/models/studentModel";
import { validateUser, checkAdminPermissions } from "@/server/utils/auth";
import {
  StudentData,
  StudentsResponse,
  CreateStudentInput,
  UpdateStudentInput,
} from "@/types/index";

// Type for student query parameters
interface StudentQueryParams {
  page: number;
  limit: number;
  search: string;
  classroomId: string;
  cefrLevel: string;
  userWithRoles: any;
}

// GET Controller - Fetch students
export const getStudentsController = async (
  request: NextRequest,
): Promise<NextResponse<StudentsResponse | { error: string }>> => {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate user permissions
    const userWithRoles = await validateUser(user.id);
    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasPermission = await checkAdminPermissions(userWithRoles);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const classroomId = searchParams.get("classroomId") || "";
    const cefrLevel = searchParams.get("cefrLevel") || "";

    // Get students data using model
    const { students, totalCount } = await getStudents({
      page,
      limit,
      search,
      classroomId,
      cefrLevel,
      userWithRoles,
    });

    // Get statistics
    const statistics = await getStudentStatistics(userWithRoles);

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limit);
    const pagination = {
      page,
      limit,
      total: totalCount,
      totalPages,
    };

    const response: StudentsResponse = {
      students,
      statistics,
      pagination,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Student Controller: Error in getStudentsController:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// POST Controller - Create student
export const createStudentController = async (
  request: NextRequest,
): Promise<
  NextResponse<
    | { success: boolean; student?: StudentData; credentials?: { username: string; initialPassword: string | null } }
    | { error: string }
  >
> => {
  try {

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate user permissions
    const userWithRoles = await validateUser(user.id);
    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasPermission = await checkAdminPermissions(userWithRoles);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    // Students have no email (owner decision 2026-10-08).
    const { name, cefrLevel, classroomId, password, schoolId } =
      body as CreateStudentInput;

    if (password !== undefined && !passwordSchema.safeParse(password).success) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 },
      );
    }

    // Create student using model
    const result = await createStudent({
      name,
      cefrLevel: cefrLevel || "A0-",
      classroomId,
      password,
      userWithRoles,
      schoolId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Internal server error" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: true, student: result.student, credentials: result.credentials },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "Student Controller: Error in createStudentController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// GET by ID Controller - Fetch specific student
export const getStudentByIdController = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<{ student: StudentData } | { error: string }>> => {
  try {
    const { id } = await params;

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate user permissions
    const userWithRoles = await validateUser(user.id);
    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasPermission = await checkAdminPermissions(userWithRoles);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Get student by ID using model
    const student = await getStudentById(id, userWithRoles);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ student }, { status: 200 });
  } catch (error) {
    console.error(
      "Student Controller: Error in getStudentByIdController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// PUT Controller - Update student
export const updateStudentController = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<
  NextResponse<{ success: boolean; student?: StudentData } | { error: string }>
> => {
  try {
    const { id } = await params;

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate user permissions
    const userWithRoles = await validateUser(user.id);
    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasPermission = await checkAdminPermissions(userWithRoles);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const updateData = body as UpdateStudentInput;
    if (updateData.password !== undefined && !passwordSchema.safeParse(updateData.password).success) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    // Update student using model
    const result = await updateStudent(id, updateData, userWithRoles);
    if (!result.success) {
      const status = result.error === "Student not found" ? 404 : 400;
      return NextResponse.json(
        { error: result.error || "Internal server error" },
        { status },
      );
    }

    return NextResponse.json(
      { success: true, student: result.student },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Student Controller: Error in updateStudentController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// DELETE Controller - Delete student
export const deleteStudentController = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<{ success: boolean } | { error: string }>> => {
  try {
    const { id } = await params;

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate user permissions
    const userWithRoles = await validateUser(user.id);
    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasPermission = await checkAdminPermissions(userWithRoles);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Delete student using model
    const result = await deleteStudent(id, userWithRoles);
    if (!result.success) {
      const status = result.error === "Student not found" ? 404 : 400;
      return NextResponse.json(
        { error: result.error || "Internal server error" },
        { status },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(
      "Student Controller: Error in deleteStudentController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};
