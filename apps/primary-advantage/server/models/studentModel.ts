import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  StudentData,
  CreateStudentInput,
  UpdateStudentInput,
  UserWithRoles,
} from "@/types/index";

// Type for student query parameters
interface StudentQueryParams {
  page: number;
  limit: number;
  search: string;
  classroomId: string;
  cefrLevel: string;
  userWithRoles: UserWithRoles;
}

// Get students with pagination and filtering
export const getStudents = async (
  params: StudentQueryParams,
): Promise<{
  students: StudentData[];
  totalCount: number;
}> => {
  const { page, limit, search, classroomId, cefrLevel, userWithRoles } = params;

  try {
    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build where clause based on user's permissions
    let whereClause: any = {
      roles: {
        some: {
          role: {
            name: "student",
          },
        },
      },
    };

    // If user is school admin, only show students from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      !userWithRoles.roles.some((r: any) => r.role.name === "system")
    ) {
      whereClause.schoolId = userWithRoles.schoolId;
    }

    // Add search filter
    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Add classroom filter
    if (classroomId) {
      whereClause.studentClassroom = {
        some: {
          classroomId: classroomId,
        },
      };
    }

    // Add CEFR level filter
    if (cefrLevel) {
      whereClause.cefrLevel = cefrLevel;
    }

    // Fetch students with classroom information
    const [students, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          studentClassroom: {
            include: {
              classroom: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: offset,
        take: limit,
      }),
      prisma.user.count({
        where: whereClause,
      }),
    ]);

    // Transform data for response
    const studentsData: StudentData[] = students.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      cefrLevel: student.cefrLevel,
      xp: student.xp,
      role:
        student.roles.find((r) => r.role.name === "student")?.role.name ||
        "student",
      createdAt: student.createdAt.toISOString().split("T")[0],
      className: student.studentClassroom[0]?.classroom.name || null,
      classroomId: student.studentClassroom[0]?.classroom.id || null,
    }));

    return { students: studentsData, totalCount };
  } catch (error) {
    console.error("Student Model: Error fetching students:", error);
    throw error;
  }
};

