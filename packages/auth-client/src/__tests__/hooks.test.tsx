import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth, useSession, useRequireAuth } from "../index.js";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, {}, children);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useAuth", () => {
  it("returns auth context when used within AuthProvider", () => {
    // Mock the initial session check to return no session
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ session: null }),
    } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current).toBeDefined();
    expect(result.current.login).toBeTypeOf("function");
    expect(result.current.logout).toBeTypeOf("function");
  });

  it("throws when used outside AuthProvider", () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow(/useAuth must be used within an AuthProvider/);
  });

  it("calls login and updates state", async () => {
    // Mock initial session check (no session)
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ session: null }),
      } as Response)
      // Mock login call
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: {
              id: "u1",
              username: "testuser",
              name: "Test",
              role: "STUDENT",
              schoolId: null,
            },
          }),
      } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.login("testuser", "password123");
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.username).toBe("testuser");
  });

  it("calls logout and clears state", async () => {
    // Mock initial session check (no session)
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ session: null }),
      } as Response)
      // Mock logout call
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("restores session from cookie on mount", async () => {
    const mockSession = {
      session: {
        user: {
          id: "u1",
          username: "teacher1",
          name: "Teacher",
          role: "TEACHER",
          schoolId: "school-1",
        },
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSession),
    } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.role).toBe("TEACHER");
  });
});

describe("useSession", () => {
  it("returns session data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ session: null }),
    } as Response);

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("returns authenticated session after login", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ session: null }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: {
              id: "u1",
              username: "admin",
              name: "Admin",
              role: "ADMIN",
              schoolId: "s1",
            },
          }),
      } as Response);

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
      await result.current.login("admin", "pass");
    });

    expect(result.current.session.isAuthenticated).toBe(true);
    expect(result.current.session.user?.role).toBe("ADMIN");
  });
});

describe("useRequireAuth", () => {
  it("returns auth when authenticated", async () => {
    const mockSession = {
      session: {
        user: {
          id: "u1",
          username: "admin",
          name: "Admin",
          role: "ADMIN",
          schoolId: "s1",
        },
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSession),
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

    expect(result.current.auth.isAuthenticated).toBe(true);
    expect(result.current.required.isAuthenticated).toBe(true);
  });

  it("has correct interface", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ session: null }),
    } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.login).toBeTypeOf("function");
    expect(result.current.logout).toBeTypeOf("function");
  });
});
