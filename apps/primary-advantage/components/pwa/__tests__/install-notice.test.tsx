// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INSTALL_DISMISS_KEY } from "@/hooks/use-install-prompt";
import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";
import { InstallNotice } from "../install-notice";

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const CHROME_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

const defaultUA = window.navigator.userAgent;
const en = testMessages.en.PwaInstall;

/** Swaps the user agent string for one test. */
function setUserAgent(value: string): void {
  Object.defineProperty(window.navigator, "userAgent", { value, configurable: true });
}

/** Fires a beforeinstallprompt event that carries a prompt spy. */
function fireInstallEvent(prompt: () => Promise<void>): void {
  act(() => {
    const event = new Event("beforeinstallprompt");
    (event as Event & { prompt?: () => Promise<void> }).prompt = prompt;
    window.dispatchEvent(event);
  });
}

beforeEach(() => {
  localStorage.clear();
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as never;
});

afterEach(() => {
  cleanup();
  setUserAgent(defaultUA);
  vi.unstubAllGlobals();
});

describe("InstallNotice", () => {
  it("shows the iOS steps on iOS Safari", () => {
    setUserAgent(IOS_UA);
    renderWithMessages(<InstallNotice />);
    expect(screen.getByRole("region", { name: en.title })).toBeInTheDocument();
    expect(screen.getByText(en.iosShare)).toBeInTheDocument();
    expect(screen.getByText(en.iosAdd)).toBeInTheDocument();
    expect(screen.getByText(en.iosConfirm)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: en.install })).not.toBeInTheDocument();
  });

  it("calls prompt when the Install button is clicked", () => {
    setUserAgent(CHROME_UA);
    const prompt = vi.fn(async () => undefined);
    renderWithMessages(<InstallNotice />);
    fireInstallEvent(prompt);
    fireEvent.click(screen.getByRole("button", { name: en.install }));
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it("stores the dismissal key and hides the notice on Dismiss", () => {
    setUserAgent(IOS_UA);
    renderWithMessages(<InstallNotice />);
    expect(screen.getByRole("region", { name: en.title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: en.dismiss }));
    expect(localStorage.getItem(INSTALL_DISMISS_KEY)).toBe("1");
    expect(screen.queryByRole("region", { name: en.title })).not.toBeInTheDocument();
  });

  it("renders nothing when the device dismissed the notice", () => {
    setUserAgent(CHROME_UA);
    localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    const { container } = renderWithMessages(<InstallNotice />);
    fireInstallEvent(vi.fn(async () => undefined));
    expect(container).toBeEmptyDOMElement();
  });

  it("is not mounted on the reading and lesson pages", () => {
    const appDir = join(__dirname, "..", "..", "..", "app", "[locale]", "(student)", "student");
    for (const page of ["read/[articleId]/page.tsx", "lesson/[id]/page.tsx"]) {
      const source = readFileSync(join(appDir, page), "utf8");
      expect(source).not.toContain("install-notice");
      expect(source).not.toContain("InstallNotice");
      expect(source).not.toContain("use-install-prompt");
    }
  });
});
