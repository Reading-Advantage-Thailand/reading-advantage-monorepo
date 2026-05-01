import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import oauth2Client from "@/utils/classroom";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json({ error: "Google Oauth Error :" + error });
  }

  if (!code) {
    return NextResponse.json({ error: "Authorization code not found" });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code as string);

    const cookieStore = await cookies();
    cookieStore.set({
      name: "google_access_token",
      value: tokens.access_token || "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 3600,
    });
    cookieStore.set({
      name: "google_refresh_token",
      value: tokens.refresh_token || "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    const lastUrl = cookieStore.get("last_url")?.value || "/teacher/my-classes";

    return NextResponse.redirect(
      new URL(lastUrl, process.env.NEXT_PUBLIC_BASE_URL).toString()
    );
  } catch (error) {
    return NextResponse.json({
      error: "Google Oauth Error failed to exchange code:" + error,
    });
  }
}
