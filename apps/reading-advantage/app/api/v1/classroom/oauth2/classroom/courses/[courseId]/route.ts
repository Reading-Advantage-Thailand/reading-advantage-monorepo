import { cookies } from "next/headers";
import { NextResponse, NextRequest } from "next/server";
import { google } from "googleapis";
import oauth2Client, { getAuthenticatedClient, SCOPE } from "@/utils/classroom";
import { classroom_v1 } from "googleapis";
import db from "@/configs/firestore-config";

type Schema$Course = classroom_v1.Schema$Course;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await ctx.params;
  const accessToken = req.cookies.get("google_access_token")?.value;
  const refreshToken = req.cookies.get("google_refresh_token")?.value;
  const lastUrl =
    req.nextUrl.searchParams.get("redirect") ||
    `/teacher/class-roster/${courseId}`;

  if (!accessToken && !refreshToken) {
    const cookieStore = await cookies();
    cookieStore.set({
      name: "last_url",
      value: lastUrl,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 300, // 5 minutes expiration
    });
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPE,
      prompt: "consent",
      include_granted_scopes: true,
    });
    return NextResponse.json({ authUrl }, { status: 200 });
  }

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const classroom = google.classroom({
    version: "v1",
    auth: oauth2Client,
  });

  try {
    const response = await classroom.courses.students.list({ courseId });
    const studentsInClass = response.data.students
      ? response.data.students
      : [];
    const classroomRef = await db
      .collection("classroom")
      .where("googleClassroomId", "==", courseId)
      .get();

    const classroomId = classroomRef.docs[0].id;

    if (!studentsInClass.length) {
      return NextResponse.json(
        { message: "No Student in Class" },
        { status: 401 }
      );
    } else {
      const students = studentsInClass.map((student) => ({
        email: student.profile?.emailAddress,
        lastActivity: "No activity",
      }));

      await db.collection("classroom").doc(classroomId).update({
        student: students,
      });

      return NextResponse.json(
        { message: "Sync student success" },
        { status: 200 }
      );
    }
  } catch (error) {
    try {
      const auth = await getAuthenticatedClient(refreshToken);

      const classroom = google.classroom({
        version: "v1",
        auth,
      });
      const response = await classroom.courses.students.list({ courseId });
      const studentsInClass = response.data.students
        ? response.data.students
        : [];

      console.log("refresh Token Doing");
      const classroomRef = await db
        .collection("classroom")
        .where("googleClassroomId", "==", courseId)
        .get();

      const classroomId = classroomRef.docs[0].id;

      if (!studentsInClass.length) {
        return NextResponse.json(
          { message: "No Student in Class" },
          { status: 401 }
        );
      } else {
        const students = studentsInClass.map((student) => ({
          email: student.profile?.emailAddress,
          lastActivity: "No activity",
        }));

        await db.collection("classroom").doc(classroomId).update({
          student: students,
        });

        return NextResponse.json(
          { message: "Sync student success" },
          { status: 200 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to get course", details: error },
        { status: 500 }
      );
    }
  }
}
