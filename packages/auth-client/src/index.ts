import { useAuthContext, type AuthUser, type AuthContextValue } from "./context.js";
import { AuthProvider } from "./provider.js";

export function useAuth(): AuthContextValue {
  return useAuthContext();
}

export function useSession(): {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
} {
  const { user, isAuthenticated, isLoading } = useAuthContext();
  return { user, isAuthenticated, isLoading };
}

export function useRequireAuth(): AuthContextValue {
  const auth = useAuthContext();

  if (!auth.isLoading && !auth.isAuthenticated) {
    throw new Error("Authentication required");
  }

  return auth;
}

export { AuthProvider };
export type { AuthUser, AuthState, AuthActions, AuthContextValue } from "./context.js";
