"use server";

import { signInSchema } from "@/lib/zod";
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
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      },
    );

    if (!response.ok) {
      return {
        error: "Invalid email or password",
      };
    }
  } catch (error) {
    console.error("Sign-in error:", error);
    return {
      error: "An unknown error occurred",
    };
  }
}
