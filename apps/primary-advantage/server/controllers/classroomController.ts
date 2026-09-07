import { NextRequest, NextResponse } from "next/server";
import {
  createClassroom,
  updateClassroom,
  deleteClassroom,
  getAllClassrooms,
  getAllStudentsByTeacher,
  getAllStudentsInSystem,
  enrollStudentInClassroom,
  unenrollStudentFromClassroom,
  getAvailableStudentsForClassroom,
  getClassroomWithStudents,
  generateClassCode,
  getAllStudentsByAdmin,
} from "@/server/models/classroomModel";
import { currentUser } from "@/lib/session";

const ALLOWED_CLASSROOM_ROLES = ["TEACHER", "ADMIN", "SYSTEM"] as const;

function canManageClassrooms(role: string): boolean {
  return ALLOWED_CLASSROOM_ROLES.some((allowedRole) => allowedRole === role);
}

function isClassroomAccessError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("access denied");
}

/**
 * Gets classrooms for the current authorized actor.
 * @returns An HTTP response with accessible classrooms.
 */
export async function fetchClassrooms() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageClassrooms(user.role)) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions." },
        { status: 403 },
      );
    }

    const classrooms = await getAllClassrooms(user);
    return NextResponse.json({ classrooms }, { status: 200 });
  } catch (error) {
    console.error("Error fetching classrooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch classrooms" },
      { status: 500 },
    );
  }
}

/**
 * Gets one accessible classroom with its students.
 * @param req The incoming request.
 * @param context The route parameters.
 * @returns An HTTP response with the classroom roster.
 */
export async function getClassroomController(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageClassrooms(user.role)) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions." },
        { status: 403 },
      );
    }

    const { id: classroomId } = await params;

    const classroomData = await getClassroomWithStudents(classroomId, user);

    if (!classroomData) {
      return NextResponse.json(
        { error: "Classroom not found or access denied" },
        { status: 404 },
      );
    }

    return NextResponse.json(classroomData, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching classroom:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch classroom" },
      { status: 500 },
    );
  }
}

/**
 * Creates a classroom for the current authorized actor.
 * @param name The classroom name.
 * @param _userId The legacy caller user identifier.
 * @param grade The optional grade.
 * @param classCode The optional class code.
 * @param _role The legacy caller role.
 * @returns The creation result.
 */
export async function createClassroomController(
  name: string,
  _userId?: string,
  grade?: string,
  classCode?: string,
  _role?: string,
) {
  try {
    const user = await currentUser();
    if (!user || !canManageClassrooms(user.role)) throw new Error("FORBIDDEN");
    await createClassroom({
      name,
      classCode,
      grade,
      actor: user,
    });

    return { success: true, message: "Classroom created successfully" };
  } catch (error) {
    throw new Error("FAILED_CREATE");
  }
}

/**
 * Updates one accessible classroom.
 * @param req The incoming request.
 * @param context The route parameters.
 * @returns An HTTP response with the updated classroom.
 */
