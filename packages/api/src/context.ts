import { db } from "@reading-advantage/db";
import { validateSession, type AuthContext, type UserContext, type Tenant, type Role } from "@reading-advantage/auth";
import type { Context } from "./trpc.js";
import { cookies } from "next/headers";

interface CreateContextOptions {
  authorization?: string | null;
}

export async function createContext(opts: CreateContextOptions = {}): Promise<Context> {
  let auth: AuthContext | null = null;

  try {
    // Primary: read session_token from httpOnly cookie
    const cookieStore = await cookies();
    let token = cookieStore.get("session_token")?.value;

    // Fallback: read from Authorization header (for client-side tRPC calls)
    if (!token && opts.authorization?.startsWith("Bearer ")) {
      token = opts.authorization.slice(7);
    }

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
