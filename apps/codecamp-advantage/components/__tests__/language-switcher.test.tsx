import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageSwitcher } from "../language-switcher";

const mockUseLocale = vi.fn(() => "th");
const mockPush = vi.fn();

vi.mock("next-intl", () => ({
  useLocale: () => mockUseLocale(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard",
}));

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseLocale.mockClear();
  });

  it("renders both locale labels", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText("EN")).toBeDefined();
    expect(screen.getByText("ไทย")).toBeDefined();
  });

  it("highlights Thai as the active locale by default", () => {
    mockUseLocale.mockReturnValue("th");
    render(<LanguageSwitcher />);
    const thaiButton = screen.getByText("ไทย");
    expect(thaiButton.closest("button")).toHaveAttribute("aria-current", "true");
  });

  it("highlights English when locale is en", () => {
    mockUseLocale.mockReturnValue("en");
    render(<LanguageSwitcher />);
    const enButton = screen.getByText("EN");
    expect(enButton.closest("button")).toHaveAttribute("aria-current", "true");
  });

  it("navigates to same path with English locale when clicking EN", () => {
    mockUseLocale.mockReturnValue("th");
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText("EN"));
    expect(mockPush).toHaveBeenCalledWith("/dashboard", { locale: "en" });
  });

  it("navigates to same path with Thai locale when clicking ไทย", () => {
    mockUseLocale.mockReturnValue("en");
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText("ไทย"));
    expect(mockPush).toHaveBeenCalledWith("/dashboard", { locale: "th" });
  });

  it("uses native button elements for keyboard accessibility", () => {
    mockUseLocale.mockReturnValue("th");
    render(<LanguageSwitcher />);
    const enButton = screen.getByText("EN").closest("button") as HTMLButtonElement;
    const thaiButton = screen.getByText("ไทย").closest("button") as HTMLButtonElement;
    expect(enButton).toBeDefined();
    expect(thaiButton).toBeDefined();
    expect(enButton.tagName).toBe("BUTTON");
    expect(thaiButton.tagName).toBe("BUTTON");
  });

  it("has accessible labels for screen readers", () => {
    mockUseLocale.mockReturnValue("th");
    render(<LanguageSwitcher />);
    expect(screen.getByLabelText("Switch to English")).toBeDefined();
    expect(screen.getByLabelText("เปลี่ยนเป็นภาษาไทย")).toBeDefined();
  });

  it("has role group for the button container", () => {
    mockUseLocale.mockReturnValue("th");
    render(<LanguageSwitcher />);
    const group = screen.getByRole("group");
    expect(group).toBeDefined();
    expect(group).toHaveAttribute("aria-label", "Language switcher");
  });
});
