"use server";

import type { z } from "zod";
import type { signUpSchema } from "@/lib/zod";

/**
 * Refuses a public sign-up. Accounts are created by the school or by the SYSTEM role, never by
 * a visitor, so this action creates nothing.
 * @param _value The submitted sign-up form data, which the action ignores.
 * @returns An error result that tells the visitor to ask the school.
 */
export async function signUpAction(_value: z.infer<typeof signUpSchema>) {
  return { error: "Accounts are created by your school" };
}
