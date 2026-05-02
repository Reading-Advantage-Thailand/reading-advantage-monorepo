"use client";

import { useSession as useNewSession } from "@reading-advantage/auth-client";

/**
 * Compatibility shim for NextAuth's useSession.
 * Maps our new auth system to the NextAuth session shape.
 */
export function useSession() {
  const { user, isAuthenticated, isLoading } = useNewSession();

  return {
    data: user ? { user } : null,
    status: isLoading ? "loading" : isAuthenticated ? "authenticated" : "unauthenticated",
    update: async () => {
      // No-op for now — our auth handles refresh automatically
    },
  };
}

export function signIn() {
  // Deprecated — use useAuth().login() instead
  console.warn("signIn() from next-auth/react is deprecated. Use useAuth().login() instead.");
}

export function signOut() {
  // Deprecated — use useAuth().logout() instead
  console.warn("signOut() from next-auth/react is deprecated. Use useAuth().logout() instead.");
}
