"use client";

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { AuthContext, type AuthState } from "./context.js";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provides auth context to the React tree. Checks existing session on mount
 * and exposes session actions.
 * @param props The provider properties.
 * @returns A provider component that supplies auth state and actions.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isForbidden: false,
    isLoading: true,
  });

  const authActionRef = useRef(0);
  const signedOutRef = useRef(false);

  const applySession = useCallback(
    (res: Response, data?: { session?: { user?: AuthState["user"] } }) => {
      if (res.status === 403) {
        setState({
          user: null,
          isAuthenticated: true,
          isForbidden: true,
          isLoading: false,
        });
        return;
      }

      const sessionUser = data?.session?.user ?? null;
      setState({
        user: sessionUser,
        isAuthenticated: !!sessionUser,
        isForbidden: false,
        isLoading: false,
      });
    },
    [],
  );

  // Check existing session on mount (cookie-based)
  useEffect(() => {
    let cancelled = false;
    const action = authActionRef.current;

    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.status === 403) {
          if (!cancelled && action === authActionRef.current) applySession(res);
          return;
        }
        if (!res.ok) {
          throw new Error("Session check failed");
        }
        const data = await res.json();
        if (!cancelled && action === authActionRef.current) {
          applySession(res, data);
        }
      } catch {
        if (!cancelled && action === authActionRef.current) {
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
  }, [applySession]);

  const refresh = useCallback(async () => {
    if (signedOutRef.current) return;
    const action = ++authActionRef.current;
    try {
      const res = await fetch("/api/auth/session");
      if (res.status !== 403 && !res.ok) throw new Error("Session refresh failed");
      const data = res.status === 403 ? undefined : await res.json();
      if (action === authActionRef.current) applySession(res, data);
    } catch (error) {
      if (action === authActionRef.current) {
        setState((current) => ({ ...current, isLoading: false }));
      }
      throw error;
    }
  }, [applySession]);

  const login = useCallback(async (username: string, password: string) => {
    signedOutRef.current = false;
    const action = ++authActionRef.current;
    try {
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
      if (action === authActionRef.current) {
        setState({
          user: data.user,
          isAuthenticated: true,
          isForbidden: false,
          isLoading: false,
        });
      }
    } catch (error) {
      if (action === authActionRef.current) {
        setState((current) => ({ ...current, isLoading: false }));
      }
      throw error;
    }
  }, []);

  // FR-16: register action removed — registration is now an admin operation

  const logout = useCallback(async () => {
    // Discard the pending mount check as soon as logout starts.
    signedOutRef.current = true;
    ++authActionRef.current;
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
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
