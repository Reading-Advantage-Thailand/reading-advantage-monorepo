import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth, useSession, useRequireAuth } from "../index.js";

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
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

// ---------------------------------------------------------------------------
// Phase 2 — Task 36: FR-13 mount-session-check race
// ---------------------------------------------------------------------------
//
// FR-13: If the mount session-check resolves after a completed login(),
// the result must be discarded. The current provider overwrites the
// authenticated state with the stale null session.
//
// Test strategy:
//   - Mock /api/auth/session with a deferred promise (stall the mount check).
//   - Call login() and resolve the login fetch.
//   - Then resolve the session check with { session: null }.
//   - Assert the state remains authenticated (not overwritten).
// ---------------------------------------------------------------------------

describe("Phase 2 — Task 36: FR-13 mount-session-check race guard", () => {
  it("a mount session-check that resolves after login() does NOT overwrite authenticated state", async () => {
    let resolveSessionCheck!: (value: Response) => void;
    const sessionCheckPromise = new Promise<Response>((resolve) => {
      resolveSessionCheck = resolve;
    });

    vi.spyOn(globalThis, "fetch")
      // Mount session check — deferred
      .mockReturnValueOnce(sessionCheckPromise)
      // Login call — success
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: {
              id: "u1",
              username: "student1",
              name: "Student",
              role: "STUDENT",
              schoolId: "s1",
              xp: 100,
              level: 5,
              cefrLevel: "A2",
            },
          }),
      } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Login before the session check resolves
    await act(async () => {
      await result.current.login("student1", "password123");
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.username).toBe("student1");

    // Now resolve the stale session check (no session)
    await act(async () => {
      resolveSessionCheck({
        ok: true,
        json: () => Promise.resolve({ session: null }),
      } as Response);
      // Allow microtask to settle
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(
      result.current.isAuthenticated,
      "The stale mount session-check must NOT overwrite the authenticated " +
        "state that login() set. The current implementation has no guard, " +
        "so the null session overwrites the user back to logged-out.",
    ).toBe(true);
    expect(
      result.current.user?.username,
      "The user must remain 'student1' after login, even though the mount " +
        "session-check resolved with { session: null } afterwards.",
    ).toBe("student1");
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — Task 37: FR-14 & FR-15 logout failure + state derivation
// ---------------------------------------------------------------------------
//
// FR-14: logout must throw when the request fails (network or !res.ok),
// but still clear local state (defense in depth).
// FR-15: session check returning { session: {} } (empty session, no user)
//         must yield isAuthenticated: false (derive from user, not session).
//
// RED expectations:
//   - FR-14: current provider swallows errors and doesn't throw.
//   - FR-15: current provider sets isAuthenticated: !!data.session, which
//     is true for { session: {} } even though user is null.
// ---------------------------------------------------------------------------

describe("Phase 2 — Task 37: FR-14 & FR-15 logout failure + state derivation", () => {
  it("FR-14: logout fetch returns ok:false → logout() rejects AND isAuthenticated is false", async () => {
    vi.spyOn(globalThis, "fetch")
      // Mount session check — no session
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ session: null }),
      } as Response)
      // Logout call — server error
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: "Internal server error" }),
      } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let logoutError: unknown = null;
    await act(async () => {
      try {
        await result.current.logout();
      } catch (e) {
        logoutError = e;
      }
    });

    expect(
      logoutError,
      "Expected logout() to reject when the server returns ok:false, so " +
        "the UI can warn the user. The current provider silently swallows " +
        "the error.",
    ).toBeInstanceOf(Error);
    expect(
      result.current.isAuthenticated,
      "Expected isAuthenticated to be false after logout clears local " +
        "state (defense in depth), even when the server request failed.",
    ).toBe(false);
    expect(
      result.current.user,
      "Expected user to be null after logout clears local state.",
    ).toBeNull();
  });

  it("FR-14: logout fetch rejects (network error) → logout() rejects AND isAuthenticated is false", async () => {
    vi.spyOn(globalThis, "fetch")
      // Mount session check — no session
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ session: null }),
      } as Response)
      // Logout call — network error
      .mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let logoutError: unknown = null;
    await act(async () => {
      try {
        await result.current.logout();
      } catch (e) {
        logoutError = e;
      }
    });

    expect(
      logoutError,
      "Expected logout() to reject on network error so the UI can warn " +
        "the user that the server session may still be alive.",
    ).toBeInstanceOf(Error);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("FR-15: session check returning { session: {} } yields isAuthenticated: false", async () => {
    // Edge case: server returns { session: {} } — an empty session object
    // with no user. The current implementation sets isAuthenticated: !!data.session
    // which is true (an empty object is truthy). Green must derive both
    // user and isAuthenticated from data.session?.user.
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ session: {} }),
    } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(
      result.current.isAuthenticated,
      "Expected isAuthenticated to be false when the session body is " +
        "{ session: {} } (no user). The current implementation sets " +
        "isAuthenticated: !!data.session which is true for an empty " +
        "object — Green must derive from data.session?.user instead.",
    ).toBe(false);
    expect(
      result.current.user,
      "Expected user to be null when session.user is undefined.",
    ).toBeNull();
  });
});
