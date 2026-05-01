import { NextResponse } from "next/server";

const DEMO_ACCOUNTS = {
  students: [
    {
      email: "demo-student-a1@reading-advantage.com",
      password: "demo123",
      level: "A1",
      name: "Alex Anderson (A1)",
    },
    {
      email: "demo-student-a2@reading-advantage.com",
      password: "demo123",
      level: "A2",
      name: "Beth Brown (A2)",
    },
    {
      email: "demo-student-b1@reading-advantage.com",
      password: "demo123",
      level: "B1",
      name: "Chris Chen (B1)",
    },
    {
      email: "demo-student-b2@reading-advantage.com",
      password: "demo123",
      level: "B2",
      name: "Diana Davis (B2)",
    },
    {
      email: "demo-student-c1@reading-advantage.com",
      password: "demo123",
      level: "C1",
      name: "Emma Evans (C1)",
    },
    {
      email: "demo-student-c2@reading-advantage.com",
      password: "demo123",
      level: "C2",
      name: "Frank Foster (C2)",
    },
  ],
  teacher: {
    email: "demo-teacher@reading-advantage.com",
    password: "demo123",
    name: "Teacher Demo",
  },
  admin: {
    email: "demo-admin@reading-advantage.com",
    password: "demo123",
    name: "Admin Demo",
  },
};

/**
 * GET /api/v1/demo/accounts
 * Returns demo account credentials
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: DEMO_ACCOUNTS,
      message: "Demo accounts retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching demo accounts:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch demo accounts",
      },
      { status: 500 }
    );
  }
}
