import { google } from "googleapis";
import { cookies } from "next/headers";

// Configure OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.CLASSROOM_CLIENT_ID,
  process.env.CLASSROOM_CLIENT_SECRET,
  process.env.CLASSROOM_REDIRECT_URI
);

export const SCOPE = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me",
  "https://www.googleapis.com/auth/classroom.coursework.students",
  "https://www.googleapis.com/auth/classroom.rosters.readonly",
  "https://www.googleapis.com/auth/classroom.profile.emails",
];

export async function getAuthenticatedClient(refreshToken?: string) {
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  // Auto-refresh token if expired
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.refresh_token) {
      console.log("New refresh token received:", tokens.refresh_token);
    }
    const cookieStore = await cookies();
    cookieStore.set({
      name: "google_refresh_token",
      value: tokens.refresh_token || "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  });

  return oauth2Client;
}

export default oauth2Client;
