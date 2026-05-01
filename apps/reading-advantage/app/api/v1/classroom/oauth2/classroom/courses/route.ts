import { cookies } from "next/headers";
import { NextResponse, NextRequest } from "next/server";
import { google } from "googleapis";
import oauth2Client, { getAuthenticatedClient, SCOPE } from "@/utils/classroom";
import { classroom_v1 } from "googleapis";

type Schema$Course = classroom_v1.Schema$Course;

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get("google_access_token")?.value;
  const refreshToken = req.cookies.get("google_refresh_token")?.value;
  const lastUrl =
    req.nextUrl.searchParams.get("redirect") || "/teacher/my-classes";

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

  // Function to get student count for a course
  async function getStudentCount(courseId: string) {
    try {
      const response = await classroom.courses.students.list({ courseId });
      return response.data.students ? response.data.students : [];
    } catch (error) {
      console.error(`Error fetching students for course ${courseId}:`, error);
      return [];
    }
  }

  try {
    const response = await classroom.courses.list({ teacherId: "me" });

    let filterData =
      response.data.courses?.filter((item) =>
        ["ACTIVE", "PROVISIONED"].includes(item.courseState as string)
      ) || [];

    filterData = filterData.sort(
      (a, b) =>
        new Date(a.creationTime as string).getTime() -
        new Date(b.creationTime as string).getTime()
    );

    // Fetch student count for each course
    filterData = await Promise.all(
      filterData.map(async (course) => ({
        ...course,
        studentCount: await getStudentCount(course.id!),
      }))
    );

    return NextResponse.json({ courses: filterData }, { status: 200 });
  } catch (error) {
    try {
      const auth = await getAuthenticatedClient(refreshToken);
      const classroom = google.classroom({
        version: "v1",
        auth,
      });
      const response = await classroom.courses.list({ teacherId: "me" });
      const filterData = response.data.courses
        ?.filter((item) =>
          ["ACTIVE", "PROVISIONED"].includes(item.courseState as string)
        )
        .sort(
          (a, b) =>
            new Date(a.creationTime as string).getTime() -
            new Date(b.creationTime as string).getTime()
        );
      return NextResponse.json({ courses: filterData }, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to get course", details: error },
        { status: 500 }
      );
    }
  }
}
