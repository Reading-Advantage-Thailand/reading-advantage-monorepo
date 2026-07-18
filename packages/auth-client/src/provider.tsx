"use client";

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { AuthContext, type AuthState } from "./context.js";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provides auth context to the React tree. Checks existing session on mount
 * and exposes login and logout actions.
 * @param props.children - The child components to wrap with the provider.
 * @returns A provider component that supplies auth state and actions.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isForbidden: false,
    isLoading: true,
  });

  // FR-13: Track whether an auth action (login/logout) has completed
  const authActionCompletedRef = useRef(false);

  // Check existing session on mount (cookie-based)
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.status === 403) {
          if (!cancelled && !authActionCompletedRef.current) {
            setState({
              user: null,
              isAuthenticated: true,
              isForbidden: true,
              isLoading: false,
            });
          }
          return;
        }
        if (!res.ok) {
          throw new Error("Session check failed");
        }
        const data = await res.json();
        if (!cancelled && !authActionCompletedRef.current) {
          // FR-15: derive both user and isAuthenticated from data.session?.user
          const sessionUser = data.session?.user ?? null;
          setState({
            user: sessionUser,
            isAuthenticated: !!sessionUser,
            isForbidden: false,
            isLoading: false,
          });
        }
      } catch {
        if (!cancelled && !authActionCompletedRef.current) {
          setState({
            user: null,
            isAuthenticated: false,
            isForbidden: false,
            isLoading: false,
          });
        }
      }
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Login failed" }));
      throw new Error(err.message ?? "Login failed");
    }

    const data = await res.json();
    // FR-13: mark auth action completed so mount session-check discards its result
    authActionCompletedRef.current = true;
    setState({
      user: data.user,
      isAuthenticated: true,
      isForbidden: false,
      isLoading: false,
    });
  }, []);

  // FR-16: register action removed — registration is now an admin operation

  const logout = useCallback(async () => {
    // FR-14: clear local state regardless (defense in depth)
    setState({
      user: null,
      isAuthenticated: false,
      isForbidden: false,
      isLoading: false,
    });

    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        throw new Error("Logout may not have completed on the server");
      }
    } catch {
      // FR-14: throw so the UI can warn
      throw new Error("Logout may not have completed on the server");
    }

    // FR-13: mark auth action completed
    authActionCompletedRef.current = true;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
