import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@reading-advantage/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allSettings = await db.select().from(settings);
    const settingsMap = Object.fromEntries(
      allSettings.map((s: { key: string; value: string }) => [s.key, s.value])
    );
    return NextResponse.json(settingsMap);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entries = Object.entries(body) as [string, string][];

    for (const [key, value] of entries) {
      await db
        .insert(settings)
        .values({ key, value: String(value) })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: String(value) },
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to save settings" },
      { status: 500 }
    );
  }
}
