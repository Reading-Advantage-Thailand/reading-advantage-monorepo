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

  const login = useCallback(
    async (email: string, password: string): Promise<TrpcAuthUser | null> => {
      setIsLoading(true);
      setError("");
      try {
        const result = await loginMutation.mutateAsync({ email, password });
        localStorage.setItem(TOKEN_KEY, result.accessToken);
        localStorage.setItem(REFRESH_KEY, result.refreshToken);
        return result.user;
      } catch (err: any) {
        const msg = err?.message ?? "Login failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [loginMutation]
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
        localStorage.setItem(TOKEN_KEY, result.accessToken);
        localStorage.setItem(REFRESH_KEY, result.refreshToken);
        return result.user;
      } catch (err: any) {
        const msg = err?.message ?? "Registration failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [registerMutation]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }, []);

  const getAccessToken = useCallback((): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  }, []);

  return { login, register, logout, getAccessToken, isLoading, error };
}
