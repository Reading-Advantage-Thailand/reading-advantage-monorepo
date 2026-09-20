// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

import { useHandleAuthFailure } from "@/lib/login-redirect";

afterEach(() => {
  cleanup();
  replaceMock.mockClear();
});

describe("useHandleAuthFailure", () => {
  it("redirects an HTTP 401 response to login with the current path as returnTo", () => {
    window.history.replaceState(null, "", "/campaigns/abc?tab=video");

    const { result } = renderHook(() => useHandleAuthFailure());
    const redirected = result.current(new Response(null, { status: 401 }));

    expect(redirected).toBe(true);
    expect(replaceMock).toHaveBeenCalledWith(
      "/login?returnTo=%2Fcampaigns%2Fabc%3Ftab%3Dvideo",
    );
  });

  it("ignores responses that are not HTTP 401", () => {
    const { result } = renderHook(() => useHandleAuthFailure());

    expect(result.current(new Response(null, { status: 403 }))).toBe(false);
    expect(result.current(new Response(null, { status: 500 }))).toBe(false);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects a missing session when called without a response", () => {
    window.history.replaceState(null, "", "/settings");

    const { result } = renderHook(() => useHandleAuthFailure());

    expect(result.current()).toBe(true);
    expect(replaceMock).toHaveBeenCalledWith("/login?returnTo=%2Fsettings");
  });
});
