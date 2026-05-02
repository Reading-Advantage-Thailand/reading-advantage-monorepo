import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth, useSession, useRequireAuth } from "../index.js";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, { apiUrl: "http://localhost:3001" }, children);
}

beforeEach(() => {
  localStorageMock.clear();
  vi.restoreAllMocks();
});

describe("useAuth", () => {
  it("returns auth context when used within AuthProvider", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current).toBeDefined();
    expect(result.current.login).toBeTypeOf("function");
    expect(result.current.register).toBeTypeOf("function");
    expect(result.current.logout).toBeTypeOf("function");
    expect(result.current.refreshSession).toBeTypeOf("function");
  });

  it("throws when used outside AuthProvider", () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow(/useAuth must be used within an AuthProvider/);
  });

  it("calls login and updates state", async () => {
    const mockResponse = {
      result: {
        data: {
          json: {
            accessToken: "access-123",
            refreshToken: "refresh-123",
            user: { id: "u1", email: "test@test.com", name: "Test", role: "STUDENT", schoolId: null },
          },
        },
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("test@test.com", "password123");
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe("test@test.com");
    expect(localStorageMock.getItem("ra_access_token")).toBe("access-123");
    expect(localStorageMock.getItem("ra_refresh_token")).toBe("refresh-123");
  });

  it("calls register and updates state", async () => {
    const mockResponse = {
      result: {
        data: {
          json: {
            accessToken: "access-new",
            refreshToken: "refresh-new",
            user: { id: "u2", email: "new@test.com", name: "New", role: "STUDENT", schoolId: null },
          },
        },
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.register("new@test.com", "password123", "New");
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe("New");
  });

  it("calls logout and clears state", async () => {
    localStorageMock.setItem("ra_access_token", "old-access");
    localStorageMock.setItem("ra_refresh_token", "old-refresh");

    // Mock fetch for logout API call
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initial refreshSession to complete (no tokens, finishes loading)
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorageMock.getItem("ra_access_token")).toBeNull();
    expect(localStorageMock.getItem("ra_refresh_token")).toBeNull();
  });
});

describe("useSession", () => {
  it("returns session data", async () => {
    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("returns authenticated session after login via useAuth", async () => {
    const mockResponse = {
      result: {
        data: {
          json: {
            accessToken: "acc",
            refreshToken: "ref",
            user: { id: "u1", email: "a@b.com", name: "A", role: "TEACHER", schoolId: "s1" },
          },
        },
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    // Use a combined hook to access both login and session
    function useAuthAndSession() {
      const auth = useAuth();
      const session = useSession();
      return { ...auth, session };
    }

    const { result } = renderHook(() => useAuthAndSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.login("a@b.com", "pass");
    });

    expect(result.current.session.isAuthenticated).toBe(true);
    expect(result.current.session.user?.role).toBe("TEACHER");
  });
});

describe("useRequireAuth", () => {
  it("returns auth when authenticated", async () => {
    const mockResponse = {
      result: {
        data: {
          json: {
            accessToken: "acc",
            refreshToken: "ref",
            user: { id: "u1", email: "a@b.com", name: "A", role: "ADMIN", schoolId: "s1" },
          },
        },
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    function useAuthThenRequire() {
      const auth = useAuth();
      const required = useRequireAuth();
      return { auth, required };
    }

    const { result } = renderHook(() => useAuthThenRequire(), { wrapper });

    await waitFor(() => {
      expect(result.current.auth.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.auth.login("a@b.com", "pass");
    });

    expect(result.current.auth.isAuthenticated).toBe(true);
    expect(result.current.required.isAuthenticated).toBe(true);
  });

  it("has correct interface (user, isAuthenticated, isLoading, actions)", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.login).toBeTypeOf("function");
    expect(result.current.register).toBeTypeOf("function");
    expect(result.current.logout).toBeTypeOf("function");
    expect(result.current.refreshSession).toBeTypeOf("function");
  });
});
