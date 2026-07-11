import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { APKQCLab } from "./APKQCLab";

jest.mock("next/link", () => function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href}>{children}</a>;
});

jest.mock("next/dynamic", () => () => function MockAPKGameHost(props: { onComplete(result: unknown): void }) {
  return <button type="button" onClick={() => props.onComplete({ accuracy: 1, xp: 40, score: 400, correctAnswers: 4, totalAttempts: 4 })}>Complete mock session</button>;
});

jest.mock("@reading-advantage/game-cartridges/catalog", () => {
  const entries = [
    ["dragon-flight", "Dragon Flight", "vocabulary", "gate-runner"],
    ["dungeon-liberator", "Dungeon Liberator", "sentence", "sentence-order-collection"],
    ["magic-defense", "Magic Defense", "vocabulary", "typing-defense"],
    ["astral-mage", "Astral Mage", "sentence", "target-action"],
    ["sorcerer-ziggurat", "The Sorcerer's Ziggurat", "sentence", "step-traversal"],
    ["dragon-rider", "Dragon Rider", "vocabulary", "two-lane-gate-traversal"],
    ["spellweavers-run", "Spellweavers Run", "sentence", "three-lane-ordered-collector"],
    ["griffin-riders-escape", "Griffin Riders Escape", "sentence", "three-lane-perspective-gates"],
    ["storm-castle-tower", "Storm Castle Tower", "sentence", "vertical-ordered-traversal"],
  ] as const;
  const cartridgeCatalog = entries.map(([id, title, inputMode, mechanic]) => ({ id, title, inputMode, mechanic }));
  const cartridgeLoaders = Object.fromEntries(entries.map(([id, title, inputMode]) => [id, async () => ({ manifest: { id, title, inputMode }, createGameConfig: jest.fn() })]));
  return { cartridgeCatalog, cartridgeLoaders };
});

jest.mock("@reading-advantage/game-cartridges/editions", () => {
  const createEdition = (id: string, title: string) => ({ id, title, runtimeApiVersion: "1.0.0", assets: { hero: {} }, palette: {}, tuning: {} });
  const primaryChibiEdition = createEdition("primary-chibi", "Primary Chibi");
  const secondaryEpicEdition = createEdition("secondary-epic", "Secondary Epic");
  return {
    primaryChibiEdition,
    secondaryEpicEdition,
    resolveCartridgeEdition: (id: string) => id === "secondary-epic" ? secondaryEpicEdition : primaryChibiEdition,
  };
});

jest.mock("@reading-advantage/game-contracts", () => ({
  mapGameResultsToCompletionInput: (result: Record<string, unknown>, context: Record<string, unknown>) => {
    const { xp: _displayXp, ...persistedResult } = result;
    return { ...context, ...persistedResult };
  },
}));

describe("APKQCLab", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/qc");
  });

  it("discovers cartridges, switches editions, and exposes QC-only result mapping", async () => {
    render(<APKQCLab />);

    expect(screen.getByRole("heading", { name: /Cartridge proving ground/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dragon Flight/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Dungeon Liberator/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Magic Defense/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Astral Mage/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /The Sorcerer's Ziggurat/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dragon Rider/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Spellweavers Run/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Griffin Riders Escape/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Storm Castle Tower/i })).toBeInTheDocument();
    expect(screen.queryByText(/Sky Gate Sprint|Rune Trail|Arcane Bulwark/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Nothing is authenticated or persisted/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Secondary Epic" }));
    expect(screen.getByRole("button", { name: "Secondary Epic" })).toHaveAttribute("aria-pressed", "true");

    const complete = await screen.findByRole("button", { name: "Complete mock session" });
    fireEvent.click(complete);
    await waitFor(() => expect(screen.getAllByText(/"score": 400/)).toHaveLength(2));
    expect(screen.getAllByText(/"xp": 40/)).toHaveLength(1);
    expect(screen.getByText(/"gameType": "dragon-flight"/)).toBeInTheDocument();
    expect(screen.getByText(/display XP is deliberately excluded/i)).toBeInTheDocument();
  });

  it.each([
    ["Astral Mage", "astral-mage"],
    ["The Sorcerer's Ziggurat", "sorcerer-ziggurat"],
    ["Spellweavers Run", "spellweavers-run"],
    ["Storm Castle Tower", "storm-castle-tower"],
  ] as const)(
    "discovers %s and emits its public cartridge identity",
    async (title, cartridgeId) => {
      render(<APKQCLab />);

      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(title, "i") }),
      );
      expect(
        screen.getByText(`${cartridgeId} · sentence`, { exact: true }),
      ).toBeInTheDocument();

      fireEvent.click(
        await screen.findByRole("button", { name: "Complete mock session" }),
      );
      await waitFor(() =>
        expect(
          screen.getByText(new RegExp(`"gameType": "${cartridgeId}"`)),
        ).toBeInTheDocument(),
      );
    },
  );

  it("selects a public cartridge from the QC deep-link query", async () => {
    window.history.replaceState({}, "", "/qc?cartridge=astral-mage");

    render(<APKQCLab />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Astral Mage/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(
      screen.getByText("astral-mage · sentence", { exact: true }),
    ).toBeInTheDocument();
  });
});
