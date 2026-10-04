"use server";

import { generateSecureCode } from "@/lib/utils";
import { createClassCode } from "@/server/models/classroomModel";
import { currentUser } from "@/lib/session";
import { isStaffRole } from "@/lib/permissions";

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
