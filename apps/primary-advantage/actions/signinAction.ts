"use server";

import { signInSchema } from "@/lib/zod";
import { z } from "zod";
import { logger } from "@/lib/observability/logger";

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

  const { username, password, type } = validation.data;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      },
    );

    if (!response.ok) {
      return {
        error: "Invalid username or password",
      };
    }
  } catch (error) {
    logger.error("sign_in_failed", { error });
    return {
      error: "An unknown error occurred",
    };
  }
}