export async function updateClassroomController(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageClassrooms(user.role)) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { classroomName, grade, description } = body;

    if (!classroomName) {
      return NextResponse.json(
        { error: "Classroom name is required" },
        { status: 400 },
      );
    }

    const classroom = await updateClassroom(id, {
      name: classroomName,
      grade,
      description,
    }, user);

    if (!classroom) {
      return NextResponse.json(
        { error: "Classroom not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ classroom }, { status: 200 });
  } catch (error) {
    console.error("Error updating classroom:", error);
    return NextResponse.json(
      { error: "Failed to update classroom" },
      { status: 500 },
    );
  }
}

/**
 * Deletes one accessible classroom.
 * @param classroomId The classroom identifier.
 * @param _userId The legacy caller user identifier.
 * @param _role The legacy caller role.
 * @returns The deletion result.
 */
export async function deleteClassroomController(
  classroomId: string,
  _userId: string,
  _role?: string,
) {
  try {
    const user = await currentUser();
    if (!user || !canManageClassrooms(user.role)) {
      return { success: false, error: "Insufficient permissions to delete classroom" };
    }
    const result = await deleteClassroom(classroomId, user);

    if (result && typeof result === "object" && "success" in result) {
      return result;
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting classroom:", error);
    return { success: false, error: "Failed to delete classroom" };
  }
}

/**
 * Gets students within the current actor's scope.
 * @returns An HTTP response with accessible students.
 */
export async function fetchStudentsByRole() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let students;

    if (user.role !== "SYSTEM" && !user.schoolId) {
      return NextResponse.json(
        { error: "Access denied. School association required." },
        { status: 403 },
      );
    }

    // Role-based access control
    switch (user.role) {
      case "SYSTEM":
        // system can see all students in the system
        students = await getAllStudentsInSystem();
        break;

      case "ADMIN":
        students = await getAllStudentsByAdmin(user.id, user.schoolId!);
        break;

      case "TEACHER":
        // teacher can only see students in their own classes
        students = await getAllStudentsByTeacher(user.id, user.schoolId!);
        break;

      default:
        return NextResponse.json(
          { error: "Access denied. Insufficient permissions." },
          { status: 403 },
        );
    }

    return NextResponse.json({ students }, { status: 200 });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 },
    );
  }
}

/**
 * Enrolls a student in an accessible classroom.
 * @param req The incoming request.
 * @param context The route parameters.
 * @returns An HTTP response with the enrollment.
 */
export async function enrollStudentController(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageClassrooms(user.role)) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions." },
        { status: 403 },
      );
    }

    const { id: classroomId } = await params;
    const { studentId } = await req.json();

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 },
      );
    }

    const enrollment = await enrollStudentInClassroom(studentId, classroomId, user);

    return NextResponse.json(
      {
        message: "Student enrolled successfully",
        enrollment,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error enrolling student:", error);
    if (isClassroomAccessError(error)) {
      return NextResponse.json(
        { error: "Classroom not found or access denied" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to enroll student" },
      { status: 500 },
    );
  }
}

/**
 * Removes a student from an accessible classroom.
 * @param req The incoming request.
 * @param context The route parameters.
 * @returns An HTTP response with the removed enrollment.
 */
export async function unenrollStudentController(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageClassrooms(user.role)) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions." },
        { status: 403 },
      );
    }

    const { id: classroomId } = await params;
    const { studentId } = await req.json();

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 },
      );
    }

    const enrollment = await unenrollStudentFromClassroom(
      studentId,
      classroomId,
      user,
    );

    return NextResponse.json(
      {
        message: "Student unenrolled successfully",
        enrollment,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error unenrolling student:", error);
    if (isClassroomAccessError(error)) {
      return NextResponse.json(
        { error: "Classroom not found or access denied" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to unenroll student" },
      { status: 500 },
    );
  }
}

/**
 * Gets students available to an accessible classroom.
 * @param req The incoming request.
 * @param context The route parameters.
 * @returns An HTTP response with available students.
 */
export async function getAvailableStudentsController(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageClassrooms(user.role)) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions." },
        { status: 403 },
      );
    }

    const { id: classroomId } = await params;

    const availableStudents = await getAvailableStudentsForClassroom(
      classroomId,
      user,
    );

    return NextResponse.json({ students: availableStudents }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching available students:", error);
    if (isClassroomAccessError(error)) {
      return NextResponse.json(
        { error: "Classroom not found or access denied" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch available students" },
      { status: 500 },
    );
  }
}

/**
 * Generates a login code for an accessible classroom.
 * @param req The incoming request.
 * @param context The route parameters.
 * @returns An HTTP response with the generated code.
 */
export async function generateClassCodeController(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: classroomId } = await params;

    if (!canManageClassrooms(user.role)) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions." },
        { status: 403 },
      );
    }

    const classroom = await generateClassCode(classroomId, user);

    if (!classroom) {
      return NextResponse.json(
        { error: "Classroom not found or access denied" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message: "Class code generated successfully",
        passwordStudents: classroom.passwordStudents,
        expiresAt: classroom.codeExpiresAt,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error generating class code:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate class code" },
      { status: 500 },
    );
  }
}
