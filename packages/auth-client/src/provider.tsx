"use client";

import { useState, useCallback, useEffect, type ReactNode } from "react";
import { AuthContext, type AuthState } from "./context.js";

const TOKEN_KEY = "ra_access_token";
const REFRESH_KEY = "ra_refresh_token";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface AuthProviderProps {
  children: ReactNode;
  apiUrl?: string;
}

export function AuthProvider({ children, apiUrl = API_URL }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const callApi = useCallback(
    async (path: string, body: unknown) => {
      const res = await fetch(`${apiUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message ?? "Request failed");
      }

      return res.json();
    },
    [apiUrl]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await callApi("/trpc/auth.login", {
        json: { email, password },
      });

      const result = data.result?.data?.json ?? data;

      localStorage.setItem(TOKEN_KEY, result.accessToken);
      localStorage.setItem(REFRESH_KEY, result.refreshToken);

      setState({
        user: result.user,
        accessToken: result.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    },
    [callApi]
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const data = await callApi("/trpc/auth.register", {
        json: { email, password, name },
      });

      const result = data.result?.data?.json ?? data;

      localStorage.setItem(TOKEN_KEY, result.accessToken);
      localStorage.setItem(REFRESH_KEY, result.refreshToken);

      setState({
        user: result.user,
        accessToken: result.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    },
    [callApi]
  );

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);

    if (refreshToken && state.accessToken) {
      try {
        await callApi("/trpc/auth.logout", {
          json: { refreshToken },
        });
      } catch {
        // Logout API call failed, continue with local cleanup
      }
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);

    setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, [callApi, state.accessToken]);

  const refreshSession = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);

    if (!refreshToken) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    try {
      const data = await callApi("/trpc/auth.refresh", {
        json: { refreshToken },
      });

      const result = data.result?.data?.json ?? data;

      localStorage.setItem(TOKEN_KEY, result.accessToken);
      localStorage.setItem(REFRESH_KEY, result.refreshToken);

      // Get user info from session
      const sessionRes = await fetch(`${apiUrl}/trpc/auth.session`, {
        headers: { Authorization: `Bearer ${result.accessToken}` },
      });

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        const session = sessionData.result?.data?.json ?? sessionData;

        setState({
          user: session.user,
          accessToken: result.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error("Session fetch failed");
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      setState({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, [callApi, apiUrl]);

  // Attempt to restore session on mount
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
