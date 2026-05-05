import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "@/lib/session";
import { Role } from "@prisma/client";
import { sendDiscordWebhook } from "../utils/send-discord-webhook";

// Middleware to protect routes
export interface ExtendedNextRequest extends NextRequest {
  session?: {
    user: SessionUser;
  };
}

// Middleware to protect routes
export const protect = async (
  req: ExtendedNextRequest,
  params: unknown,
  next: () => void
) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 403 }
    );
  }

  // Send user session to the next middleware
  req.session = { user };
  return next();
};

// Middleware to restrict access to specific roles
// If using the restrictTo, skip the protect middleware
export const restrictTo = (...allowedRoles: Role[]) => {
  return async (
    req: ExtendedNextRequest,
    params: unknown,
    next: () => void
  ) => {
    const user = await getCurrentUser();
    // Check if user exists
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized - Please login to access this resource" },
        { status: 403 }
      );
    }

    const { role } = user;

    // Check if the user role is allowed
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { message: "Forbidden - You are not allowed to access this resource" },
        { status: 403 }
      );
    }

    req.session = { user };
    return next();
  };
};

// Restrict access (requires access key) to a route
export const restrictAccessKey = async (
  req: NextRequest,
  params: unknown,
  next: () => void
) => {
  const { headers } = req;
  const accessKey = headers.get("Access-Key");
  if (accessKey !== process.env.ACCESS_KEY) {
    const userAgent = req.headers.get("user-agent") || "";
    const url = req.url;

    sendDiscordWebhook({
      title: "Unauthorized: Access key is required",
      embeds: [
        {
          description: {
            status: "Unauthorized",
            "triggered at": new Date().toISOString(),
            "user-agent": userAgent,
            url,
          },
          color: 880808,
        },
        {
          description: {
            "Error Details":
              "Unauthorized: reading advantage access key is required",
          },
          color: 16711680,
        },
      ],
      reqUrl: url,
      userAgent,
    }).catch(() => {
      // Webhook failure must not block the 403 response
    });

    return NextResponse.json(
      {
        message: "Unauthorized: Access key is required",
      },
      { status: 403 }
    );
  }
  return next();
};

// Check if user is accessing their own resource or is an allowed staff member
export const assertSelfOrAllowedStaff = (
  req: ExtendedNextRequest,
  routeUserId: string
): boolean => {
  const sessionUser = req.session?.user;
  if (!sessionUser) return false;
  
  if (sessionUser.id === routeUserId) return true;
  
  const allowedRoles: Role[] = [Role.ADMIN, Role.TEACHER];
  if (allowedRoles.includes(sessionUser.role)) {
    // Optionally validate if the requested user is in the caller's allowed scope
    return true;
  }
  
  return false;
};
