import oauth2Client, { SCOPE } from "@/utils/classroom";
import { cookies } from "next/headers";
import { NextResponse, NextRequest } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const lastUrl =
      req.nextUrl.searchParams.get("redirect") || "/settings/user-profile";

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
  } catch (error) {
    console.error("Error getting last URL:", error);
  }

  return NextResponse.json({ message: "Cookies removed" });
}
