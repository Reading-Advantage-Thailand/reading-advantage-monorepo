import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { currentUser } from "@/lib/session";
import { UserWithRoles } from "@/server/utils/auth";

export const createClassCode = async (
  classrooomId: string,
  classCode: string,
) => {
  try {
    const expiresAt = addDays(new Date(), 1);

    const classroom = await prisma.classroom.findUnique({
      where: { id: classrooomId },
      select: { id: true, name: true },
    });

    if (!classroom) {
      return NextResponse.json(
        { error: "Classroom not found" },
        { status: 404 },
      );
    }

    if (classroom) {
      // Update the existing classroom's expiration date
      return await prisma.classroom.update({
        where: { id: classrooomId },
        data: { classCode, codeExpiresAt: expiresAt },
      });
    }
  } catch (error) {
    throw new Error("Failed to generate or update classroom code");
  }
};

export const createClassroom = async (data: {
  name: string;
  teacherId?: string;
  classCode?: string;
  grade?: string;
  role?: string;
}) => {
  try {
    let created = false;
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: data.teacherId },
        select: { schoolId: true },
      });

      let schoolId = user?.schoolId ?? null;

      if (data.role === "teacher" && data.teacherId) {
        const classroom = await tx.classroom.create({
          data: {
            name: data.name,
            classCode: data.classCode || null,
            grade: data.grade || null,
            schoolId: schoolId,
          },
        });

        await tx.classroomTeachers.create({
          data: {
            classroomId: classroom.id,
            userId: data.teacherId,
          },
        });
        created = true;
        return;
      }

      if (data.role === "admin") {
        await tx.classroom.create({
          data: {
            name: data.name,
            classCode: data.classCode || null,
            grade: data.grade || null,
            schoolId: schoolId,
          },
        });
        created = true;
        return;
      }

      // system or other elevated roles: create without owner assignment; school optional
      await tx.classroom.create({
        data: {
          name: data.name,
          classCode: data.classCode || null,
          grade: data.grade || null,
        },
      });
      created = true;
    });

    if (!created) throw new Error("FAILED_CREATE");
    return { success: true, message: "Classroom created successfully" };
  } catch (error) {
    throw new Error("FAILED_CREATE");
  }
};

