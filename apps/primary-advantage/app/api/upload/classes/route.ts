import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync, unlink } from "fs";
import path from "path";
import { parse } from "csv/sync";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateRandomClassCode } from "@/lib/utils";

// Zod validation schemas
const classroomCsvRowSchema = z.object({
  classroom_name: z
    .string()
    .min(1, "Classroom name is required")
    .max(100, "Classroom name too long")
    .trim()
    .refine((val) => val.length > 0, "Classroom name cannot be empty")
    .refine(
      (val) => /^[\p{L}\p{M}\p{N}\s\-\/_().,]+$/u.test(val),
      "Classroom name can only contain letters, numbers, spaces, hyphens, underscores, parentheses, periods, commas, and slashes",
    ),
});

const userCsvRowSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .trim()
    .refine((val) => val.length > 0, "Name cannot be empty")
    .refine(
      (val) => /^[\p{L}\p{M}\s\-']+$/u.test(val),
      "Name can only contain letters, spaces, hyphens, and apostrophes",
    ),
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  classroom_name: z
    .string()
    .min(1, "Classroom name is required")
    .max(500, "Classroom names too long (max 500 characters)")
    .trim()
    .refine(
      (val) => /^[\p{L}\p{M}\p{N}\s\-\/_(),.]+$/u.test(val),
      "Classroom names can only contain letters, numbers, spaces, hyphens, underscores, parentheses, and commas",
    ),
  role: z.enum(["student", "teacher", "admin"], {
    errorMap: () => ({ message: "Role must be Student, Teacher, or Admin" }),
  }),
});

// CSV file validation schema
const csvFileSchema = z.object({
  name: z
    .string()
    .refine(
      (name) =>
        ["classes.csv", "students.csv", "teachers.csv"].includes(
          name.toLowerCase(),
        ),
      "Only classes.csv or students.csv or teachers.csv files are allowed",
    ),
  size: z.number().max(5 * 1024 * 1024, "File size must be less than 5MB"),
  type: z
    .string()
    .refine(
      (type) => type === "text/csv" || type === "application/csv",
      "Only CSV files are allowed",
    ),
});

const validRoles = ["student", "teacher", "admin"];

// Role validation helper
const isValidRole = (role: string): role is "student" | "teacher" | "admin" => {
  return validRoles.includes(role as any);
};

// Helper function to parse and validate multiple classroom names
const parseClassroomNames = (classroomNames: string): string[] => {
  return classroomNames
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
};

// Helper function to validate individual classroom name format
const validateClassroomNameFormat = (className: string): boolean => {
  return /^[\p{L}\p{M}\p{N}\s\-\/_(),.]+$/u.test(className);
};

// Helper function to validate classroom names exist in database
const validateClassroomNames = async (
  classroomNames: string[],
  schoolId: string | null,
): Promise<{ valid: string[]; invalid: string[] }> => {
  if (classroomNames.length === 0) {
    return { valid: [], invalid: [] };
  }

  // Batch fetch all classrooms at once instead of individual queries
  const existingClassrooms = await prisma.classroom.findMany({
    where: {
      name: { in: classroomNames },
      schoolId: schoolId,
    },
    select: { name: true },
  });

  const existingClassroomNames = new Set(existingClassrooms.map((c) => c.name));

  const valid: string[] = [];
  const invalid: string[] = [];

  for (const className of classroomNames) {
    if (existingClassroomNames.has(className)) {
      valid.push(className);
    } else {
      invalid.push(className);
    }
  }

  return { valid, invalid };
};

// Timing utility
const createTimer = (label: string) => {
  const startTime = Date.now();
  return {
    log: (operation: string, additionalData?: any) => {
      const elapsed = Date.now() - startTime;
      console.log(
        `⏱️  [${label}] ${operation}: ${elapsed}ms`,
        additionalData || "",
      );
    },
    end: (totalOperation?: string) => {
      const elapsed = Date.now() - startTime;
      console.log(`🏁 [${label}] ${totalOperation || "Total"}: ${elapsed}ms`);
      return elapsed;
    },
  };
};

