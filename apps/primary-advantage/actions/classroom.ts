"use server";

import { generateSecureCode } from "@/lib/utils";
import {
  createClassCode,
  getClassroomStudentForLogin,
} from "@/server/models/classroomModel";
import { currentUser } from "@/lib/session";
import { isStaffRole } from "@/lib/permissions";

export async function fetchStudentsByClassCode(code: string) {
  if (!code || typeof code !== "string") {
    return { success: false, error: "Code is required" };
  }

  const result = await getClassroomStudentForLogin(code);
  const data = await result.json();

  if (!result.ok) {
    return {
      success: false,
      error: data.error,
      status: result.status,
    };
  }

  return {
    success: true,
    students: data.students,
  };
}

/**
 * Creates a code for a classroom that the authenticated actor can manage.
 * @param classroomId The classroom identifier.
 * @returns The code result.
 */
export async function createClassroomCode(classroomId: string) {
  const actor = await currentUser();
  if (!actor || !isStaffRole(actor.role)) {
    return { success: false, error: "Unauthorized" };
  }
  const code = generateSecureCode();
  const result = await createClassCode(classroomId, code, actor);

  if (!result || result instanceof Response) {
    return {
      success: false,
      error: "Failed to create classroom code",
    };
  }

  return {
    success: true,
    code,
  };
}
