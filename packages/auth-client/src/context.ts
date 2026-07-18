import { createContext, useContext } from "react";

/** User projection returned by an application session endpoint. */
export interface AuthUser {
  id: string;
  username: string;
  name: string | null;
  role:
    | "INTERN"
    | "STUDENT"
    | "TEACHER"
    | "ADMIN"
    | "SYSTEM"
    | "SALES_REP"
    | "SALES_ADMIN"
    | "MEMBER";
  schoolId: string | null;
  xp: number;
  level: number;
  cefrLevel: string;
  email?: string | null;
  image?: string | null;
}

/** Client-side authentication and application-authorization state. */
export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** Whether the server confirmed identity but denied this application role. */
  isForbidden: boolean;
  isLoading: boolean;
}

/** Authentication actions exposed by the shared client provider. */
export interface AuthActions {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

/** Complete shared authentication context value. */
export type AuthContextValue = AuthState & AuthActions;

/** React context backing the shared authentication hooks. */
export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Returns the auth context value from the nearest AuthProvider.
 * @returns The auth context containing user state and auth actions.
 * @throws {Error} If used outside of an AuthProvider tree.
 */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
