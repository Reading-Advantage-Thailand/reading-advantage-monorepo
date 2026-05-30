import { useAuthContext, type AuthUser, type AuthContextValue } from "./context.js";
import { AuthProvider } from "./provider.js";

/**
 * Returns the full auth context value including state and actions.
 * @returns The auth context containing user, isAuthenticated, isLoading, and auth actions.
 */
export function useAuth(): AuthContextValue {
  return useAuthContext();
}

/**
 * Returns a subset of auth state: user, isAuthenticated, and isLoading.
 * @returns An object containing user, isAuthenticated, and isLoading values.
 */
export function useSession(): {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
} {
  const { user, isAuthenticated, isLoading } = useAuthContext();
  return { user, isAuthenticated, isLoading };
}

/**
 * Returns the auth context, throwing if the user is not authenticated.
 * Use this hook to protect routes that require authentication.
 * @returns The auth context containing user, isAuthenticated, and auth actions.
 * @throws {Error} If the user is not authenticated and not still loading.
 */
export function useRequireAuth(): AuthContextValue {
  const auth = useAuthContext();

  if (!auth.isLoading && !auth.isAuthenticated) {
    throw new Error("Authentication required");
  }

  return auth;
}

export { AuthProvider };
export type { AuthUser, AuthState, AuthActions, AuthContextValue } from "./context.js";
