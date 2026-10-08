import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync, unlink } from "fs";
import path from "path";
import { parse } from "csv/sync";
import { eq, and, inArray, or, ilike } from 'drizzle-orm';
import type { DB } from '@reading-advantage/domain';
import { users, schools, roles, classrooms, classroomStudents, classroomTeachers, userRoles } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB, studentLogin } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';
import { getCurrentUser } from "@/lib/session";
import { CsvUploadSummary } from "./schema";
import { logger } from "@/lib/observability/logger";
/**
 * CSV Upload API Route
 *
 * Permissions: Admin, System, or Teacher roles only
 * School Assignment: Users are automatically assigned to uploader's school (except System users)
 *
 * Allowed filenames: students.csv, teachers.csv, classes.csv
 *
 * Expected CSV headers:
 * - students.csv: name,role,classroom_name. Students have no email (owner decision 2026-10-08);
 *   each new student gets a generated username and an initial password.
 * - teachers.csv: name,email,role,classroom_name.
 *
 * Example students.csv:
 * name,role,classroom_name
 * Ann Lee,student,P3A
 *
 * Duplicates: a teacher row is keyed by its email; a student row by its name (case and spaces
 * ignored) in its class. A repeated row in the file, or a student already in that class of the
 * school, is skipped and counted.
 *
 * Classroom Logic:
 * - Students: Assigned to specified classroom (created if doesn't exist)
 * - Teachers: Assigned as classroom teacher (created if doesn't exist)
 * - All classrooms are associated with the uploader's school
 * - Can create classrooms on-the-fly or use existing ones
 * @param request The authenticated upload request.
 * @returns The import result or a validation error.
 */
/** The duplicate key of a student row: the name (case and spaces ignored) in one class. */
const studentKey = (name: string, classroomName: string) => `${name.trim().replace(/\s+/g, " ").toLowerCase()}\n${classroomName}`;

