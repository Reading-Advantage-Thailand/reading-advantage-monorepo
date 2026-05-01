import { NextRequest, NextResponse } from "next/server";
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
  NextResponse<{ success: boolean; student?: StudentData } | { error: string }>
> => {
  try {
    console.log("Student Controller: Starting POST request...");

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
    const { name, email, cefrLevel, classroomId, password } =
      body as CreateStudentInput;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: "Missing required fields: name, email" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Create student using model
    const result = await createStudent({
      name,
      email,
      cefrLevel: cefrLevel || "A0-",
      classroomId,
      password,
      userWithRoles,
    });

    if (!result.success) {
      const status =
        result.error === "User with this email already exists" ? 409 : 400;
      return NextResponse.json(
        { error: result.error || "Internal server error" },
        { status },
      );
    }

    console.log(
      "Student Controller: Successfully created student:",
      result.student?.id,
    );
    return NextResponse.json(
      { success: true, student: result.student },
      { status: 201 },
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
    console.log("Student Controller: Getting student by ID:", id);

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

    console.log(
      "Student Controller: Successfully fetched student:",
      student.id,
    );
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
    console.log("Student Controller: Updating student:", id);

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

    // Update student using model
    const result = await updateStudent(id, updateData, userWithRoles);
    if (!result.success) {
      const status = result.error === "Student not found" ? 404 : 400;
      return NextResponse.json(
        { error: result.error || "Internal server error" },
        { status },
      );
    }

    console.log(
      "Student Controller: Successfully updated student:",
      result.student?.id,
    );
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
    console.log("Student Controller: Deleting student:", id);

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

    console.log("Student Controller: Successfully deleted student:", id);
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
