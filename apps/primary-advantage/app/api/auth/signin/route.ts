import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { signInSchema } from "@/lib/zod";
import { AuthError } from "next-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input data
    const validation = signInSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input data",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const { email, password, type } = validation.data;

    try {
      // Attempt sign in - we'll catch the redirect and handle it
      const result = await signIn("credentials", {
        email,
        password,
        type,
        redirect: false, // Important: prevent automatic redirect
      });

      // If signIn doesn't throw an error, authentication was successful
      return NextResponse.json({
        success: true,
        message: "Login successful",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case "CredentialsSignin":
            return NextResponse.json(
              {
                success: false,
                error: "Invalid email or password",
              },
              { status: 401 },
            );
          case "CallbackRouteError":
            return NextResponse.json(
              {
                success: false,
                error: "Authentication callback error",
              },
              { status: 401 },
            );
          default:
            return NextResponse.json(
              {
                success: false,
                error: "Authentication failed",
              },
              { status: 401 },
            );
        }
      }

      // Handle any other authentication errors
      console.error("Login error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "An unexpected error occurred during login",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request data",
      },
      { status: 400 },
    );
  }
}
