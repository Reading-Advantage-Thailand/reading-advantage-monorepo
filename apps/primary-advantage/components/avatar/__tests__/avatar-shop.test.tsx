// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvatarProfile, AvatarShopItem } from "@reading-advantage/game-contracts";
import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("../portrait-canvas", () => ({
  AvatarPortrait: ({ pieces, alt }: { pieces?: { itemId: string; dye: string | null }[]; alt: string }) => <div role="img" data-testid="portrait" data-pieces={JSON.stringify(pieces ?? [])} aria-label={alt} />,
}));
const refresh = vi.fn();
vi.mock("next/navigation", async (importOriginal) => ({ ...(await importOriginal<object>()), useRouter: () => ({ refresh }) }));
vi.mock("@reading-advantage/avatar-kit", () => ({ AVATAR_CATALOG: {}, AVATAR_BASE: { slots: {} }, TINT_SLOTS: [] }));

import { AvatarShop, tryOnPieces } from "../avatar-shop";

const item = (id: string, over: Partial<AvatarShopItem> = {}): AvatarShopItem => ({ id, slot: "head", tier: 1, levelRequired: 1, price: 50, twoHanded: false, dyes: [], owned: false, ownedDyes: [], unlocked: true, ...over });
const profile: AvatarProfile = { classId: "knight", tints: { skin: "fair", hair: "brown", eyes: "blue", cloth: "sky" }, catalogVersion: "1.0.0", updatedAt: "2026-10-05T00:00:00.000Z" };
const stock = (): AvatarShopItem[] => [
  ...Array.from({ length: 13 }, (_, i) => item(`hat-${i}`)),
  item("cloak", { slot: "back", price: 45, dyes: ["red", "blue"], owned: true, ownedDyes: ["red"] }),
  item("greaves", { slot: "feet", tier: 2, levelRequired: 5, unlocked: false }),
];

const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("tryOnPieces", () => {
  it("swaps the piece into its slot and drops the off hand for a two-handed weapon", () => {
    const loadout = { head: { itemId: "old-hat", dye: null }, offhand: { itemId: "shield", dye: null } };
    expect(tryOnPieces(loadout, { id: "new-hat", slot: "head", twoHanded: false }, "red")).toEqual([{ itemId: "new-hat", dye: "red" }, { itemId: "shield", dye: null }]);
    expect(tryOnPieces(loadout, { id: "spear", slot: "mainhand", twoHanded: true }, null)).toEqual([{ itemId: "old-hat", dye: null }, { itemId: "spear", dye: null }]);
  });
});

describe("AvatarShop", () => {
  it("shows the armorer, the slot signs, two shelves of six, and a pager", () => {
    renderWithMessages(<AvatarShop items={stock()} gp={150} profile={profile} loadout={{}} />, { locale: "en" });
    expect(screen.getByRole("img", { name: "The armorer" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Welcome, hero!");
    expect(within(screen.getByRole("radiogroup", { name: "All slots" })).getAllByRole("radio")).toHaveLength(11);
    expect(screen.getAllByRole("list")).toHaveLength(2);
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    expect(screen.getByText("Shelf 1 of 2")).toBeInTheDocument();
  });

  it("filters by a sign and shows the lock level on a locked piece", async () => {
    const user = userEvent.setup();
    renderWithMessages(<AvatarShop items={stock()} gp={150} profile={profile} loadout={{}} />, { locale: "en" });
    await user.click(screen.getByRole("radio", { name: "Feet" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Greaves/ })).toHaveTextContent("Level 5");
    expect(screen.queryByText(/Shelf \d/)).not.toBeInTheDocument();
  });

  it("opens the try-on card with the hero wearing the piece and buys it with flying coins", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ gp: 100 }) });
    renderWithMessages(<AvatarShop items={stock()} gp={150} profile={profile} loadout={{ back: { itemId: "cloak", dye: "red" } }} />, { locale: "en" });
    await user.click(screen.getByRole("button", { name: /Hat 3/ }));
    const card = screen.getByRole("region", { name: "Try it on" });
    expect(JSON.parse(within(card).getByTestId("portrait").getAttribute("data-pieces")!)).toEqual([{ itemId: "cloak", dye: "red" }, { itemId: "hat-3", dye: null }]);
    expect(within(card).getByText("You keep 100 GP")).toBeInTheDocument();
    await user.click(within(card).getByRole("button", { name: "Buy for 50 GP" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/avatar/purchase", expect.objectContaining({ method: "POST", body: JSON.stringify({ itemId: "hat-3" }) })));
    await waitFor(() => expect(refresh).toHaveBeenCalled()); // the header purse re-renders on the server
    expect(await within(card).findByText("Owned")).toBeInTheDocument();
    expect(screen.getByTitle("100 GP")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Good choice!");
    expect(document.querySelectorAll(".cq-coin-fly")).toHaveLength(3);
  });

  it("buys a dye from the paint pots and reports a refusal", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "INSUFFICIENT_GP" }) });
    renderWithMessages(<AvatarShop items={stock()} gp={10} profile={profile} loadout={{}} />, { locale: "en" });
    await user.click(screen.getByRole("radio", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: /Cloak/ }));
    const card = screen.getByRole("region", { name: "Try it on" });
    expect(within(card).getByText("Owned")).toBeInTheDocument();
    await user.click(within(card).getByRole("radio", { name: "blue" }));
    expect(JSON.parse(within(card).getByTestId("portrait").getAttribute("data-pieces")!)).toEqual([{ itemId: "cloak", dye: "blue" }]);
    await user.click(within(card).getByRole("button", { name: "Buy the blue dye for 45 GP" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Not enough GP");
  });
});
