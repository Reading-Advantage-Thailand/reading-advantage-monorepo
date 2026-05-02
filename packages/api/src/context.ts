import { db } from "@reading-advantage/db";
import { validateSession, type AuthContext, type UserContext, type Tenant, type Role } from "@reading-advantage/auth";
import type { Context } from "./trpc.js";
import { cookies } from "next/headers";

export async function createContext(): Promise<Context> {
  let auth: AuthContext | null = null;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;

    if (token) {
      const session = await validateSession(db, token);
      if (session) {
        const user: UserContext = {
          id: session.user.id,
          username: session.user.username,
          name: session.user.name,
          role: session.user.role as Role,
          schoolId: session.user.schoolId,
        };

        const tenant: Tenant = {
          schoolId: session.user.schoolId,
        };

        auth = { user, tenant };
      }
    }
  } catch {
    // Session validation failed — auth stays null
  }

  return { db, auth };
}
