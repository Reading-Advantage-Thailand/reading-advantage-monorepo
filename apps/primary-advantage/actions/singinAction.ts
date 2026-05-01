"use server";

import { signIn } from "@/lib/auth";
import { signInSchema } from "@/lib/zod";
import { AuthError } from "next-auth";
import { z } from "zod";

export async function signInAction(
  value: z.infer<typeof signInSchema>,
  callbackUrl?: string,
) {
  const validation = signInSchema.safeParse(value);

  if (!validation.success) {
    return {
      error: "Invalid input data",
    };
  }

  const { email, password, type } = validation.data;

  try {
    await signIn("credentials", {
      type,
      email,
      password,
      // redirectTo: callbackUrl || "/auth/signin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return {
            error: "Invalid email or password",
          };
        default:
          return {
            error: "An unknown error occurred",
          };
      }
    }
    throw error;
  }
}
