"use server";

import { generateSecureCode } from "@/lib/utils";
import {
  createClassCode,
  getClassroomStudentForLogin,
} from "@/server/models/classroomModel";

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

export async function createClassroomCode(classroomId: string) {
  const code = generateSecureCode();
  const result = await createClassCode(classroomId, code);

  if (!result) {
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
