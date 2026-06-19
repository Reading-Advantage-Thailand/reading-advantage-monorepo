import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@reading-advantage/db/schema";
import { decrypt, encrypt } from "@/lib/encryption";

const SECRET_KEY_PATTERNS = [/apiKey/i, /secret/i, /token/i];

function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

export async function GET() {
  try {
    const allSettings = await db.select().from(settings);
    const settingsMap = Object.fromEntries(
      allSettings.map((s: { key: string; value: string }) => [
        s.key,
        isSecretKey(s.key) ? decrypt(s.value) : s.value,
      ])
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
      const storedValue = isSecretKey(key)
        ? encrypt(String(value))
        : String(value);
      await db
        .insert(settings)
        .values({ key, value: storedValue })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: storedValue },
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
