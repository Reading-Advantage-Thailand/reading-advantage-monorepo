// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";
import { OfflineSign } from "../offline-sign";

const defaultOnLine = window.navigator.onLine;

/** Sets the `navigator.onLine` value for one test. */
function setOnLine(value: boolean): void {
  Object.defineProperty(window.navigator, "onLine", { value, configurable: true });
}

afterEach(() => {
  cleanup();
  setOnLine(defaultOnLine);
});

describe("OfflineSign", () => {
  it("renders nothing when the browser is online", () => {
    setOnLine(true);
    const { container } = renderWithMessages(<OfflineSign />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the sign on offline and hides it on online", () => {
    setOnLine(true);
    renderWithMessages(<OfflineSign />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    setOnLine(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(testMessages.en.PwaInstall.offlineSign);
    setOnLine(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the sign at once when the browser starts offline", () => {
    setOnLine(false);
    renderWithMessages(<OfflineSign />);
    expect(screen.getByRole("status")).toHaveTextContent(testMessages.en.PwaInstall.offlineSign);
  });

  it("names the sign in Thai", () => {
    setOnLine(false);
    renderWithMessages(<OfflineSign />, { locale: "th" });
    expect(screen.getByRole("status")).toHaveTextContent(testMessages.th.PwaInstall.offlineSign);
  });
});
