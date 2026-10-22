// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";
import { HelpLink } from "../help-link";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}));

afterEach(cleanup);

const firstVideo = () => within(screen.getByRole("region", { name: "For this page" })).getAllByRole("button")[0].textContent;

describe("HelpLink (plan 3.3)", () => {
  it("opens the student sign-in video on the student tab", () => {
    renderWithMessages(<HelpLink pathname="/auth/signin" audience="student" />);
    fireEvent.click(screen.getByRole("button", { name: "How do I sign in?" }));
    expect(firstVideo()).toContain("Sign in with the class code and 3 pictures");
  });

  it("opens the teacher sign-in video on the teacher tab", () => {
    renderWithMessages(<HelpLink pathname="/auth/signin" audience="teacher" />);
    fireEvent.click(screen.getByRole("button", { name: "How do I sign in?" }));
    expect(firstVideo()).toContain("The new teacher sign-in");
  });

  it("opens the QR card video on the card page, in Thai", () => {
    renderWithMessages(<HelpLink pathname="/auth/card" audience="student" />, { locale: "th" });
    fireEvent.click(screen.getByRole("button", { name: /เข้าสู่ระบบอย่างไร/ }));
    expect(within(screen.getByRole("region", { name: "สำหรับหน้านี้" })).getAllByRole("button")[0].textContent).toContain("เข้าสู่ระบบด้วยบัตร QR");
  });
});