export async function POST(request: NextRequest) {
  // Set once the upload is written to disk; the finally block deletes it on every exit.
  let tempFilePath: string | undefined;
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization decision via the central policy (replaces the inline
    // allowedRoles gate). Runs before any DB read so denied callers issue
    // no queries.
    try {
      assertCan(authUser, "student:import", { schoolId: authUser.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          {
            error: "Insufficient permissions",
            details: ["Only Admin, System, or Teacher roles can upload CSV files"],
            userRoles: [authUser.role],
          },
          { status: 403 },
        );
      }
      throw error;
    }

    const tenant = { schoolId: authUser.schoolId ?? null };
    const tenantDb = getTenantDB(tenant);
    // roles and schools are EXEMPT; classroomStudents, classroomTeachers,
    // and userRoles are REFERENTIAL (owner-FK scoped below). The tenant is
    // unknown until the session user row loads, so that single-row PK
    // lookup also uses this handle.
    const globalDb = getUnscopedDB("upload CSV import: roles and schools are EXEMPT; membership and user-role tables are REFERENTIAL; session user lookup runs before the tenant is known");
    // users and classrooms are FLAT. School staff use the tenant-scoped
    // handle; SYSTEM actors carry no school, so their global writes use the
    // escape hatch with the reason above.
    const staffDb: DB = tenant.schoolId ? tenantDb : globalDb;

    // Get current user with school information (replaces Prisma `findUnique({ include: School, roles })`).
    const [currentUser] = await globalDb.select().from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Stitch school include via FK.
    let userSchool: { id: string; name: string } | null = null;
    if (currentUser.schoolId) {
      const [s] = await globalDb.select({ id: schools.id, name: schools.name })
        .from(schools)
        .where(eq(schools.id, currentUser.schoolId))
        .limit(1);
      userSchool = s;
    }

    if (authUser.role !== "SYSTEM" && !currentUser.schoolId) {
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
    const fileName = `${currentUser.id}_${originalName}`;
    const filePath = path.join(tempDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    tempFilePath = filePath;
    await writeFile(filePath, buffer);

    // Parse CSV file
    const csvData = parse(buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
    }) as Array<{
      name: string;
      email?: string;
      role: string;
      classroom_name: string;
    }>;
    const studentFile = filename === "students.csv";

    // Validate CSV headers
    if (csvData.length > 0) {
      const firstRow = csvData[0];
      const headers = Object.keys(firstRow);
      const expectedHeaders = studentFile ? ["name", "role", "classroom_name"] : ["name", "email", "role", "classroom_name"];

      if (
        headers.length !== expectedHeaders.length ||
        !expectedHeaders.every((header) => headers.includes(header))
      ) {
        return NextResponse.json(
          {
            error: "Invalid CSV format",
            details: [
              `Expected exactly ${expectedHeaders.length} headers: ${expectedHeaders.join(", ")}. Got: ${headers.join(", ")}`,
            ],
            expectedFormat: expectedHeaders.join(","),
          },
          { status: 400 },
        );
      }
    }

    // Validate and process CSV data
    const validRoles = ["student", "teacher"];
    const processedUsers: any[] = [];
    const userRoleAssignments: { userId: string; roleName: string }[] = [];
    const classroomAssignments: {
      userId: string;
      classroomName: string;
      role: string;
    }[] = [];
    const errors: string[] = [];
    const seenKeys = new Set<string>();
    let skippedDuplicate = 0;

    // Get all roles from database (replaces Prisma `role.findMany`).
    const allRoles = await globalDb.select().from(roles);
    const roleMap = new Map(
      allRoles.map((role) => [role.name.toLowerCase(), role.id]),
    );

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
        !studentFile &&
        (!row.email || typeof row.email !== "string" || row.email.trim() === "")
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
      if (!studentFile && !emailRegex.test(row.email!.trim())) {
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
      const expectedRole = filename === "students.csv" ? "student" : "teacher";
      if (role !== expectedRole) {
        errors.push(`Row ${rowNumber}: ${filename} can only contain ${expectedRole} rows`);
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

      // FR-3.1: the first valid row wins. Later rows repeating a teacher's
      // email, or a student's name in the same class, are skipped and counted.
      const email = studentFile ? null : row.email!.trim().toLowerCase();
      const key = email ?? studentKey(row.name, classroomName);
      if (seenKeys.has(key)) {
        skippedDuplicate += 1;
        continue;
      }
      seenKeys.add(key);

      // Prepare user data with default values and school assignment. A
      // student has no email: the id holds the unique username until
      // provisionStudentLogins sets the two-word one.
      const id = crypto.randomUUID();
      const userData = {
        id,
        username: email ?? id,
        displayUsername: email ?? id,
        email,
        name: row.name.trim(),
        role: role.toUpperCase(),
        password: null, // No password from CSV, will need to be set later
        cefrLevel: "A0-", // Default CEFR level
        level: 1, // Default level
        xp: 0, // Default XP
        // FR-2.1: the session school is the sole stamp source. The stored
        // user row can lag the session after a school change.
        schoolId: authUser.schoolId ?? null,
      };

      processedUsers.push(userData);
      userRoleAssignments.push({ userId: "", roleName: role }); // userId will be filled after user creation

      // Store classroom assignment for non-Admin roles.
      if ((role === "student" || role === "teacher") && classroomName) {
        classroomAssignments.push({ userId: id, classroomName, role });
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

    // FR-3.2: skip rows whose email already exists in the database so a
    // re-upload of the same file succeeds instead of failing the batch.
    // This pre-filter avoids doomed inserts; the authoritative counts come
    // from returning() below, which also covers rows that lost a race.
    const uploadEmails = processedUsers.flatMap((userData) => (userData.email ? [userData.email] : []));
    const existingEmailRows = uploadEmails.length > 0
      ? await staffDb.select({ email: users.email }).from(users)
          .where(inArray(users.email, uploadEmails))
      : [];
    const existingEmails = new Set(
      existingEmailRows
        .filter((row) => row.email !== null)
        .map((row) => row.email!.toLowerCase()),
    );
    // FR-3.2 for students: the same name already in that class of the school.
    const studentClassNames = [...new Set(
      classroomAssignments.filter((a) => a.role === "student").map((a) => a.classroomName),
    )];
    const existingStudentRows = studentClassNames.length > 0
      ? await globalDb.select({ name: users.name, classroomName: classrooms.name })
          .from(classroomStudents)
          .innerJoin(users, eq(users.id, classroomStudents.studentId))
          .innerJoin(classrooms, eq(classrooms.id, classroomStudents.classroomId))
          .where(and(
            inArray(classrooms.name, studentClassNames),
            eq(users.role, "STUDENT"),
            ...(authUser.schoolId ? [eq(classrooms.schoolId, authUser.schoolId)] : []),
          ))
      : [];
    const existingStudentKeys = new Set(
      existingStudentRows.map((row) => studentKey(row.name ?? "", row.classroomName)),
    );
    const classroomOf = new Map(classroomAssignments.map((a) => [a.userId, a.classroomName]));
    const rowsToInsert = processedUsers.filter((userData) =>
      userData.email
        ? !existingEmails.has(userData.email)
        : !existingStudentKeys.has(studentKey(userData.name, classroomOf.get(userData.id) ?? "")),
    );

    // Process users in batches
    const max = 500;
    let batch: any[] = [];
    const createdUsers: any[] = [];

    for (const userData of rowsToInsert) {
      batch.push(userData);
      if (batch.length >= max) {
        // FR-3.2: onConflictDoNothing skips rows that lost a race with an
        // existing email. returning reports only the rows actually written,
        // which also supplies the ids for role and classroom assignment.
        const insertedUsers = await staffDb.insert(users).values(batch as any)
          .onConflictDoNothing()
          .returning({ id: users.id });
        createdUsers.push(...insertedUsers);
        batch = [];
      }
    }

    if (batch.length > 0) {
      const insertedUsers = await staffDb.insert(users).values(batch as any)
        .onConflictDoNothing()
        .returning({ id: users.id });
      createdUsers.push(...insertedUsers);
    }

    // FR-3.2: rows that lost the pre-filter or the insert race are both
    // existing; only the written rows count as inserted. This keeps
    // inserted + skippedExisting + skippedDuplicate equal to the valid rows.
    const skippedExisting = processedUsers.length - createdUsers.length;

    // The ids of the rows actually written (each row carries its own id).
    const createdIds = new Set<string>(createdUsers.map((user) => user.id));

    // Assign roles to users
    const roleAssignments: { userId: string; roleId: string }[] = [];
    for (let i = 0; i < processedUsers.length; i++) {
      const userData = processedUsers[i];
      const roleData = userRoleAssignments[i];
      const userId = createdIds.has(userData.id) ? userData.id : undefined;
      const roleId = roleMap.get(roleData.roleName);

      if (userId && roleId) {
        roleAssignments.push({ userId, roleId });
      }
    }

    // Create role assignments in batches (replaces Prisma `userRole.createMany`).
    if (roleAssignments.length > 0) {
      // Drizzle doesn't have a native skipDuplicates insert, so we use
      // onConflictDoNothing on the unique index.
      await globalDb.insert(userRoles)
        .values(roleAssignments as any)
        .onConflictDoNothing();
    }

    // Handle classroom assignments
    let classroomsCreated = 0;
    let studentAssignments = 0;
    let teacherAssignments = 0;
    // FR-6: students that joined a class in this upload get a generated username and password.
    // One seed per user, so a new student in two classes is provisioned once.
    const studentSeeds = new Map<string, studentLogin.StudentLoginSeed & { classroomName: string | null }>();

    if (classroomAssignments.length > 0) {
      // Group by classroom name to avoid duplicates
      const classroomGroups = new Map<
        string,
        { userId: string; role: string }[]
      >();
      classroomAssignments.forEach((assignment) => {
        if (!createdIds.has(assignment.userId)) return; // Skip rows that were not written

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
        // Find or create classroom (replaces Prisma `classroom.findFirst`).
        // classrooms is FLAT; TenantDB enforces the school scope, so the
        // duplicate manual school check is removed.
        const [existingClassroom] = await staffDb.select().from(classrooms)
          .where(
            eq(classrooms.name, classroomName),
          )
          .limit(1);

        let classroom = existingClassroom;

        if (!classroom) {
          const ownerId =
            assignments.find((assignment) => assignment.role === "teacher")
              ?.userId ?? currentUser.id;
          // Create new classroom (replaces Prisma `classroom.create`).
          const [created] = await staffDb.insert(classrooms).values({
            name: classroomName,
            // FR-2.1: the session school is the sole stamp source.
            schoolId: authUser.schoolId ?? null,
            teacherId: ownerId,
            createdBy: currentUser.id,
          }).returning();
          classroom = created;
          classroomsCreated++;
        }

        // Assign users to classroom
        for (const assignment of assignments) {
          if (assignment.role === "student") {
            // Add student to classroom (replaces Prisma `classroomStudent.upsert`).
            await globalDb.insert(classroomStudents).values({
              classroomId: classroom.id,
              studentId: assignment.userId,
            } as any).onConflictDoNothing();
            studentAssignments++;
            if (!studentSeeds.has(assignment.userId)) {
              studentSeeds.set(assignment.userId, { userId: assignment.userId, classroomName, classroomId: classroom.id });
            }
          } else if (assignment.role === "teacher") {
            // Add teacher to classroom (replaces Prisma `classroomTeachers.findFirst + create`).
            const [existingTeacher] = await globalDb.select().from(classroomTeachers)
              .where(
                and(
                  eq(classroomTeachers.classroomId, classroom.id),
                  eq(classroomTeachers.teacherId, assignment.userId),
                ),
              )
              .limit(1);

            if (!existingTeacher) {
              await globalDb.insert(classroomTeachers).values({
                classroomId: classroom.id,
                teacherId: assignment.userId,
              } as any);
              teacherAssignments++;
            }
          }
        }
      }
    }

    // FR-6: a failure leaves the students with the id username. Report it to the teacher.
    let studentLogins: { name: string; classroomName: string | null; username: string; initialPassword: string | null }[] = [];
    let studentLoginsFailedNames: string[] = [];
    if (studentSeeds.size > 0) {
      const nameByUserId = new Map(
        processedUsers.map((userData) => [userData.id, userData.name] as const),
      );
      try {
        const { provisioned, failed } = await studentLogin.provisionStudentLogins({
          db: globalDb,
          schoolId: authUser.schoolId ?? null,
          students: Array.from(studentSeeds.values()),
        });
        studentLogins = provisioned.map((login) => ({
          name: nameByUserId.get(login.userId) ?? "",
          classroomName: studentSeeds.get(login.userId)?.classroomName ?? null,
          username: login.username,
          initialPassword: login.initialPassword,
        }));
        studentLoginsFailedNames = failed.map((f) => nameByUserId.get(f.userId) ?? f.userId);
        if (failed.length > 0) logger.error("student_login_generation_failed", { count: failed.length });
      } catch (error) {
        logger.error("student_login_generation_failed", { message: error instanceof Error ? error.message : "Unknown" });
        studentLoginsFailedNames = Array.from(studentSeeds.keys(), (id) => nameByUserId.get(id) ?? id);
      }
    }

    // FR-3.3: per-upload summary validated against the response contract.
    // Duplicates and existing rows are reported, never fatal.
    const summary = CsvUploadSummary.parse({
      inserted: createdUsers.length,
      skippedDuplicate,
      skippedExisting,
    });

    return NextResponse.json({
      success: true,
      ...summary,
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
      schoolInfo: userSchool
        ? {
            id: userSchool.id,
            name: userSchool.name,
            note: "All imported users have been assigned to this school",
          }
        : {
            note: "system user - users imported without school assignment",
          },
      note: "Users created with default values: cefrLevel=A0-, level=1, xp=0. Students get a generated username and an initial password, shown once in studentLogins.",
      studentLogins,
      studentLoginsFailed: studentLoginsFailedNames.length,
      studentLoginsFailedNames,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  } finally {
    if (tempFilePath) {
      unlink(tempFilePath, (err) => {
        if (err) {
          console.error("Error deleting temp file:", err);
        }
      });
    }
  }
}
