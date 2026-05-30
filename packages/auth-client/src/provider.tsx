"use client";

import { useState, useCallback, useEffect, type ReactNode } from "react";
import { AuthContext, type AuthState, type AuthUser } from "./context.js";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provides auth context to the React tree. Checks existing session on mount
 * and exposes login, register, and logout actions.
 * @param props.children - The child components to wrap with the provider.
 * @returns A provider component that supplies auth state and actions.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Check existing session on mount (cookie-based)
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) {
          throw new Error("Session check failed");
        }
        const data = await res.json();
        if (!cancelled) {
          setState({
            user: data.session?.user ?? null,
            isAuthenticated: !!data.session,
            isLoading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            user: null,
            isAuthenticated: false,
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
    setState({
      user: data.user as AuthUser,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const register = useCallback(async (
    username: string,
    password: string,
    name: string,
    schoolId: string
  ) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, name, schoolId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Registration failed" }));
      throw new Error(err.message ?? "Registration failed");
    }

    const data = await res.json();
    setState({
      user: data.user as AuthUser,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Logout API call failed, continue with local cleanup
    }

    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