// Enroll a student in a classroom
export const enrollStudentInClassroom = async (
  studentId: string,
  classroomId: string,
) => {
  try {
    // Check if the student is already enrolled
    const existingEnrollment = await prisma.classroomStudent.findUnique({
      where: {
        classroomId_studentId: {
          classroomId,
          studentId,
        },
      },
    });

    if (existingEnrollment) {
      throw new Error("Student is already enrolled in this classroom");
    }

    // Check if classroom exists
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    // Check if student exists and has STUDENT role
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        roles: {
          some: {
            role: {
              name: "student",
            },
          },
        },
      },
    });

    if (!student) {
      throw new Error("Student not found or invalid role");
    }

    // Create the enrollment
    const enrollment = await prisma.classroomStudent.create({
      data: {
        studentId,
        classroomId,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return enrollment;
  } catch (error) {
    console.error("Error enrolling student:", error);
    throw error;
  }
};

// Un-enroll a student from a classroom
export const unenrollStudentFromClassroom = async (
  studentId: string,
  classroomId: string,
  teacherId?: string,
) => {
  try {
    // If teacherId is provided, verify the teacher owns the classroom
    if (teacherId) {
      const classroom = await prisma.classroom.findFirst({
        where: {
          id: classroomId,
          teachers: {
            some: {
              userId: teacherId,
            },
          },
        },
      });

      if (!classroom) {
        throw new Error("Classroom not found or access denied");
      }
    }

    // Check if the enrollment exists
    const enrollment = await prisma.classroomStudent.findUnique({
      where: {
        classroomId_studentId: {
          classroomId,
          studentId,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new Error("Student is not enrolled in this classroom");
    }

    // Delete the enrollment
    await prisma.classroomStudent.delete({
      where: {
        classroomId_studentId: {
          classroomId,
          studentId,
        },
      },
    });

    return enrollment;
  } catch (error) {
    console.error("Error unenrolling student:", error);
    throw error;
  }
};

// Get available students for enrollment (students not in the classroom)
export const getAvailableStudentsForClassroom = async (
  classroomId: string,
  teacherId?: string,
) => {
  try {
    // If teacherId is provided, verify the teacher owns the classroom
    if (teacherId) {
      const classroom = await prisma.classroom.findFirst({
        where: {
          id: classroomId,
          teachers: {
            some: {
              userId: teacherId,
            },
          },
        },
      });

      if (!classroom) {
        throw new Error("Classroom not found or access denied");
      }
    }

    // Get all students who are not enrolled in this classroom
    const availableStudents = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: "student",
            },
          },
        },
        studentClassroom: {
          none: {
            classroomId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        cefrLevel: true,
        level: true,
        xp: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return availableStudents;
  } catch (error) {
    console.error("Error fetching available students:", error);
    throw error;
  }
};

// Get all classrooms based on user role
export const getAllClassrooms = async (userWithRoles: UserWithRoles) => {
  try {
    // Check user roles to determine access level
    const isSystemAdmin = userWithRoles.roles.some(
      (userRole) => userRole.role.name === "system",
    );

    const isAdmin = userWithRoles.roles.some(
      (userRole) => userRole.role.name === "admin",
    );

    const isTeacher = userWithRoles.roles.some(
      (userRole) => userRole.role.name === "teacher",
    );

    const isSchoolAdmin = userWithRoles.SchoolAdmins.length > 0;

    // Build where clause based on user role
    let whereClause: any = {};

    if (isSystemAdmin) {
      // System admins can see all classrooms across all schools
      // No additional where clause needed
    } else if (isAdmin || isSchoolAdmin) {
      // Admins and school admins can see all classrooms in their school
      if (userWithRoles.schoolId) {
        whereClause.schoolId = userWithRoles.schoolId;
      }
    } else if (isTeacher) {
      // Teachers can only see classrooms they teach in
      whereClause.teachers = {
        some: {
          userId: userWithRoles.id,
        },
      };
    } else {
      // Other roles (like students) cannot access classroom lists
      throw new Error("Insufficient permissions to view classrooms");
    }

    // Fetch classrooms with basic information first
    const classrooms = await prisma.classroom.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        grade: true,
        classCode: true,
        createdAt: true,
        updatedAt: true,
        schoolId: true,
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // For each classroom, fetch teachers and students separately to avoid type issues
    const classroomsWithDetails = await Promise.all(
      classrooms.map(async (classroom) => {
        const [teachers, students] = await Promise.all([
          prisma.classroomTeachers.findMany({
            where: { classroomId: classroom.id },
            select: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          }),
          prisma.classroomStudent.findMany({
            where: { classroomId: classroom.id },
            select: {
              student: {
                select: { id: true, name: true, email: true },
              },
            },
          }),
        ]);

        return {
          ...classroom,
          teachers: teachers.map((teacher) => teacher.user),
          students: students.map((student) => student.student),
        };
      }),
    );

    return classroomsWithDetails;
  } catch (error) {
    console.error("Error fetching classrooms:", error);
    throw new Error("Failed to fetch classrooms");
  }
};

// Update a classroom
export const updateClassroom = async (
  id: string,
  data: {
    name?: string;
    grade?: string;
    description?: string;
  },
) => {
  try {
    return await prisma.classroom.update({
      where: { id },
      data: {
        name: data.name,
        grade: data.grade,
        // Note: grade and description are not in the current schema
        // If needed, they should be added to the Prisma schema first
        updatedAt: new Date(),
      },
      include: {
        teachers: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        students: {
          include: {
            student: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("Error updating classroom:", error);
    return null;
  }
};

// Delete a classroom
export const deleteClassroom = async (
  classroomId: string,
  teacherId: string,
  role?: string,
) => {
  try {
    if (role === "teacher") {
      // First, verify the teacher is part of the classroom
      const classroom = await prisma.classroom.findFirst({
        where: {
          id: classroomId,
        },
        include: {
          teachers: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!classroom) {
        return { success: false, error: "Classroom not found" };
      }

      // Count how many teachers are in the classroom
      const teacherCount = classroom.teachers.length;

      if (teacherCount > 1) {
        // Multiple teachers: only remove the current teacher from the classroom
        await prisma.classroomTeachers.deleteMany({
          where: {
            classroomId: classroomId,
            userId: teacherId,
          },
        });
        return { success: true, message: "Removed from classroom" };
      } else {
        // Only one teacher: delete the entire classroom
        await prisma.classroom.delete({
          where: { id: classroomId },
        });
        return { success: true, message: "Classroom deleted" };
      }
    }

    if (role === "admin" || role === "system") {
      await prisma.classroom.delete({
        where: { id: classroomId },
      });
      return { success: true };
    }

    return {
      success: false,
      error: "Insufficient permissions to delete classroom",
    };
  } catch (error) {
    console.error("Error deleting classroom:", error);
    return { success: false, error: "Failed to delete classroom" };
  }
};

// Get all students for a teacher from their classrooms
export const getAllStudentsByTeacher = async (teacherId: string) => {
  try {
    // Get all classrooms for the teacher
    const classrooms = await prisma.classroom.findMany({
      where: { teachers: { some: { userId: teacherId } } },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                xp: true,
                level: true,
                cefrLevel: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    // Extract unique students across all classrooms
    const studentMap = new Map();

    classrooms.forEach((classroom) => {
      classroom.students.forEach((classroomStudent) => {
        const student = classroomStudent.student;
        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, {
            id: student.id,
            display_name: student.name,
            email: student.email,
            xp: student.xp,
            level: student.level,
            cefrLevel: student.cefrLevel,
            createdAt: student.createdAt,
            updatedAt: student.updatedAt,
            classrooms: [],
          });
        }
        // Add classroom info to student
        studentMap.get(student.id).classrooms.push({
          id: classroom.id,
          name: classroom.name,
        });
      });
    });

    // Convert map to array
    const students = Array.from(studentMap.values());

    return students;
  } catch (error) {
    console.error("Error fetching students by teacher:", error);
    throw new Error("Failed to fetch students");
  }
};

// Get all students by admin
export const getAllStudentsByAdmin = async (adminId: string) => {
  try {
    const schoolId = await prisma.schoolAdmins.findFirst({
      where: { userId: adminId },
      select: { schoolId: true },
    });

    if (!schoolId) {
      return [];
    }

    // Get all classrooms for the teacher
    const classrooms = await prisma.classroom.findMany({
      where: { schoolId: schoolId.schoolId },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                xp: true,
                level: true,
                cefrLevel: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    // Extract unique students across all classrooms
    const studentMap = new Map();

    classrooms.forEach((classroom) => {
      classroom.students.forEach((classroomStudent) => {
        const student = classroomStudent.student;
        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, {
            id: student.id,
            display_name: student.name,
            email: student.email,
            xp: student.xp,
            level: student.level,
            cefrLevel: student.cefrLevel,
            createdAt: student.createdAt,
            updatedAt: student.updatedAt,
            classrooms: [],
          });
        }
        // Add classroom info to student
        studentMap.get(student.id).classrooms.push({
          id: classroom.id,
          name: classroom.name,
        });
      });
    });

    // Convert map to array
    const students = Array.from(studentMap.values());

    return students;
  } catch (error) {
    console.error("Error fetching students by teacher:", error);
    throw new Error("Failed to fetch students");
  }
};

// Get all students in the system (for system role)
export const getAllStudentsInSystem = async () => {
  try {
    // Get all users with STUDENT role
    const students = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: "student",
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        level: true,
        cefrLevel: true,
        createdAt: true,
        updatedAt: true,
        studentClassroom: {
          include: {
            classroom: {
              select: {
                id: true,
                name: true,
                teachers: {
                  select: {
                    id: true,
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format the data to match the expected structure
    const formattedStudents = students.map((student) => ({
      id: student.id,
      display_name: student.name,
      email: student.email,
      xp: student.xp,
      level: student.level,
      cefrLevel: student.cefrLevel,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      classrooms: student.studentClassroom.map((sc) => ({
        id: sc.classroom.id,
        name: sc.classroom.name,
        teacher: sc.classroom.teachers[0].user,
      })),
    }));

    return formattedStudents;
  } catch (error) {
    console.error("Error fetching all students in system:", error);
    throw new Error("Failed to fetch students");
  }
};

// Get a specific classroom with its students
export const getClassroomWithStudents = async (
  classroomId: string,
  teacherId?: string,
) => {
  try {
    // If teacherId is provided, verify the teacher owns the classroom
    const whereClause: any = { id: classroomId };
    if (teacherId) {
      whereClause.teacherId = teacherId;
    }

    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId },
      include: {
        teachers: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                xp: true,
                level: true,
                cefrLevel: true,
                createdAt: true,
                updatedAt: true,
                // Get the latest activity from UserActivity
                userActivity: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: { createdAt: true },
                },
              },
            },
          },
        },
      },
    });

    if (!classroom) {
      return null;
    }

    // Format the response to match the expected structure
    const studentInClass = classroom.students.map((cs) => ({
      id: cs.student.id,
      display_name: cs.student.name,
      email: cs.student.email,
      last_activity:
        cs.student.userActivity[0]?.createdAt?.toISOString() || null,
      level: cs.student.level,
      xp: cs.student.xp,
      cefrLevel: cs.student.cefrLevel,
    }));

    const formattedClassroom = {
      id: classroom.id,
      classroomName: classroom.name,
      classCode: classroom.classCode,
      passwordStudents: classroom.passwordStudents,
      codeExpiresAt: classroom.codeExpiresAt?.toISOString() || null,
      grade: classroom.grade,
      teacherId: classroom.teachers[0].user.id,
      archived: false, // Add this field based on your schema
      noOfStudents: classroom.students.length,
    };

    return {
      classroom: formattedClassroom,
      studentInClass,
    };
  } catch (error) {
    console.error("Error fetching classroom with students:", error);
    throw new Error("Failed to fetch classroom with students");
  }
};

export const getClassroomStudentForLogin = async (code: string) => {
  try {
    //check code
    const checkCode = await prisma.classroom.findFirst({
      where: {
        passwordStudents: code,
      },
      select: { id: true, passwordStudents: true, codeExpiresAt: true },
    });

    if (!checkCode) {
      return NextResponse.json(
        { error: "Invalid Classroom Code" },
        { status: 404 },
      );
    }

    if (checkCode.codeExpiresAt && new Date() > checkCode.codeExpiresAt) {
      return NextResponse.json(
        { error: "Classroom code has expired" },
        { status: 410 }, // 410 Gone = valid but expired
      );
    }

    const studentInClass = await prisma.classroomStudent.findMany({
      where: {
        classroomId: checkCode?.id,
      },
      include: {
        student: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return NextResponse.json({ students: studentInClass }, { status: 200 });
  } catch (error) {
    throw new Error("error getClassroomStudentForLogin");
  }
};

// Generate a unique class code for a classroom
export const generateClassCode = async (
  classroomId: string,
  teacherId?: string,
) => {
  try {
    // Get classroom with existing password
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        name: true,
        passwordStudents: true,
        codeExpiresAt: true,
      },
    });

    if (!classroom) {
      return null;
    }

    const existingPassword = classroom.passwordStudents;

    // Generate a unique 8-character alphanumeric code
    const generateCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    // Function to check if password exists in database
    const isPasswordUnique = async (password: string): Promise<boolean> => {
      const existing = await prisma.classroom.findFirst({
        where: {
          passwordStudents: password,
        },
      });
      return !existing;
    };

    let newPassword = generateCode();
    let attempts = 0;
    const maxAttempts = 20;

    // Generate new password that:
    // 1. Is not in the database
    // 2. Is different from existing password (if any)
    while (attempts < maxAttempts) {
      const isUnique = await isPasswordUnique(newPassword);
      const isDifferent = !existingPassword || newPassword !== existingPassword;

      if (isUnique && isDifferent) {
        break;
      }

      newPassword = generateCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error(
        "Unable to generate unique class code after maximum attempts",
      );
    }

    // Set expiration to 7 days from now
    const expiresAt = addDays(new Date(), 7);

    // Update the classroom with the new password and expiration date
    const updatedClassroom = await prisma.classroom.update({
      where: { id: classroomId },
      data: {
        passwordStudents: newPassword,
        codeExpiresAt: expiresAt,
      },
      select: {
        id: true,
        name: true,
        passwordStudents: true,
        codeExpiresAt: true,
      },
    });

    return updatedClassroom;
  } catch (error) {
    console.error("Error generating class code:", error);
    throw new Error("Failed to generate class code");
  }
};
