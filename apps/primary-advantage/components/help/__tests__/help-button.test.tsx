// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";
import { HelpButton } from "../help-button";

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/teacher/class-roster/abc/qr-cards",
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}));

afterEach(cleanup);

describe("HelpButton (spec FR-1)", () => {
  it("opens the help panel for the current page", () => {
    renderWithMessages(<HelpButton audience="teacher" />, { locale: "th" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "วิดีโอช่วยเหลือ" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /พิมพ์ใบรายชื่อชั้นเรียนและบัตร QR/ })).toBeInTheDocument();
  });
});
