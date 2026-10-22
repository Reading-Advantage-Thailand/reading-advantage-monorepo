// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { UserResetPassForm } from "../auth/user-reset-pass-form";
import { renderWithMessages, testMessages } from "./helpers/render-with-messages";

afterEach(cleanup);

describe("forgot-password page (defect 1, 2026-10-20)", () => {
  it("sends the user to the school admin and asks for no e-mail, because the app sends none", () => {
    renderWithMessages(<UserResetPassForm />, { locale: "th" });
    const copy = testMessages.th.AuthPage.forgot;
    expect(screen.getByRole("heading", { name: copy.title })).toBeInTheDocument();
    expect(screen.getByText(copy.help)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/email has been sent/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: copy.back })).toHaveAttribute("href", "/auth/signin");
  });
});
