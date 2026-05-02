"use client";

import { useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";

const TOKEN_KEY = "ra_access_token";
const REFRESH_KEY = "ra_refresh_token";

export interface TrpcAuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  schoolId: string | null;
}

export function useTrpcAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();
  const migrateMutation = trpc.auth.migrate.useMutation();

  const setTokens = useCallback((accessToken: string, refreshToken: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    // Set a cookie so server-rendered pages can read the token
    document.cookie = `ra_access_token=${accessToken}; path=/; max-age=604800`;
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<TrpcAuthUser | null> => {
      setIsLoading(true);
      setError("");
      try {
        const result = await loginMutation.mutateAsync({ email, password });
        setTokens(result.accessToken, result.refreshToken);
        return result.user;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Login failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [loginMutation, setTokens]
  );

  const migrate = useCallback(
    async (email: string, password: string): Promise<TrpcAuthUser | null> => {
      setIsLoading(true);
      setError("");
      try {
        const result = await migrateMutation.mutateAsync({ email, password });
        setTokens(result.accessToken, result.refreshToken);
        return result.user;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Migration failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [migrateMutation, setTokens]
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      name: string
    ): Promise<TrpcAuthUser | null> => {
      setIsLoading(true);
      setError("");
      try {
        const result = await registerMutation.mutateAsync({
          email,
          password,
          name,
        });
        setTokens(result.accessToken, result.refreshToken);
        return result.user;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Registration failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [registerMutation, setTokens]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    document.cookie = "ra_access_token=; path=/; max-age=0";
  }, []);

  const getAccessToken = useCallback((): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  }, []);

  return { login, register, migrate, logout, getAccessToken, isLoading, error };
}
