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
import { validateUser } from "../utils/auth";

// GET /api/classroom - Get all classrooms for a teacher
export async function fetchClassrooms() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userWithRoles = await validateUser(user.id);
    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const classrooms = await getAllClassrooms(userWithRoles);
    return NextResponse.json({ classrooms }, { status: 200 });
  } catch (error) {
    console.error("Error fetching classrooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch classrooms" },
      { status: 500 },
    );
  }
}

// GET /api/classroom/[id] - Get a specific classroom with students
export async function getClassroomController(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only teachers and system can view classroom details
    // if (user.role !== "teacher" && user.role !== "system") {
    //   return NextResponse.json(
    //     { error: "Access denied. Insufficient permissions." },
    //     { status: 403 },
    //   );
    // }

    const { id: classroomId } = await params;

    // For teachers, verify they own the classroom
    const teacherId = user.role === "teacher" ? user.id : undefined;

    const classroomData = await getClassroomWithStudents(
      classroomId,
      teacherId,
    );

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

// POST /api/classroom - Create a new classroom
export async function createClassroomController(
  name: string,
  userId?: string,
  grade?: string,
  classCode?: string,
  role?: string,
) {
  try {
    await createClassroom({
      name,
      teacherId: userId,
      classCode,
      grade,
      role,
    });

    return { success: true, message: "Classroom created successfully" };
  } catch (error) {
    throw new Error("FAILED_CREATE");
  }
}

// PATCH /api/classroom/[id] - Update a classroom
export async function updateClassroomController(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    });

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

// DELETE /api/classroom/[id] - Delete a classroom
export async function deleteClassroomController(
  classroomId: string,
  userId: string,
  role?: string,
) {
  try {
    const result = await deleteClassroom(classroomId, userId, role);

    if (result && typeof result === "object" && "success" in result) {
      return result;
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting classroom:", error);
    return { success: false, error: "Failed to delete classroom" };
  }
}

// GET /api/classroom/students - Get students based on user role
export async function fetchStudentsByRole() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let students;

    // Role-based access control
    switch (user.role) {
      case "system":
        // system can see all students in the system
        students = await getAllStudentsInSystem();
        break;

      case "admin":
        students = await getAllStudentsByAdmin(user.id);
        break;

      case "teacher":
        // teacher can only see students in their own classes
        students = await getAllStudentsByTeacher(user.id);
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

// POST /api/classroom/[id]/enroll - Enroll a student in a classroom
export async function enrollStudentController(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only teachers and system can enroll students
    if (user.role !== "teacher" && user.role !== "system") {
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

    // For teachers, verify they own the classroom
    const teacherId = user.role === "teacher" ? user.id : undefined;

    const enrollment = await enrollStudentInClassroom(studentId, classroomId);

    return NextResponse.json(
      {
        message: "Student enrolled successfully",
        enrollment,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error enrolling student:", error);
    return NextResponse.json(
      { error: error.message || "Failed to enroll student" },
      { status: 500 },
    );
  }
}

// DELETE /api/classroom/[id]/unenroll - Unenroll a student from a classroom
export async function unenrollStudentController(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only teachers and system can unenroll students
    if (user.role !== "teacher" && user.role !== "system") {
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

    // For teachers, verify they own the classroom
    const teacherId = user.role === "teacher" ? user.id : undefined;

    const enrollment = await unenrollStudentFromClassroom(
      studentId,
      classroomId,
      teacherId,
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
    return NextResponse.json(
      { error: error.message || "Failed to unenroll student" },
      { status: 500 },
    );
  }
}

// GET /api/classroom/[id]/available-students - Get available students for enrollment
export async function getAvailableStudentsController(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only teachers and system can view available students
    if (user.role !== "teacher" && user.role !== "system") {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions." },
        { status: 403 },
      );
    }

    const { id: classroomId } = await params;

    // For teachers, verify they own the classroom
    const teacherId = user.role === "teacher" ? user.id : undefined;

    const availableStudents = await getAvailableStudentsForClassroom(
      classroomId,
      teacherId,
    );

    return NextResponse.json({ students: availableStudents }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching available students:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch available students" },
      { status: 500 },
    );
  }
}

// POST /api/classroom/[id]/generate-code - Generate a new class code
export async function generateClassCodeController(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only teachers and system can generate class codes
    // if (user.role !== "teacher" && user.role !== "system") {
    //   return NextResponse.json(
    //     { error: "Access denied. Insufficient permissions." },
    //     { status: 403 },
    //   );
    // }

    const { id: classroomId } = await params;

    if (user.role === "user" || user.role === "student") {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions." },
        { status: 403 },
      );
    }

    const classroom = await generateClassCode(classroomId);

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
