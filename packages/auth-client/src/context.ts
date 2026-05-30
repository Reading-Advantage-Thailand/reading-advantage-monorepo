import { createContext, useContext } from "react";

export interface AuthUser {
  id: string;
  username: string;
  name: string | null;
  role: "INTERN" | "STUDENT" | "TEACHER" | "ADMIN" | "SYSTEM";
  schoolId: string | null;
  xp: number;
  level: number;
  cefrLevel: string;
  email?: string | null;
  image?: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthActions {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, name: string, schoolId: string) => Promise<void>;
  logout: () => Promise<void>;
}

export type AuthContextValue = AuthState & AuthActions;

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
