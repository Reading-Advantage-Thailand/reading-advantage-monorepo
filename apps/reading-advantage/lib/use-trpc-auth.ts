"use client";

import { useCallback, useState } from "react";

export interface TrpcAuthUser {
  id: string;
  username: string;
  name: string | null;
  role: string;
  schoolId: string | null;
}

export function useTrpcAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const login = useCallback(
    async (username: string, password: string): Promise<TrpcAuthUser | null> => {
      setIsLoading(true);
      setError("");
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
        return data.user;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Login failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (
      username: string,
      password: string,
      name: string
    ): Promise<TrpcAuthUser | null> => {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, name }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Registration failed" }));
          throw new Error(err.message ?? "Registration failed");
        }

        const data = await res.json();
        return data.user;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Registration failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Silently handle logout failure
    }
  }, []);

  const getAccessToken = useCallback((): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/session_token=([^;]+)/);
    return match ? match[1] : null;
  }, []);

  return { login, register, logout, getAccessToken, isLoading, error };
}