// Get student by ID
export const getStudentById = async (
  id: string,
  userWithRoles: UserWithRoles,
): Promise<StudentData | null> => {
  try {
    console.log("Student Model: Fetching student by ID:", id);

    // Build where clause based on user's permissions
    let whereClause: any = {
      id,
      roles: {
        some: {
          role: {
            name: "student",
          },
        },
      },
    };

    // If user is school admin, only show students from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      !userWithRoles.roles.some((r: any) => r.role.name === "system")
    ) {
      whereClause.schoolId = userWithRoles.schoolId;
    }

    const student = await prisma.user.findFirst({
      where: whereClause,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        studentClassroom: {
          include: {
            classroom: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      console.log("Student Model: Student not found:", id);
      return null;
    }

    // Transform data
    const studentData: StudentData = {
      id: student.id,
      name: student.name,
      email: student.email,
      cefrLevel: student.cefrLevel,
      xp: student.xp,
      role:
        student.roles.find((r) => r.role.name === "student")?.role.name ||
        "student",
      createdAt: student.createdAt.toISOString().split("T")[0],
      className: student.studentClassroom[0]?.classroom.name || null,
      classroomId: student.studentClassroom[0]?.classroom.id || null,
    };

    console.log("Student Model: Successfully fetched student:", studentData.id);
    return studentData;
  } catch (error) {
    console.error("Student Model: Error fetching student by ID:", error);
    throw error;
  }
};

// Create new student
export const createStudent = async (params: {
  name: string;
  email: string;
  cefrLevel: string;
  classroomId?: string;
  password?: string;
  userWithRoles: UserWithRoles;
}): Promise<{ success: boolean; student?: StudentData; error?: string }> => {
  const { name, email, cefrLevel, classroomId, password, userWithRoles } =
    params;

  try {
    console.log("Student Model: Creating student with email:", email);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("Student Model: User already exists with email:", email);
      return { success: false, error: "User with this email already exists" };
    }

    // Get the Student role ID
    const roleRecord = await prisma.role.findFirst({
      where: { name: "student" },
    });

    if (!roleRecord) {
      console.log("Student Model: Student role not found");
      return { success: false, error: "Student role not found" };
    }

    // Determine school assignment
    let schoolId = null;
    if (userWithRoles.schoolId && userWithRoles.SchoolAdmins.length > 0) {
      schoolId = userWithRoles.schoolId;
    }

    // Validate classroom if provided
    if (classroomId) {
      const classroom = await prisma.classroom.findFirst({
        where: {
          id: classroomId,
          ...(schoolId && { schoolId }),
        },
      });

      if (!classroom) {
        console.log("Student Model: Invalid classroom specified:", classroomId);
        return { success: false, error: "Invalid classroom specified" };
      }
    }

    // Generate password if not provided
    const hashedPassword = password
      ? bcrypt.hashSync(password, 10)
      : bcrypt.hashSync(Math.random().toString(36).slice(-8), 10);

    // Create the new student
    const newStudent = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        cefrLevel,
        schoolId,
        xp: 0,
        level: 1,
        roles: {
          create: {
            roleId: roleRecord.id,
          },
        },
        ...(classroomId && {
          studentClassroom: {
            create: {
              classroomId,
            },
          },
        }),
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        studentClassroom: {
          include: {
            classroom: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Format response
    const studentData: StudentData = {
      id: newStudent.id,
      name: newStudent.name,
      email: newStudent.email,
      cefrLevel: newStudent.cefrLevel,
      xp: newStudent.xp,
      role: newStudent.roles[0]?.role.name || "student",
      createdAt: newStudent.createdAt.toISOString().split("T")[0],
      className: newStudent.studentClassroom[0]?.classroom.name || null,
      classroomId: newStudent.studentClassroom[0]?.classroom.id || null,
    };

    console.log("Student Model: Successfully created student:", studentData.id);
    return { success: true, student: studentData };
  } catch (error) {
    console.error("Student Model: Error creating student:", error);
    return { success: false, error: "Failed to create student" };
  }
};

// Update student
export const updateStudent = async (
  id: string,
  updateData: UpdateStudentInput,
  userWithRoles: UserWithRoles,
): Promise<{ success: boolean; student?: StudentData; error?: string }> => {
  try {
    console.log("Student Model: Updating student:", id);

    // Build where clause based on user's permissions
    let whereClause: any = {
      id,
      roles: {
        some: {
          role: {
            name: "student",
          },
        },
      },
    };

    // If user is school admin, only allow updates to students from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      !userWithRoles.roles.some((r: any) => r.role.name === "system")
    ) {
      whereClause.schoolId = userWithRoles.schoolId;
    }

    // Check if student exists and user has permission to update
    const existingStudent = await prisma.user.findFirst({
      where: whereClause,
    });

    if (!existingStudent) {
      console.log("Student Model: Student not found or no permission:", id);
      return { success: false, error: "Student not found" };
    }

    // Check if email is being updated and doesn't conflict
    if (updateData.email && updateData.email !== existingStudent.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (emailExists) {
        console.log("Student Model: Email already in use:", updateData.email);
        return { success: false, error: "Email already in use" };
      }
    }

    // Validate classroom if being updated
    if (updateData.classroomId) {
      const classroom = await prisma.classroom.findFirst({
        where: {
          id: updateData.classroomId,
          ...(userWithRoles.schoolId &&
            userWithRoles.SchoolAdmins.length > 0 && {
              schoolId: userWithRoles.schoolId,
            }),
        },
      });

      if (!classroom) {
        console.log(
          "Student Model: Invalid classroom specified:",
          updateData.classroomId,
        );
        return { success: false, error: "Invalid classroom specified" };
      }
    }

    // Prepare update data
    const updatePayload: any = {};
    if (updateData.name) updatePayload.name = updateData.name;
    if (updateData.email) updatePayload.email = updateData.email;
    if (updateData.cefrLevel) updatePayload.cefrLevel = updateData.cefrLevel;
    if (updateData.password) {
      updatePayload.password = bcrypt.hashSync(updateData.password, 10);
    }

    // Update the student
    const updatedStudent = await prisma.user.update({
      where: { id },
      data: updatePayload,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        studentClassroom: {
          include: {
            classroom: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Handle classroom update if specified
    if (updateData.classroomId !== undefined) {
      // Remove existing classroom relationships
      await prisma.classroomStudent.deleteMany({
        where: { studentId: id },
      });

      // Add new classroom relationship if classroomId is provided
      if (updateData.classroomId) {
        await prisma.classroomStudent.create({
          data: {
            studentId: id,
            classroomId: updateData.classroomId,
          },
        });
      }

      // Refetch to get updated classroom info
      const finalStudent = await prisma.user.findUnique({
        where: { id },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          studentClassroom: {
            include: {
              classroom: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (finalStudent) {
        // Format response with updated classroom info
        const studentData: StudentData = {
          id: finalStudent.id,
          name: finalStudent.name,
          email: finalStudent.email,
          cefrLevel: finalStudent.cefrLevel,
          xp: finalStudent.xp,
          role:
            finalStudent.roles.find((r) => r.role.name === "student")?.role
              .name || "student",
          createdAt: finalStudent.createdAt.toISOString().split("T")[0],
          className: finalStudent.studentClassroom[0]?.classroom.name || null,
          classroomId: finalStudent.studentClassroom[0]?.classroom.id || null,
        };

        console.log(
          "Student Model: Successfully updated student:",
          studentData.id,
        );
        return { success: true, student: studentData };
      }
    }

    // Format response for updates without classroom changes
    const studentData: StudentData = {
      id: updatedStudent.id,
      name: updatedStudent.name,
      email: updatedStudent.email,
      cefrLevel: updatedStudent.cefrLevel,
      xp: updatedStudent.xp,
      role:
        updatedStudent.roles.find((r) => r.role.name === "student")?.role
          .name || "student",
      createdAt: updatedStudent.createdAt.toISOString().split("T")[0],
      className: updatedStudent.studentClassroom[0]?.classroom.name || null,
      classroomId: updatedStudent.studentClassroom[0]?.classroom.id || null,
    };

    console.log("Student Model: Successfully updated student:", studentData.id);
    return { success: true, student: studentData };
  } catch (error) {
    console.error("Student Model: Error updating student:", error);
    return { success: false, error: "Failed to update student" };
  }
};

// Delete student
export const deleteStudent = async (
  id: string,
  userWithRoles: UserWithRoles,
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Student Model: Deleting student:", id);

    // Build where clause based on user's permissions
    let whereClause: any = {
      id,
      roles: {
        some: {
          role: {
            name: "student",
          },
        },
      },
    };

    // If user is school admin, only allow deletion of students from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      !userWithRoles.roles.some((r: any) => r.role.name === "system")
    ) {
      whereClause.schoolId = userWithRoles.schoolId;
    }

    // Check if student exists and user has permission to delete
    const existingStudent = await prisma.user.findFirst({
      where: whereClause,
    });

    if (!existingStudent) {
      console.log("Student Model: Student not found or no permission:", id);
      return { success: false, error: "Student not found" };
    }

    // Delete related records first
    await prisma.userRole.deleteMany({
      where: { userId: id },
    });

    await prisma.classroomStudent.deleteMany({
      where: { studentId: id },
    });

    await prisma.userActivity.deleteMany({
      where: { userId: id },
    });

    await prisma.xPLogs.deleteMany({
      where: { userId: id },
    });

    // Delete the student
    await prisma.user.delete({
      where: { id },
    });

    console.log("Student Model: Successfully deleted student:", id);
    return { success: true };
  } catch (error) {
    console.error("Student Model: Error deleting student:", error);
    return { success: false, error: "Failed to delete student" };
  }
};

// Get student statistics
export const getStudentStatistics = async (userWithRoles: UserWithRoles) => {
  try {
    // Build where clause based on user's permissions
    let whereClause: any = {
      roles: {
        some: {
          role: {
            name: "student",
          },
        },
      },
    };

    // If user is school admin, only show students from their school
    if (
      userWithRoles.SchoolAdmins.length > 0 &&
      !userWithRoles.roles.some((r: any) => r.role.name === "system")
    ) {
      whereClause.schoolId = userWithRoles.schoolId;
    }

    // Calculate statistics
    const allStudentsForStats = await prisma.user.findMany({
      where: whereClause,
      select: {
        xp: true,
        cefrLevel: true,
        createdAt: true,
        userActivity: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          select: {
            userId: true,
          },
        },
      },
    });

    const totalStudents = allStudentsForStats.length;
    const averageXp =
      totalStudents > 0
        ? Math.round(
            allStudentsForStats.reduce((sum, student) => sum + student.xp, 0) /
              totalStudents,
          )
        : 0;

    // Calculate most common CEFR level
    const levelCounts = allStudentsForStats.reduce(
      (acc, student) => {
        const level = student.cefrLevel || "A0-";
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const mostCommonLevel =
      Object.entries(levelCounts).reduce((a, b) =>
        levelCounts[a[0]] > levelCounts[b[0]] ? a : b,
      )?.[0] || "A0-";

    // Calculate active users this week
    const activeUserIds = new Set(
      allStudentsForStats.flatMap((student) =>
        student.userActivity.map((activity) => activity.userId),
      ),
    );
    const activeThisWeek = activeUserIds.size;
    const activePercentage =
      totalStudents > 0
        ? Math.round((activeThisWeek / totalStudents) * 100)
        : 0;

    const statistics = {
      totalStudents,
      averageXp,
      mostCommonLevel,
      activeThisWeek,
      activePercentage,
    };

    return statistics;
  } catch (error) {
    console.error("Student Model: Error calculating statistics:", error);
    throw error;
  }
};
