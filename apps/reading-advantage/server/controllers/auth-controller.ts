import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "@/lib/session";
import { env } from "@/lib/env";
import { sendDiscordWebhook } from "../utils/send-discord-webhook";
import { db, and, eq } from "@reading-advantage/db";
import { users, classroomStudents, classroomTeachers } from "@reading-advantage/db/schema";
import { Role } from "@/lib/enums";

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
export const restrictTo = (...allowedRoles: string[]) => {
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
  if (accessKey !== env.ACCESS_KEY) {
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

/**
 * Returns true when the session user may read or write the given user id.
 * Self access always passes. Teachers must teach the student. Admins must
 * share the student's school. System operators keep global access.
 * @param req The request that carries the session user.
 * @param routeUserId The user id in the route.
 * @returns True when the caller is in scope.
 */
export const assertSelfOrAllowedStaff = async (
  req: ExtendedNextRequest,
  routeUserId: string
): Promise<boolean> => {
  const sessionUser = req.session?.user;
  if (!sessionUser) return false;

  if (sessionUser.id === routeUserId) return true;

  if (sessionUser.role === Role.SYSTEM) return true;

  if (sessionUser.role === Role.ADMIN) {
    const callerSchoolId = sessionUser.school_id;
    if (!callerSchoolId) return false;
    const [target] = await db
      .select({ schoolId: users.schoolId })
      .from(users)
      .where(eq(users.id, routeUserId))
      .limit(1);
    return Boolean(target?.schoolId) && target.schoolId === callerSchoolId;
  }

  if (sessionUser.role === Role.TEACHER) {
    const [link] = await db
      .select({ id: classroomStudents.id })
      .from(classroomStudents)
      .innerJoin(
        classroomTeachers,
        eq(classroomTeachers.classroomId, classroomStudents.classroomId),
      )
      .where(
        and(
          eq(classroomStudents.studentId, routeUserId),
          eq(classroomTeachers.teacherId, sessionUser.id),
        ),
      )
      .limit(1);
    return Boolean(link);
  }

  return false;
};
