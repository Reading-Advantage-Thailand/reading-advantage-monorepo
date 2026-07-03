/**
 * `/api/settings` — read/write marketing app settings.
 *
 * **Auth policy:** authentication required. Unauthenticated callers receive
 * **401** before any DB access; the guard short-circuits before `decrypt`
 * so encrypted secrets are never materialised for anonymous callers.
 *
 * **Secret masking for authenticated callers:** secret keys (`apiKey`,
 * `secret`, `token`) are returned as a `••••` placeholder so the settings
 * UI can render "key set" without ever exfiltrating the decrypted
 * plaintext. Plaintext secrets are accepted only on `POST` to upsert.
 *
 * **Tenant/owner policy:** marketing tables are global-internal and are
 * not scoped by `schoolId`. Auth + role floor is the access boundary.
 *
 * @see apps/marketing/app/lib/auth.ts
 * @see apps/marketing/app/lib/encryption.ts
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@reading-advantage/db/schema";
import { encrypt } from "@/lib/encryption";
import { requireMarketingSession } from "@/lib/auth";
import { settingsPostSchema } from "@/lib/settings-schema";

const SECRET_KEY_PATTERNS = [/apiKey/i, /secret/i, /token/i];

function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Masked placeholder returned for secret keys. The settings UI only needs
 * to know a key is configured; it never needs the plaintext.
 */
const MASKED_SECRET = "••••";

/**
 * GET /api/settings — list all settings with secret values masked.
 *
 * Guard contract: 401 without a valid session, before any DB read.
 * Masking contract: secret keys (`apiKey`, `secret`, `token`) are returned
 * as a `••••` placeholder; the route never invokes `decrypt` so the
 * plaintext never enters the response.
 */
export async function GET(request: Request) {
  const guard = await requireMarketingSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const allSettings = await db.select().from(settings);
    const settingsMap = Object.fromEntries(
      allSettings.map((s: { key: string; value: string }) => [
        s.key,
        // Never return decrypted plaintext over the wire; return a
        // masked placeholder for any secret-shaped key. Non-secret keys
        // are returned as-is.
        isSecretKey(s.key) ? MASKED_SECRET : s.value,
      ]),
    );
    return NextResponse.json(settingsMap);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load settings" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/settings — upsert one or more settings.
 *
 * Guard contract: 401 without a valid session, before any DB write. The
 * body is validated with a Zod schema (object of string values) before
 * any insert is issued.
 */
export async function POST(request: Request) {
  const guard = await requireMarketingSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = settingsPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid settings payload",
        error: parsed.error.message,
      },
      { status: 400 },
    );
  }

  try {
    for (const [key, value] of Object.entries(parsed.data)) {
      const storedValue = isSecretKey(key) ? encrypt(value) : value;
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
      { status: 500 },
    );
  }
}