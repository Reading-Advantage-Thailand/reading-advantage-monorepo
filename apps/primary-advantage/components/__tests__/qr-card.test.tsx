// @vitest-environment jsdom
/**
 * QR login card (primary_student_login_20261003, FR-5): the card encodes the sign-in URL with
 * the token in the URL fragment.
 */
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { cardSignInUrl } from "@/lib/student-login/card-url";
import { QrCard } from "../teacher/class-login/qr-card";
import { QrCode } from "../teacher/class-login/qr-code";
import { renderWithMessages } from "./helpers/render-with-messages";

const TOKEN = "A".repeat(43);

/** Returns the module path of the rendered QR code. */
function qrPath(label: string): string {
  return screen.getByRole("img", { name: label }).querySelector("path")?.getAttribute("d") ?? "";
}

describe("cardSignInUrl", () => {
  it("puts the token in the fragment, never in the path or the query", () => {
    const url = new URL(cardSignInUrl("https://primary.example.com", TOKEN));
    expect(url.pathname).toBe("/auth/card");
    expect(url.search).toBe("");
    expect(url.hash).toBe(`#${TOKEN}`);
  });
});

describe("QrCode", () => {
  it("draws the same modules for the same value and other modules for another value", () => {
    const { unmount } = renderWithMessages(<QrCode value="https://a.test/auth/card#one" label="first" />);
    const first = qrPath("first");
    unmount();
    renderWithMessages(
      <>
        <QrCode value="https://a.test/auth/card#one" label="again" />
        <QrCode value="https://a.test/auth/card#two" label="other" />
      </>,
    );
    expect(first).toMatch(/^M\d+ \d+h1v1h-1z/);
    expect(qrPath("again")).toBe(first);
    expect(qrPath("other")).not.toBe(first);
  });
});

describe("QrCard", () => {
  it("shows the name, the avatar letter, the class, and a labelled QR code", () => {
    renderWithMessages(<QrCard name="ann Smith" classroomName="P3A" url={cardSignInUrl("https://a.test", TOKEN)} />);
    expect(screen.getByText("ann Smith")).toBeInTheDocument();
    expect(screen.getByText("A")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("img", { name: "Sign-in QR code for ann Smith" })).toBeInTheDocument();
    expect(screen.getByText("P3A · Scan to sign in")).toBeInTheDocument();
  });

  it("shows Thai copy", () => {
    renderWithMessages(<QrCard name="Ann" classroomName="" url="https://a.test/auth/card#x" />, { locale: "th" });
    expect(screen.getByText("สแกนเพื่อเข้าสู่ระบบ")).toBeInTheDocument();
  });
});
