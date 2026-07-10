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
    ["gate-runner", "Sky Gate Sprint", "vocabulary", "gate-runner"],
    ["sentence-collector", "Rune Trail", "sentence", "sentence-order-collection"],
    ["typing-defense", "Arcane Bulwark", "vocabulary", "typing-defense"],
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
  it("discovers cartridges, switches editions, and exposes QC-only result mapping", async () => {
    render(<APKQCLab />);

    expect(screen.getByRole("heading", { name: /Cartridge proving ground/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sky Gate Sprint/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Rune Trail/i })).toBeInTheDocument();
    expect(screen.getByText(/Nothing is authenticated or persisted/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Secondary Epic" }));
    expect(screen.getByRole("button", { name: "Secondary Epic" })).toHaveAttribute("aria-pressed", "true");

    const complete = await screen.findByRole("button", { name: "Complete mock session" });
    fireEvent.click(complete);
    await waitFor(() => expect(screen.getAllByText(/"score": 400/)).toHaveLength(2));
    expect(screen.getAllByText(/"xp": 40/)).toHaveLength(1);
    expect(screen.getByText(/display XP is deliberately excluded/i)).toBeInTheDocument();
  });
});
