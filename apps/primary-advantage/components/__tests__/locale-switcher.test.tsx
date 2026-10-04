// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleSwitcher } from "../switchers/locale-switcher";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/student/games",
}));
vi.mock("next/navigation", () => ({ useParams: () => ({ locale: "en" }) }));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (_k: string, v?: { locale: string }) =>
    `label-${v?.locale ?? ""}`,
}));

afterEach(() => {
  cleanup();
  replace.mockClear();
});

describe("LocaleSwitcher", () => {
  it("navigates to the chosen locale and keeps the current path", async () => {
    const user = userEvent.setup();
    render(<LocaleSwitcher />);
    // The button name is the translated LocaleSwitcher.label (the mock returns "label-").
    await user.click(screen.getByRole("button", { name: "label-" }));
    await user.click(await screen.findByText("label-th"));
    expect(replace).toHaveBeenCalledWith("/student/games", { locale: "th" });
  });
});
