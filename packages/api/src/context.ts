import { db } from "@reading-advantage/db";
import { verifyAccessToken, type AuthContext, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { Context } from "./trpc.js";

interface CreateContextOptions {
  authorization?: string | null;
}

export function createContext(opts: CreateContextOptions = {}): Context {
  let auth: AuthContext | null = null;

  if (opts.authorization?.startsWith("Bearer ")) {
    try {
      const token = opts.authorization.slice(7);
      const payload = verifyAccessToken(token);

      const user: UserContext = {
        id: payload.userId,
        email: payload.email,
        name: null,
        role: payload.role,
        schoolId: payload.schoolId,
      };

      const tenant: Tenant = {
        schoolId: payload.schoolId,
      };

      auth = { user, tenant };
    } catch {
      // Invalid token — auth stays null
    }
  }

  return { db, auth };
}
