// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvatarInventoryItem, AvatarState } from "@reading-advantage/game-contracts";
import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("../portrait-canvas", () => ({
  AvatarPortrait: ({ classId, pieces, alt }: { classId: string; pieces?: { itemId: string; dye: string | null }[]; alt: string }) => <div role="img" data-testid="portrait" data-class={classId} data-pieces={JSON.stringify(pieces ?? [])} aria-label={alt} />,
}));
vi.mock("@reading-advantage/avatar-kit", () => ({
  AVATAR_CATALOG: Object.fromEntries([...Array.from({ length: 9 }, (_, i) => [`hat-${i}`, { id: `hat-${i}`, slot: "head", table: null }]), ["cloak", { id: "cloak", slot: "back", table: null }]]),
  AVATAR_BASE: { slots: {} },
  TINT_SLOTS: [],
}));

import { AvatarHome } from "../avatar-home";

const owned = (itemId: string, dye: string | null = null): AvatarInventoryItem => ({ itemId, dye, source: "purchase", catalogVersion: "1.0.0", acquiredAt: "2026-10-05T00:00:00.000Z" });
const state = (): AvatarState & { profile: NonNullable<AvatarState["profile"]> } => ({
  profile: { classId: "knight", tints: { skin: "fair", hair: "brown", eyes: "blue", cloth: "sky" }, catalogVersion: "1.0.0", updatedAt: "2026-10-05T00:00:00.000Z" },
  gp: 120,
  level: 3,
  catalogVersion: "1.0.0",
  inventory: [...Array.from({ length: 9 }, (_, i) => owned(`hat-${i}`)), owned("cloak")],
  loadout: { back: { itemId: "cloak", dye: null } },
});

const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AvatarHome", () => {
  it("shows the paper-doll with ten slots, the purse, and the worn piece on its slot", () => {
    renderWithMessages(<AvatarHome state={state()} />, { locale: "en" });
    const doll = screen.getByRole("group", { name: "Wearing" });
    expect(within(doll).getAllByRole("button")).toHaveLength(10);
    expect(within(doll).getByRole("button", { name: "Back" })).toHaveAttribute("title", "Cloak");
    expect(within(doll).getByRole("button", { name: "Head" })).toHaveAttribute("title", "Nothing");
    expect(screen.getByTitle("120 GP")).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("portrait").getAttribute("data-pieces")!)).toEqual([{ itemId: "cloak", dye: null }]);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("opens a paged drawer for the tapped slot and wears a piece", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ loadout: { back: { itemId: "cloak", dye: null }, head: { itemId: "hat-8", dye: null } } }) });
    renderWithMessages(<AvatarHome state={state()} />, { locale: "en" });
    await user.click(screen.getByRole("button", { name: "Head" }));
    const drawer = screen.getByRole("region", { name: "Your Head pieces" });
    expect(within(drawer).getAllByRole("listitem")).toHaveLength(8);
    expect(within(drawer).getByText("Page 1 of 2")).toBeInTheDocument();
    await user.click(within(drawer).getByRole("button", { name: "Next page" }));
    expect(within(drawer).getAllByRole("listitem")).toHaveLength(1);
    await user.click(within(drawer).getByRole("button", { name: /Hat 8/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/avatar/loadout", expect.objectContaining({ method: "POST", body: JSON.stringify({ slot: "head", itemId: "hat-8", dye: null }) })));
    await waitFor(() => expect(JSON.parse(screen.getByTestId("portrait").getAttribute("data-pieces")!)).toHaveLength(2));
    expect(within(drawer).getByRole("button", { name: /Hat 8/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(drawer).getByRole("button", { name: "Take off" })).toBeInTheDocument();
  });

  it("shows the error when the server refuses and keeps the shop and hero links", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    renderWithMessages(<AvatarHome state={state()} />, { locale: "th" });
    await user.click(screen.getByRole("button", { name: "หลัง" }));
    await user.click(screen.getByRole("button", { name: "ถอด" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ไปที่ร้านค้า/ })).toHaveAttribute("href", "/student/avatar/shop");
    expect(screen.getByRole("link", { name: "เปลี่ยนฮีโร่หรือสี" })).toHaveAttribute("href", "/student/avatar?from=me");
  });
});
