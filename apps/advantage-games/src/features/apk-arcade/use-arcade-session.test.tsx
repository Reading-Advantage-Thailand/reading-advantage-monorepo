import { renderHook, waitFor } from "@testing-library/react";

import { useArcadeSession } from "./use-arcade-session";

describe("useArcadeSession", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads the private student session without caching credentials", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
          session: { user: { id: "student-1", role: "STUDENT" } },
      }),
    });

    const { result } = renderHook(() => useArcadeSession());

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.session?.user.role).toBe("STUDENT");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({ cache: "no-store", credentials: "same-origin" }),
    );
  });

  it("fails closed for null, invalid, or unavailable sessions", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ session: null }),
    });

    const { result } = renderHook(() => useArcadeSession());
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    expect(result.current.session).toBeNull();
  });
});
