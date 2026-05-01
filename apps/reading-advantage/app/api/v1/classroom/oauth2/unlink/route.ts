import { cookies } from "next/headers";
import { NextResponse, NextRequest } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "google_access_token",
    value: "",
    path: "/",
    maxAge: 0,
  });

  cookieStore.set({
    name: "google_refresh_token",
    value: "",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ message: "Cookies removed" });
}
