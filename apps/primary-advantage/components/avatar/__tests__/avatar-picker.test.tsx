// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({ setAvatarProfileAction: vi.fn(), push: vi.fn() }));
vi.mock("@/actions/avatar", () => ({ setAvatarProfileAction: mocks.setAvatarProfileAction }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("../portrait-canvas", () => ({
  AvatarPortrait: ({ classId, tints, alt }: { classId: string; tints?: Record<string, string>; alt: string }) => <div role="img" data-testid="portrait" data-class={classId} data-tints={JSON.stringify(tints ?? {})} aria-label={alt} />,
}));

import { AvatarPicker } from "../avatar-picker";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.setAvatarProfileAction.mockResolvedValue({ success: true, profile: {} });
});
afterEach(cleanup);

describe("AvatarPicker", () => {
  it("shows 15 hero cards with portraits and a skip link", () => {
    renderWithMessages(<AvatarPicker initial={null} />, { locale: "en" });
    const list = screen.getByRole("heading", { name: "Choose your hero" }).nextElementSibling!;
    expect(within(list as HTMLElement).getAllByRole("button")).toHaveLength(15);
    expect(within(list as HTMLElement).getAllByTestId("portrait")).toHaveLength(15);
    expect(screen.getByRole("link", { name: "Not now" })).toHaveAttribute("href", "/student/home");
  });

  it("moves to the colors of the picked hero with a live preview and saves the choice", async () => {
    const user = userEvent.setup();
    renderWithMessages(<AvatarPicker initial={null} returnTo="/student/reedy" />, { locale: "en" });
    await user.click(screen.getByRole("button", { name: /Ranger/ }));
    expect(screen.getByRole("heading", { name: "Colors for your Ranger" })).toBeInTheDocument();
    const preview = screen.getByRole("img", { name: "Your avatar" });
    expect(preview).toHaveAttribute("data-class", "ranger");
    expect(JSON.parse(preview.getAttribute("data-tints")!)).toEqual({ skin: "tan", hair: "auburn", eyes: "green", cloth: "moss" });
    await user.click(within(screen.getByRole("radiogroup", { name: "Hair" })).getByRole("radio", { name: "Teal" }));
    expect(JSON.parse(screen.getByRole("img", { name: "Your avatar" }).getAttribute("data-tints")!).hair).toBe("teal");
    await user.click(screen.getByRole("button", { name: "Save my avatar" }));
    await waitFor(() => expect(mocks.setAvatarProfileAction).toHaveBeenCalledWith({ classId: "ranger", tints: { skin: "tan", hair: "teal", eyes: "green", cloth: "moss" } }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/student/reedy"));
  });

  it("starts on the colors step for a saved avatar and shows the error when saving fails", async () => {
    const user = userEvent.setup();
    mocks.setAvatarProfileAction.mockResolvedValue({ success: false, error: "no" });
    const tints = { skin: "fair", hair: "blond", eyes: "blue", cloth: "sky" } as const;
    renderWithMessages(<AvatarPicker initial={{ classId: "shield-maiden", tints, catalogVersion: "1.0.0", updatedAt: "2026-10-05T00:00:00.000Z" }} />, { locale: "th" });
    expect(screen.getByRole("heading", { name: "สีของสาวโล่" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "บันทึกอวตาร" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("บันทึกอวตารไม่ได้");
    expect(mocks.push).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "เลือกฮีโร่คนอื่น" }));
    expect(screen.getByRole("heading", { name: "เลือกฮีโร่ของคุณ" })).toBeInTheDocument();
  });

  it("keeps every control at 48 px", () => {
    renderWithMessages(<AvatarPicker initial={{ classId: "knight", tints: { skin: "fair", hair: "brown", eyes: "blue", cloth: "sky" }, catalogVersion: "1.0.0", updatedAt: "2026-10-05T00:00:00.000Z" }} />, { locale: "en" });
    for (const el of [...screen.getAllByRole("radio"), ...screen.getAllByRole("button"), ...screen.getAllByRole("link")]) expect(el.className).toMatch(/min-h-12|size-12/);
  });
});