export async function POST(request: NextRequest) {
  const apiTimer = createTimer("UPLOAD_CLASSES_API");
  console.log("🚀 Starting upload classes API request");

  try {
    const authTimer = createTimer("AUTH_CHECK");
    const session = await auth();
    authTimer.log("Session validation completed");
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
    authTimer.log("User data fetched");

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has permission to upload (Admin, System, or Teacher roles)
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
            "Only Admin, System, or Teacher roles can upload classes CSV files",
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
            "Users must be associated with a school to upload classes CSV files",
          ],
        },
        { status: 400 },
      );
    }
    authTimer.end("Authentication and permission checks completed");

    const fileTimer = createTimer("FILE_PROCESSING");
    const formData = await request.formData();
    const file = formData.get("file") as File;
    fileTimer.log("Form data extracted");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file using Zod schema
    try {
      csvFileSchema.parse({
        name: file.name,
        size: file.size,
        type: file.type,
      });
      fileTimer.log(
        "File validation completed",
        `File: ${file.name}, Size: ${file.size} bytes`,
      );
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const errorDetails = validationError.errors.map((err) => err.message);
        return NextResponse.json(
          {
            error: errorDetails,
            details: errorDetails,
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "File validation failed" },
        { status: 400 },
      );
    }

    const filename = file.name.toLowerCase();

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
    fileTimer.log("File saved to temp directory", `Path: ${filePath}`);

    // Parse CSV file
    const parseTimer = createTimer("CSV_PARSING");
    let csvData: any[];
    try {
      csvData = parse(buffer.toString(), {
        columns: true,
        skip_empty_lines: true,
        trim: true, // Trim whitespace from values
        skip_records_with_empty_values: true, // Skip rows with empty values
      });
      parseTimer.log("CSV parsing completed", `Rows: ${csvData.length}`);

      // Validate that we have data
      if (!Array.isArray(csvData) || csvData.length === 0) {
        return NextResponse.json(
          {
            error: "Invalid CSV content",
            details: ["CSV file must contain at least one data row"],
          },
          { status: 400 },
        );
      }

      // Validate row count limits
      const maxRows = 1000; // Maximum 1000 rows per upload
      if (csvData.length > maxRows) {
        return NextResponse.json(
          {
            error: "CSV too large",
            details: [
              `Maximum ${maxRows} rows allowed. Got ${csvData.length} rows.`,
            ],
          },
          { status: 400 },
        );
      }
      parseTimer.end("CSV validation completed");
    } catch (parseError) {
      console.error("CSV parsing failed", parseError);
      return NextResponse.json(
        {
          error: "CSV parsing failed",
          details: [
            "Unable to parse CSV file. Please ensure it's a valid CSV format.",
          ],
        },
        { status: 400 },
      );
    }

    // Validate CSV headers with Zod
    if (csvData.length > 0) {
      const firstRow = csvData[0];
      const headers = Object.keys(firstRow);

      // Define expected headers for each file type
      const expectedHeadersClasses = ["classroom_name"];
      const expectedHeadersUsers = ["name", "email", "classroom_name", "role"];

      let expectedHeaders: string[] = [];
      let headerSchema: z.ZodSchema;

      if (filename === "students.csv" || filename === "teachers.csv") {
        expectedHeaders = expectedHeadersUsers;
      } else if (filename === "classes.csv") {
        expectedHeaders = expectedHeadersClasses;
      }

      // Validate headers exist and match expected format
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
    const validationTimer = createTimer("DATA_VALIDATION");
    const processedClasses: any[] = [];
    const processedUsers: any[] = [];
    const errors: string[] = [];

    if (filename === "students.csv" || filename === "teachers.csv") {
      console.log("📊 Starting users CSV validation and processing...");

      // Pre-process and validate all rows first
      const validatedRows: Array<{
        row: any;
        rowNumber: number;
        validatedData?: any;
        error?: string;
      }> = [];

      // First pass: Zod validation and basic format checks
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const rowNumber = i + 2; // +2 because CSV is 1-indexed and has header

        try {
          const validatedRow = userCsvRowSchema.parse(row);
          validatedRows.push({ row, rowNumber, validatedData: validatedRow });
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            const errorMessage = validationError.errors
              .map((err) => err.message)
              .join("; ");
            validatedRows.push({
              row,
              rowNumber,
              error: `Row ${rowNumber}: ${errorMessage}`,
            });
          } else {
            validatedRows.push({
              row,
              rowNumber,
              error: `Row ${rowNumber}: Validation failed`,
            });
          }
          continue;
        }
      }

      // Check for duplicate emails within the current upload (O(n²) but only once)
      const emailSet = new Set<string>();
      for (const item of validatedRows) {
        if (item.validatedData) {
          const email = item.validatedData.email.toLowerCase();
          if (emailSet.has(email)) {
            item.error = `Row ${item.rowNumber}: Duplicate email '${item.validatedData.email}' within the same upload`;
            item.validatedData = undefined;
          } else {
            emailSet.add(email);
          }
        }
      }

      // Batch check existing users in database (single query instead of N queries)
      const validEmails = validatedRows
        .filter((item) => item.validatedData && !item.error)
        .map((item) => item.validatedData!.email.toLowerCase());

      let existingUsers: Array<{ email: string | null }> = [];
      if (validEmails.length > 0) {
        existingUsers = await prisma.user.findMany({
          where: { email: { in: validEmails } },
          select: { email: true },
        });
      }

      const existingEmailSet = new Set(
        existingUsers
          .filter((u) => u.email !== null)
          .map((u) => u.email!.toLowerCase()),
      );

      // Collect all unique classroom names for batch validation
      const allClassroomNames = new Set<string>();
      for (const item of validatedRows) {
        if (
          item.validatedData &&
          !item.error &&
          item.validatedData.role !== "admin"
        ) {
          const classroomNames = parseClassroomNames(
            item.validatedData.classroom_name,
          );
          for (const name of classroomNames) {
            allClassroomNames.add(name);
          }
        }
      }

      // Batch validate all classroom names at once
      let classroomValidationResult: { valid: string[]; invalid: string[] } = {
        valid: [],
        invalid: [],
      };
      if (allClassroomNames.size > 0) {
        classroomValidationResult = await validateClassroomNames(
          Array.from(allClassroomNames),
          currentUser.schoolId,
        );
      }

      const validClassroomSet = new Set(classroomValidationResult.valid);
      const invalidClassroomSet = new Set(classroomValidationResult.invalid);

      // Second pass: Process validated rows and apply business logic
      for (const item of validatedRows) {
        if (item.error || !item.validatedData) {
          errors.push(item.error!);
          continue;
        }

        const validatedRow = item.validatedData;
        const rowNumber = item.rowNumber;

        // Check if user already exists in database
        if (existingEmailSet.has(validatedRow.email.toLowerCase())) {
          errors.push(
            `Row ${rowNumber}: User with email '${validatedRow.email}' already exists`,
          );
          continue;
        }

        // Parse and validate classroom names for non-Admin roles
        if (validatedRow.role !== "admin") {
          const classroomNames = parseClassroomNames(
            validatedRow.classroom_name,
          );

          if (classroomNames.length === 0) {
            errors.push(
              `Row ${rowNumber}: At least one valid classroom name is required for ${validatedRow.role} role`,
            );
            continue;
          }

          // Validate maximum number of classroom assignments per user
          const maxClassroomsPerUser = 10;
          if (classroomNames.length > maxClassroomsPerUser) {
            errors.push(
              `Row ${rowNumber}: Too many classroom assignments. Maximum ${maxClassroomsPerUser} classrooms allowed per user. Got ${classroomNames.length} classrooms.`,
            );
            continue;
          }

          // Validate individual classroom name formats and lengths
          const invalidFormats = classroomNames.filter(
            (name) => !validateClassroomNameFormat(name),
          );
          if (invalidFormats.length > 0) {
            errors.push(
              `Row ${rowNumber}: Invalid classroom name format(s): ${invalidFormats.join(", ")}. Classroom names can only contain letters, numbers, spaces, hyphens, underscores, and parentheses.`,
            );
            continue;
          }

          // Validate individual classroom name lengths
          const tooLongNames = classroomNames.filter(
            (name) => name.length > 50,
          );
          if (tooLongNames.length > 0) {
            errors.push(
              `Row ${rowNumber}: Classroom name(s) too long: ${tooLongNames.join(", ")}. Maximum 50 characters per classroom name.`,
            );
            continue;
          }

          // Check for duplicate classroom names within the same user assignment
          const uniqueClassrooms = new Set(
            classroomNames.map((name) => name.toLowerCase()),
          );
          if (uniqueClassrooms.size !== classroomNames.length) {
            errors.push(
              `Row ${rowNumber}: Duplicate classroom names found in the same assignment. Please remove duplicates.`,
            );
            continue;
          }

          // Validate that all classroom names exist in database (using pre-fetched results)
          const invalidClassrooms = classroomNames.filter((name) =>
            invalidClassroomSet.has(name),
          );
          if (invalidClassrooms.length > 0) {
            errors.push(
              `Row ${rowNumber}: Invalid classroom names: ${invalidClassrooms.join(", ")}. These classrooms do not exist in your school.`,
            );
            continue;
          }
        }

        // Prepare user data with default values and school assignment
        const userData = {
          email: validatedRow.email.toLowerCase().trim(),
          name: validatedRow.name.trim(),
          password: null,
          schoolId: currentUser.schoolId,
          classroomNames:
            validatedRow.role !== "admin"
              ? parseClassroomNames(validatedRow.classroom_name)
              : [],
        };

        processedUsers.push(userData);
      }

      validationTimer.log(
        "Users validation completed",
        `Processed: ${processedUsers.length}, Errors: ${errors.length}`,
      );
    }
    if (filename === "classes.csv") {
      console.log("🏫 Starting classes CSV validation and processing...");

      // Pre-process and validate all rows first
      const validatedRows: Array<{
        row: any;
        rowNumber: number;
        validatedData?: any;
        error?: string;
      }> = [];

      // First pass: Zod validation and basic format checks
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const rowNumber = i + 2;

        try {
          const validatedRow = classroomCsvRowSchema.parse(row);
          validatedRows.push({ row, rowNumber, validatedData: validatedRow });
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            const errorMessage = validationError.errors
              .map((err) => err.message)
              .join("; ");
            validatedRows.push({
              row,
              rowNumber,
              error: `Row ${rowNumber}: ${errorMessage}`,
            });
          } else {
            validatedRows.push({
              row,
              rowNumber,
              error: `Row ${rowNumber}: Validation failed`,
            });
          }
          continue;
        }
      }

      // Check for duplicate classroom names within the current upload
      const classroomNameSet = new Set<string>();
      for (const item of validatedRows) {
        if (item.validatedData) {
          const name = item.validatedData.classroom_name.trim().toLowerCase();
          if (classroomNameSet.has(name)) {
            item.error = `Row ${item.rowNumber}: Duplicate classroom name '${item.validatedData.classroom_name.trim()}' within the same upload`;
            item.validatedData = undefined;
          } else {
            classroomNameSet.add(name);
          }
        }
      }

      // Batch check existing classrooms in database (single query instead of N queries)
      const validClassroomNames = validatedRows
        .filter((item) => item.validatedData && !item.error)
        .map((item) => item.validatedData!.classroom_name.trim());

      let existingClassrooms: Array<{ name: string }> = [];
      if (validClassroomNames.length > 0) {
        existingClassrooms = await prisma.classroom.findMany({
          where: {
            name: { in: validClassroomNames },
            schoolId: currentUser.schoolId,
          },
          select: { name: true },
        });
      }

      const existingClassroomNameSet = new Set(
        existingClassrooms.map((c) => c.name.toLowerCase()),
      );

      // Second pass: Process validated rows and apply business logic
      for (const item of validatedRows) {
        if (item.error || !item.validatedData) {
          errors.push(item.error!);
          continue;
        }

        const validatedRow = item.validatedData;
        const rowNumber = item.rowNumber;

        // Check for duplicate classroom names in the same school
        if (
          existingClassroomNameSet.has(
            validatedRow.classroom_name.trim().toLowerCase(),
          )
        ) {
          errors.push(
            `Row ${rowNumber}: Classroom '${validatedRow.classroom_name.trim()}' already exists in this school`,
          );
          continue;
        }

        // Prepare classroom data
        const classroomData = {
          name: validatedRow.classroom_name.trim(),
          classCode: generateRandomClassCode(),
          schoolId: currentUser.schoolId,
        };

        processedClasses.push(classroomData);
      }

      validationTimer.log(
        "Classes validation completed",
        `Processed: ${processedClasses.length}, Errors: ${errors.length}`,
      );
    }
    validationTimer.end("Data validation and processing completed");
    console.log("errors: ", errors);

    // If there are validation errors, return them
    if (errors.length > 0) {
      unlink(filePath, (err) => {
        if (err) {
          console.error("Error deleting temp file:", err);
        }
      });
      return NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
          validatedRows: processedClasses.length,
          totalRows: csvData.length,
        },
        { status: 400 },
      );
    }

    // Create classrooms in batches
    const dbTimer = createTimer("DATABASE_OPERATIONS");
    const max = 1000;
    let batch: any[] = [];
    let createdClassrooms: any[] = [];

    // Variables for user processing statistics
    let createdUsers: any[] = [];
    let roleAssignments: any[] = [];
    let classroomsAssigned = 0;
    let studentAssignments = 0;
    let teacherAssignments = 0;

    if (filename === "students.csv" || filename === "teachers.csv") {
      console.log("👥 Starting user creation and assignment processes...");
      // Get all roles from database
      const roles = await prisma.role.findMany();
      const roleMap = new Map(roles.map((role) => [role.name, role.id]));
      dbTimer.log(
        "Roles fetched from database",
        `Roles count: ${roles.length}`,
      );

      // Process users in batches
      batch = []; // Reset batch for user processing

      for (const userData of processedUsers) {
        batch.push({
          email: userData.email,
          name: userData.name,
          password: userData.password,
          cefrLevel: "A0-", // Default CEFR level
          level: 1, // Default level
          xp: 0, // Default XP
          schoolId: userData.schoolId,
        });

        if (batch.length >= max) {
          // Create users in batches
          const batchTimer = createTimer("USER_BATCH_CREATE");
          await prisma.user.createMany({
            data: batch,
            skipDuplicates: true, // Skip users with duplicate emails
          });
          batchTimer.log("User batch created", `Batch size: ${batch.length}`);

          // Get the created users to assign roles and classrooms
          const emails = batch.map((u) => u.email);
          const users = await prisma.user.findMany({
            where: { email: { in: emails } },
            select: { id: true, email: true },
          });
          createdUsers.push(...users);
          batchTimer.end("User batch processing completed");
          batch = [];
        }
      }

      // Process remaining batch
      if (batch.length > 0) {
        const finalBatchTimer = createTimer("FINAL_USER_BATCH");
        await prisma.user.createMany({
          data: batch,
          skipDuplicates: true,
        });

        // Get the created users to assign roles and classrooms
        const emails = batch.map((u) => u.email);
        const users = await prisma.user.findMany({
          where: { email: { in: emails } },
          select: { id: true, email: true },
        });
        createdUsers.push(...users);
        finalBatchTimer.end("Final user batch completed");
      }
      dbTimer.log("All users created", `Total users: ${createdUsers.length}`);

      // Create user-email to user-id mapping
      const emailToUserId = new Map(
        createdUsers.map((user) => [user.email, user.id]),
      );

      // Assign roles to users - optimized with pre-built role map
      roleAssignments = [];

      // Pre-build CSV role map for O(n) lookup instead of O(n²)
      const csvRoleMap = new Map<string, string>();
      for (const row of csvData) {
        csvRoleMap.set(row.email.toLowerCase().trim(), row.role?.trim());
      }

      for (const userData of processedUsers) {
        const userId = emailToUserId.get(userData.email);
        const roleName = csvRoleMap.get(userData.email);
        const roleId = roleName ? roleMap.get(roleName) : undefined;

        if (userId && roleId) {
          roleAssignments.push({ userId, roleId });
        }
      }

      // Create role assignments in batches
      if (roleAssignments.length > 0) {
        const roleTimer = createTimer("ROLE_ASSIGNMENTS");
        await prisma.userRole.createMany({
          data: roleAssignments,
          skipDuplicates: true,
        });
        roleTimer.end("Role assignments completed");
        dbTimer.log(
          "Role assignments created",
          `Total assignments: ${roleAssignments.length}`,
        );
      }

      // Handle classroom assignments for non-Admin roles
      const classroomTimer = createTimer("CLASSROOM_ASSIGNMENTS");
      classroomsAssigned = 0;
      studentAssignments = 0;
      teacherAssignments = 0;

      console.log("🎓 Starting classroom assignments...");

      // Pre-process data for better performance
      const userRoleMap = new Map<string, string>();
      const classroomNameToIdMap = new Map<string, string>();
      const uniqueClassroomNames = new Set<string>();

      // Build user role map from CSV data (O(n) instead of O(n²))
      for (const row of csvData) {
        userRoleMap.set(row.email.toLowerCase().trim(), row.role?.trim());
      }

      // Collect all unique classroom names and build classroom ID map
      for (const userData of processedUsers) {
        for (const className of userData.classroomNames) {
          uniqueClassroomNames.add(className);
        }
      }

      // Batch fetch all classrooms at once
      if (uniqueClassroomNames.size > 0) {
        const classrooms = await prisma.classroom.findMany({
          where: {
            name: { in: Array.from(uniqueClassroomNames) },
            schoolId: currentUser.schoolId,
          },
          select: { id: true, name: true },
        });

        for (const classroom of classrooms) {
          classroomNameToIdMap.set(classroom.name, classroom.id);
        }
      }

      // Prepare batch operations
      const studentAssignmentsToCreate: Array<{
        classroomId: string;
        studentId: string;
      }> = [];
      const teacherAssignmentsToCreate: Array<{
        classroomId: string;
        userId: string;
      }> = [];
      const existingTeacherChecks: Array<{
        classroomId: string;
        userId: string;
      }> = [];

      // Process users and prepare batch operations
      for (const userData of processedUsers) {
        const userId = emailToUserId.get(userData.email);
        if (!userId || userData.classroomNames.length === 0) continue;

        const userRole = userRoleMap.get(userData.email);
        if (userRole === "admin") continue;

        for (const className of userData.classroomNames) {
          const classroomId = classroomNameToIdMap.get(className);
          if (!classroomId) continue;

          if (userRole === "student") {
            studentAssignmentsToCreate.push({
              classroomId,
              studentId: userId,
            });
          } else if (userRole === "teacher") {
            existingTeacherChecks.push({
              classroomId,
              userId,
            });
          }
        }

        if (userData.classroomNames.length > 0) {
          classroomsAssigned++;
        }
      }

      // Batch check existing teacher assignments
      if (existingTeacherChecks.length > 0) {
        const existingTeachers = await prisma.classroomTeachers.findMany({
          where: {
            OR: existingTeacherChecks.map((check) => ({
              classroomId: check.classroomId,
              userId: check.userId,
            })),
          },
          select: { classroomId: true, userId: true },
        });

        const existingTeacherSet = new Set(
          existingTeachers.map((et) => `${et.classroomId}-${et.userId}`),
        );

        // Filter out existing teacher assignments
        for (const check of existingTeacherChecks) {
          if (!existingTeacherSet.has(`${check.classroomId}-${check.userId}`)) {
            teacherAssignmentsToCreate.push(check);
          }
        }
      }

      // Batch create student assignments using upsertMany (if available) or individual upserts
      if (studentAssignmentsToCreate.length > 0) {
        // Use createMany with skipDuplicates for better performance
        try {
          await prisma.classroomStudent.createMany({
            data: studentAssignmentsToCreate,
            skipDuplicates: true,
          });
          studentAssignments = studentAssignmentsToCreate.length;
        } catch (error) {
          // Fallback to individual upserts if createMany fails
          console.log("Falling back to individual student upserts...");
          for (const assignment of studentAssignmentsToCreate) {
            await prisma.classroomStudent.upsert({
              where: {
                classroomId_studentId: {
                  classroomId: assignment.classroomId,
                  studentId: assignment.studentId,
                },
              },
              update: {},
              create: assignment,
            });
          }
          studentAssignments = studentAssignmentsToCreate.length;
        }
      }

      // Batch create teacher assignments
      if (teacherAssignmentsToCreate.length > 0) {
        await prisma.classroomTeachers.createMany({
          data: teacherAssignmentsToCreate,
          skipDuplicates: true,
        });
        teacherAssignments = teacherAssignmentsToCreate.length;
      }

      classroomTimer.end("Classroom assignments completed");
      dbTimer.log(
        "Classroom assignments summary",
        `Students: ${studentAssignments}, Teachers: ${teacherAssignments}, Users assigned: ${classroomsAssigned}`,
      );

      // Update createdClassrooms for response (empty for students.csv or teachers.csv)
      createdClassrooms = [];
    }

    if (filename === "classes.csv") {
      console.log("🏫 Creating classroom records...");
      const classCreationTimer = createTimer("CLASS_CREATION");
      await prisma.classroom.createMany({
        data: processedClasses,
        skipDuplicates: true,
      });
      classCreationTimer.end("Classroom creation completed");
      dbTimer.log(
        "Classes created",
        `Total classes: ${processedClasses.length}`,
      );
    }
    dbTimer.end("All database operations completed");

    // Delete temp file
    const cleanupTimer = createTimer("CLEANUP_RESPONSE");
    unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting temp file:", err);
      }
    });
    cleanupTimer.log("Temp file cleanup completed");

    // Prepare response message and stats based on file type
    let message = "";
    let note = "";
    let stats: any = {
      totalRows: csvData.length,
      errors: errors.length,
    };

    if (filename === "students.csv" || filename === "teachers.csv") {
      message = "Users uploaded and created successfully";
      note =
        "Users created with default values: password=null, cefrLevel=A0-, level=1, xp=0. Users need to set passwords before they can log in.";
      stats = {
        ...stats,
        processedUsers: processedUsers.length,
        createdUsers: createdUsers?.length || 0,
        roleAssignments: roleAssignments?.length || 0,
        classroomsAssigned: classroomsAssigned || 0,
        studentAssignments: studentAssignments || 0,
        teacherAssignments: teacherAssignments || 0,
      };
    } else if (filename === "classes.csv") {
      message = "Classes uploaded and created successfully";
      note =
        "Classes created successfully. You can now import students and teachers to assign them to these classes.";
      stats = {
        ...stats,
        processedClasses: processedClasses.length,
        createdClassrooms: createdClassrooms.length,
      };
    }
    cleanupTimer.log("Response data prepared");

    const totalTime = apiTimer.end("Upload classes API request completed");
    console.log(`✅ API request completed successfully in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      message: message,
      fileName: fileName,
      filePath: filePath,
      originalName: file.name,
      size: file.size,
      timestamp: timestamp,
      stats: stats,
      performanceStats: {
        totalExecutionTime: totalTime,
        processedAt: new Date().toISOString(),
      },
      schoolInfo: currentUser.School
        ? {
            id: currentUser.School.id,
            name: currentUser.School.name,
            note:
              filename === "students.csv" || filename === "teachers.csv"
                ? "All imported users have been assigned to this school"
                : "All imported classes have been assigned to this school",
          }
        : {
            note: "system user - data imported without school assignment",
          },
      classrooms: createdClassrooms,
      note: note,
    });
  } catch (error) {
    const errorTime = apiTimer.end("Upload classes API request failed");
    console.error(`❌ Classes upload error after ${errorTime}ms:`, error);
    return NextResponse.json(
      {
        error: "Failed to upload classes file",
        performanceStats: {
          totalExecutionTime: errorTime,
          failedAt: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
