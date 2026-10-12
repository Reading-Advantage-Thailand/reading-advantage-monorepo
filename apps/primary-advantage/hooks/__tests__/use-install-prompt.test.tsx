// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INSTALL_DISMISS_KEY, useInstallPrompt } from "../use-install-prompt";

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const CHROME_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

const defaultUA = window.navigator.userAgent;

/** Swaps the user agent string for one test. */
function setUserAgent(value: string): void {
  Object.defineProperty(window.navigator, "userAgent", { value, configurable: true });
}

/** Stubs matchMedia with a fixed standalone match. */
function stubMatchMedia(matches: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as never;
}

beforeEach(() => {
  localStorage.clear();
  stubMatchMedia(false);
});

afterEach(() => {
  setUserAgent(defaultUA);
  vi.unstubAllGlobals();
});

describe("useInstallPrompt", () => {
  it("gives ios-steps on iOS Safari", () => {
    setUserAgent(IOS_UA);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.state).toBe("ios-steps");
  });

  it("gives install-button on a beforeinstallprompt event", () => {
    setUserAgent(CHROME_UA);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.state).toBe("hidden");
    act(() => {
      window.dispatchEvent(new Event("beforeinstallprompt"));
    });
    expect(result.current.state).toBe("install-button");
  });

  it("gives hidden in standalone mode even with a stored event", () => {
    setUserAgent(IOS_UA);
    stubMatchMedia(true);
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(new Event("beforeinstallprompt"));
    });
    expect(result.current.state).toBe("hidden");
  });

  it("gives hidden when the device dismissed the notice", () => {
    setUserAgent(IOS_UA);
    localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.state).toBe("hidden");
  });

  it("dismiss stores the key and hides the notice", () => {
    setUserAgent(IOS_UA);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.state).toBe("ios-steps");
    act(() => {
      result.current.dismiss();
    });
    expect(localStorage.getItem(INSTALL_DISMISS_KEY)).toBe("1");
    expect(result.current.state).toBe("hidden");
  });

  it("promptInstall calls prompt on the stored event and hides on accept", async () => {
    setUserAgent(CHROME_UA);
    const prompt = vi.fn(async () => undefined);
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      const event = new Event("beforeinstallprompt");
      (event as Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: "accepted" | "dismissed" }> }).prompt = prompt;
      (event as Event & { userChoice?: Promise<{ outcome: "accepted" | "dismissed" }> }).userChoice = Promise.resolve({ outcome: "accepted" });
      window.dispatchEvent(event);
    });
    expect(result.current.state).toBe("install-button");
    await act(async () => {
      await result.current.promptInstall();
    });
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe("hidden");
  });
});
