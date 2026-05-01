"use server";

import { z } from "zod";
import { signUpSchema } from "@/lib/zod";
import { createUser } from "@/server/models/userModel";

export async function signUpAction(value: z.infer<typeof signUpSchema>) {
  const validation = signUpSchema.safeParse(value);

  if (!validation.success) {
    return {
      error: "Invalid input data",
    };
  }

  const result = await createUser(validation.data);

  if (result.error) {
    return {
      error: result.error,
    };
  }

  return {
    success: result.success,
  };
}
