"use client";

import { useState, useCallback, useEffect, type ReactNode } from "react";
import { AuthContext, type AuthState } from "./context.js";

const TOKEN_KEY = "ra_access_token";
const REFRESH_KEY = "ra_refresh_token";
const DEFAULT_API_URL =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
const API_URL = DEFAULT_API_URL;

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
    async (path: string, body: unknown, method = "POST") => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const accessToken = localStorage.getItem(TOKEN_KEY);
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`${apiUrl}${path}`, {
        method,
        headers,
        body: method === "GET" ? undefined : JSON.stringify(body),
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
      const data = await callApi("/api/trpc/auth.login", {
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
      const data = await callApi("/api/trpc/auth.register", {
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
        await callApi("/api/trpc/auth.logout", {
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
      const data = await callApi("/api/trpc/auth.refresh", {
        json: { refreshToken },
      });

      const result = data.result?.data?.json ?? data;

      localStorage.setItem(TOKEN_KEY, result.accessToken);
      localStorage.setItem(REFRESH_KEY, result.refreshToken);

      // Get user info from session
      const sessionRes = await fetch(`${apiUrl}/api/trpc/auth.session`, {
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
