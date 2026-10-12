import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { passwordSchema } from "@reading-advantage/auth";
import { currentUser } from "@/lib/session";
import {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getTeacherStatistics,
} from "@/server/models/teacherModel";
import { validateUser, checkAdminPermissions, effectiveCallerRole } from "@/server/utils/auth";
import { db } from "@reading-advantage/db";
import { AuthError } from "@reading-advantage/auth";
import { MoveTeacherSchoolError, moveTeacherToSchool } from "@reading-advantage/domain/teachers";
import { logger } from "@/lib/observability/logger";
import {
  TeacherData,
  TeachersResponse,
  CreateTeacherInput,
  UpdateTeacherInput,
} from "@/types/index";

/** The fields a teacher create accepts, as the admin forms send them. */
const createTeacherBodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().min(1).max(320),
  role: z.enum(["teacher", "admin"]),
  password: z.string().max(128).optional(),
  classroomIds: z.array(z.string().min(1).max(100)).max(200).optional(),
  force: z.boolean().optional(),
  schoolId: z.string().uuid().optional(),
});

// GET Controller - Fetch teachers
export const getTeachersController = async (
  request: NextRequest,
): Promise<NextResponse<TeachersResponse | { error: string }>> => {
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    // The school filter is for SYSTEM only (the model ignores it for other callers).
    const schoolIdParam = searchParams.get("schoolId");
    const schoolId = schoolIdParam && z.string().uuid().safeParse(schoolIdParam).success ? schoolIdParam : undefined;

    // Get teachers data using model
    const { teachers, totalCount } = await getTeachers({
      page,
      limit,
      search,
      role,
      userWithRoles,
      schoolId,
    });

    // Get statistics
    const statistics = await getTeacherStatistics(userWithRoles);

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limit);
    const pagination = {
      page,
      limit,
      total: totalCount,
      totalPages,
    };

    const response: TeachersResponse = {
      teachers,
      statistics,
      pagination,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Teacher Controller: Error in getTeachersController:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// POST Controller - Create teacher
export const createTeacherController = async (
  request: NextRequest,
): Promise<
  NextResponse<
    | { success: boolean; teacher?: TeacherData }
    | {
        error: string;
        requiresConfirmation?: boolean;
        existingSchool?: { id: string; name: string };
      }
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

    const parsedBody = createTeacherBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { name, email, role, password, classroomIds, force, schoolId }: CreateTeacherInput & { force?: boolean } =
      parsedBody.data;

    if (password !== undefined && !passwordSchema.safeParse(password).success) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    // Validate required fields
    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, role" },
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

    // Create teacher using model
    const result = await createTeacher({
      name,
      email,
      role,
      password,
      classroomIds,
      userWithRoles,
      force: force || false,
      schoolId,
    });

    if (!result.success) {
      // If confirmation is required, return special response
      if (result.requiresConfirmation) {
        return NextResponse.json(
          {
            error: result.error || "Teacher already belongs to a school",
            requiresConfirmation: true,
            existingSchool: result.existingSchool,
          },
          { status: 409 },
        );
      }

      const status = 400;
      return NextResponse.json(
        { error: result.error || "Failed to create teacher" },
        { status },
      );
    }

    return NextResponse.json(
      { success: true, teacher: result.teacher },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Teacher Controller: Error in createTeacherController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// GET by ID Controller - Fetch specific teacher
export const getTeacherByIdController = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<{ teacher: TeacherData } | { error: string }>> => {
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

    // Get teacher by ID using model
    const teacher = await getTeacherById(id, userWithRoles);
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json({ teacher }, { status: 200 });
  } catch (error) {
    console.error(
      "Teacher Controller: Error in getTeacherByIdController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

/** The fields a teacher update accepts; `role` is one of the two teacher roles. */
const updateTeacherBodySchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["teacher", "admin"]).optional(),
  cefrLevel: z.string().optional(),
  password: z.string().optional(),
  classroomIds: z.array(z.string().min(1)).optional(),
});

// PUT Controller - Update teacher
export const updateTeacherController = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<
  NextResponse<{ success: boolean; teacher?: TeacherData } | { error: string }>
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
    // Only SYSTEM changes a school, and only through POST /api/teachers/[id]/move.
    if ((body as { schoolId?: unknown })?.schoolId !== undefined && effectiveCallerRole(userWithRoles) !== "SYSTEM") {
      return NextResponse.json({ error: "Forbidden - only SYSTEM can change the school" }, { status: 403 });
    }
    const parsedBody = updateTeacherBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const updateData: UpdateTeacherInput = parsedBody.data;
    if (updateData.password !== undefined && !passwordSchema.safeParse(updateData.password).success) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    // Update teacher using model
    const result = await updateTeacher(id, updateData, userWithRoles);
    if (!result.success) {
      const status = result.error === "Teacher not found" ? 404 : 400;
      return NextResponse.json(
        { error: result.error || "Failed to update teacher" },
        { status },
      );
    }

    return NextResponse.json(
      { success: true, teacher: result.teacher },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Teacher Controller: Error in updateTeacherController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// DELETE Controller - Delete teacher
export const deleteTeacherController = async (
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

    // Delete teacher using model
    const result = await deleteTeacher(id, userWithRoles);
    if (!result.success) {
      const status = result.error === "Teacher not found" ? 404 : 400;
      return NextResponse.json(
        { error: result.error || "Failed to delete teacher" },
        { status },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(
      "Teacher Controller: Error in deleteTeacherController:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

const moveTeacherBodySchema = z.object({
  schoolId: z.string().uuid(),
  classroomIds: z.array(z.string().uuid()).max(200).default([]),
});

/**
 * Moves a teacher to another school (SYSTEM only). Calls the domain function `moveTeacherToSchool`.
 * @param request The request with the JSON body `{ schoolId, classroomIds }`.
 * @param context The route context with the teacher id.
 * @returns 200 with the move result, 400 or 409 (with `classNames`) for a refusal, 403 for a non-SYSTEM caller.
 */
export const moveTeacherController = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  try {
    const { id } = await params;
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "SYSTEM") {
      return NextResponse.json({ error: "Forbidden - SYSTEM access required" }, { status: 403 });
    }
    const parsed = moveTeacherBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const result = await moveTeacherToSchool({ db, user, input: { teacherId: id, ...parsed.data } });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    if (error instanceof MoveTeacherSchoolError) {
      logger.warn("teacher_move_refused", { code: error.code });
      return NextResponse.json(
        { error: error.message, code: error.code, classNames: error.classNames },
        { status: error.status },
      );
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Forbidden - SYSTEM access required" }, { status: 403 });
    }
    logger.error("teacher_move_failed", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
