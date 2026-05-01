import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync, unlink } from "fs";
import path from "path";
import { parse } from "csv/sync";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
/**
 * CSV Upload API Route
 *
 * Permissions: Admin, System, or Teacher roles only
 * School Assignment: Users are automatically assigned to uploader's school (except System users)
 *
 * Allowed filenames: students.csv, teachers.csv, classes.csv
 *
 * Expected CSV format with exactly 4 headers:
 * - name (required): User's full name
 * - email (required): User's email address
 * - role (required): User role (Student, Teacher, Admin, System)
 * - classroom_name (optional): Classroom name (ignored for Admin role)
 *
 * Example CSV:
 * name,email,role,classroom_name
 * John Doe,john@example.com,Student,Math Class A
 * Jane Smith,jane@example.com,Teacher,Math Class A
 * Admin User,admin@example.com,Admin,
 *
 * Classroom Logic:
 * - Students: Assigned to specified classroom (created if doesn't exist)
 * - Teachers: Assigned as classroom teacher (created if doesn't exist)
 * - Admin/System: classroom_name is ignored
 * - All classrooms are associated with the uploader's school
 * - Can create classrooms on-the-fly or use existing ones
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user with school information
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        School: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has permission to upload (admin, system, or teacher roles)
    const currentUserRoles = currentUser.roles.map((ur) => ur.role.name);
    const allowedRoles = ["admin", "system", "teacher"];
    const hasPermission = currentUserRoles.some((role) =>
      allowedRoles.includes(role),
    );

    if (!hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions",
          details: [
            "Only Admin, System, or Teacher roles can upload CSV files",
          ],
          userRoles: currentUserRoles,
        },
        { status: 403 },
      );
    }

    // For non-system users, require school association
    if (!currentUserRoles.includes("system") && !currentUser.schoolId) {
      return NextResponse.json(
        {
          error: "School association required",
          details: [
            "Users must be associated with a school to upload CSV files",
          ],
        },
        { status: 400 },
      );
    }
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      return NextResponse.json(
        { error: "Only CSV files are allowed" },
        { status: 400 },
      );
    }

    // Validate filename - only allow specific CSV files
    const allowedFilenames = ["students.csv", "teachers.csv", "classes.csv"];
    const filename = file.name.toLowerCase();

    if (!allowedFilenames.includes(filename)) {
      return NextResponse.json(
        {
          error: "Invalid file name",
          details: [
            `Only the following files are allowed: ${allowedFilenames.join(", ")}`,
            `Got: ${file.name}`,
          ],
          allowedFiles: allowedFilenames,
        },
        { status: 400 },
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        },
        { status: 400 },
      );
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), "temp");
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${session.user.id}_${originalName}`;
    const filePath = path.join(tempDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Parse CSV file
    const csvData = parse(buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
    }) as Array<{
      name: string;
      email: string;
      role: string;
      classroom_name: string;
    }>;

    // Validate CSV headers
    if (csvData.length > 0) {
      const firstRow = csvData[0];
      const headers = Object.keys(firstRow);
      const expectedHeaders = ["name", "email", "role", "classroom_name"];

      if (
        headers.length !== 4 ||
        !expectedHeaders.every((header) => headers.includes(header))
      ) {
        return NextResponse.json(
          {
            error: "Invalid CSV format",
            details: [
              `Expected exactly 4 headers: ${expectedHeaders.join(", ")}. Got: ${headers.join(", ")}`,
            ],
            expectedFormat: "name,email,role,classroom_name",
          },
          { status: 400 },
        );
      }
    }

    // Validate and process CSV data
    const validRoles = ["student", "teacher", "admin", "system"];
    const processedUsers: any[] = [];
    const userRoleAssignments: { userId: string; roleName: string }[] = [];
    const classroomAssignments: {
      userId: string;
      classroomName: string;
      role: string;
      email: string;
    }[] = [];
    const errors: string[] = [];

    // Get all roles from database
    const roles = await prisma.role.findMany();
    const roleMap = new Map(roles.map((role) => [role.name, role.id]));

    // Validate and process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // +2 because CSV is 1-indexed and has header

      // Validate required fields
      if (!row.name || typeof row.name !== "string" || row.name.trim() === "") {
        errors.push(
          `Row ${rowNumber}: Name is required and must be a valid string`,
        );
        continue;
      }

      if (
        !row.email ||
        typeof row.email !== "string" ||
        row.email.trim() === ""
      ) {
        errors.push(
          `Row ${rowNumber}: Email is required and must be a valid string`,
        );
        continue;
      }

      if (!row.role || typeof row.role !== "string" || row.role.trim() === "") {
        errors.push(
          `Row ${rowNumber}: Role is required and must be a valid string`,
        );
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email.trim())) {
        errors.push(`Row ${rowNumber}: Invalid email format '${row.email}'`);
        continue;
      }

      // Validate role
      const role = row.role.toString().trim();
      if (!validRoles.includes(role)) {
        errors.push(
          `Row ${rowNumber}: Invalid role '${role}'. Valid roles are: ${validRoles.join(", ")}`,
        );
        continue;
      }

      // Check if role exists in database
      if (!roleMap.has(role)) {
        errors.push(`Row ${rowNumber}: Role '${role}' not found in database`);
        continue;
      }

      // Validate classroom_name for non-Admin roles
      const classroomName = row.classroom_name
        ? row.classroom_name.toString().trim()
        : "";
      if ((role === "student" || role === "teacher") && !classroomName) {
        errors.push(
          `Row ${rowNumber}: classroom_name is required for ${role} role`,
        );
        continue;
      }

      // Prepare user data with default values and school assignment
      const userData = {
        email: row.email.trim(),
        name: row.name.trim(),
        password: null, // No password from CSV, will need to be set later
        cefrLevel: "A0-", // Default CEFR level
        level: 1, // Default level
        xp: 0, // Default XP
        schoolId: currentUser.schoolId, // Assign to current user's school (null for system users)
      };

      processedUsers.push(userData);
      userRoleAssignments.push({ userId: "", roleName: role }); // userId will be filled after user creation

      // Store classroom assignment for non-Admin roles
      if ((role === "student" || role === "teacher") && classroomName) {
        classroomAssignments.push({
          userId: "",
          classroomName,
          role,
          email: row.email.trim(), // Store email for later mapping
        });
      }
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
          validatedRows: processedUsers.length,
          totalRows: csvData.length,
        },
        { status: 400 },
      );
    }

    // Process users in batches
    const max = 500;
    let batch: any[] = [];
    let createdUsers: any[] = [];

    for (const userData of processedUsers) {
      batch.push(userData);
      if (batch.length >= max) {
        const result = await prisma.user.createMany({
          data: batch,
          skipDuplicates: true, // Skip users with duplicate emails
        });

        // Get the created users to assign roles
        const emails = batch.map((u) => u.email);
        const users = await prisma.user.findMany({
          where: { email: { in: emails } },
          select: { id: true, email: true },
        });
        createdUsers.push(...users);
        batch = [];
      }
    }

    if (batch.length > 0) {
      const result = await prisma.user.createMany({
        data: batch,
        skipDuplicates: true,
      });

      // Get the created users to assign roles
      const emails = batch.map((u) => u.email);
      const users = await prisma.user.findMany({
        where: { email: { in: emails } },
        select: { id: true, email: true },
      });
      createdUsers.push(...users);
    }

    // Create user-email to user-id mapping
    const emailToUserId = new Map(
      createdUsers.map((user) => [user.email, user.id]),
    );

    // Assign roles to users
    const roleAssignments: { userId: string; roleId: string }[] = [];
    for (let i = 0; i < processedUsers.length; i++) {
      const userData = processedUsers[i];
      const roleData = userRoleAssignments[i];
      const userId = emailToUserId.get(userData.email);
      const roleId = roleMap.get(roleData.roleName);

      if (userId && roleId) {
        roleAssignments.push({ userId, roleId });
      }
    }

    // Create role assignments in batches
    if (roleAssignments.length > 0) {
      await prisma.userRole.createMany({
        data: roleAssignments,
        skipDuplicates: true, // Skip duplicate role assignments
      });
    }

    // Handle classroom assignments
    let classroomsCreated = 0;
    let studentAssignments = 0;
    let teacherAssignments = 0;

    if (classroomAssignments.length > 0) {
      // Update classroom assignments with actual user IDs
      for (let i = 0; i < classroomAssignments.length; i++) {
        const assignment = classroomAssignments[i];
        const userId = emailToUserId.get(assignment.email);

        if (userId) {
          assignment.userId = userId;
        }
      }

      // Group by classroom name to avoid duplicates
      const classroomGroups = new Map<
        string,
        { userId: string; role: string }[]
      >();
      classroomAssignments.forEach((assignment) => {
        if (!assignment.userId) return; // Skip if no userId found

        if (!classroomGroups.has(assignment.classroomName)) {
          classroomGroups.set(assignment.classroomName, []);
        }
        classroomGroups.get(assignment.classroomName)!.push({
          userId: assignment.userId,
          role: assignment.role,
        });
      });

      // Process each classroom
      for (const [classroomName, assignments] of classroomGroups) {
        // Find or create classroom
        let classroom = await prisma.classroom.findFirst({
          where: {
            name: classroomName,
            schoolId: currentUser.schoolId,
          },
        });

        if (!classroom) {
          // Create new classroom
          classroom = await prisma.classroom.create({
            data: {
              name: classroomName,
              schoolId: currentUser.schoolId,
            },
          });
          classroomsCreated++;
        }

        // Assign users to classroom
        for (const assignment of assignments) {
          if (assignment.role === "student") {
            // Add student to classroom
            await prisma.classroomStudent.upsert({
              where: {
                classroomId_studentId: {
                  classroomId: classroom.id,
                  studentId: assignment.userId,
                },
              },
              update: {},
              create: {
                classroomId: classroom.id,
                studentId: assignment.userId,
              },
            });
            studentAssignments++;
          } else if (assignment.role === "teacher") {
            // Add teacher to classroom (check if already exists)
            const existingTeacher = await prisma.classroomTeachers.findFirst({
              where: {
                classroomId: classroom.id,
                userId: assignment.userId,
              },
            });

            if (!existingTeacher) {
              await prisma.classroomTeachers.create({
                data: {
                  classroomId: classroom.id,
                  userId: assignment.userId,
                },
              });
              teacherAssignments++;
            }
          }
        }
      }
    }

    // Delete temp file
    unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting temp file:", err);
      }
    });

    return NextResponse.json({
      success: true,
      message: "File uploaded and users created successfully",
      fileName: fileName,
      filePath: filePath,
      originalName: file.name,
      size: file.size,
      timestamp: timestamp,
      stats: {
        totalRows: csvData.length,
        processedUsers: processedUsers.length,
        createdUsers: createdUsers.length,
        roleAssignments: roleAssignments.length,
        classroomsCreated: classroomsCreated,
        studentAssignments: studentAssignments,
        teacherAssignments: teacherAssignments,
        errors: errors.length,
      },
      schoolInfo: currentUser.School
        ? {
            id: currentUser.School.id,
            name: currentUser.School.name,
            note: "All imported users have been assigned to this school",
          }
        : {
            note: "system user - users imported without school assignment",
          },
      note: "Users created with default values: password=null, cefrLevel=A0-, level=1, xp=0",
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
