import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { APKArcadeHost } from "./APKArcadeHost";

const mockUseArcadeSession = jest.fn();

jest.mock("./use-arcade-session", () => ({
  useArcadeSession: () => mockUseArcadeSession(),
}));

jest.mock("@/lib/basePath", () => ({
  withBasePath: (path: string) => `/reading${path}`,
}));

jest.mock("next/dynamic", () => () => {
  function MockAPKGameHost(props: {
    edition: { id: string };
    input: readonly { term: string; translation: string }[];
    onComplete(result: unknown): void;
  }) {
    return (
      <div data-testid="apk-host" data-edition={props.edition.id}>
        <span>{props.input[0]?.term}</span>
        <button
          type="button"
          onClick={() =>
            props.onComplete({
              accuracy: 1,
              xp: 999,
              score: 400,
              correctAnswers: 4,
              totalAttempts: 4,
            })
          }
        >
          Finish cartridge
        </button>
      </div>
    );
  }
  return MockAPKGameHost;
});

jest.mock("@reading-advantage/game-cartridges/catalog", () => ({
  cartridgeCatalog: [
    { id: "dragon-flight", title: "Dragon Flight", inputMode: "vocabulary" },
    { id: "dungeon-liberator", title: "Dungeon Liberator", inputMode: "sentence" },
    { id: "magic-defense", title: "Magic Defense", inputMode: "vocabulary" },
    { id: "astral-mage", title: "Astral Mage", inputMode: "sentence" },
    { id: "sorcerer-ziggurat", title: "The Sorcerer's Ziggurat", inputMode: "sentence" },
    { id: "dragon-rider", title: "Dragon Rider", inputMode: "vocabulary" },
    { id: "spellweavers-run", title: "Spellweavers Run", inputMode: "sentence" },
    { id: "griffin-riders-escape", title: "Griffin Riders Escape", inputMode: "sentence" },
    { id: "storm-castle-tower", title: "Storm Castle Tower", inputMode: "sentence" },
  ],
  cartridgeLoaders: {
    "dragon-flight": jest.fn(async () => ({ manifest: { id: "dragon-flight" } })),
    "dungeon-liberator": jest.fn(async () => ({ manifest: { id: "dungeon-liberator" } })),
    "magic-defense": jest.fn(async () => ({ manifest: { id: "magic-defense" } })),
    "astral-mage": jest.fn(async () => ({ manifest: { id: "astral-mage" } })),
    "sorcerer-ziggurat": jest.fn(async () => ({ manifest: { id: "sorcerer-ziggurat" } })),
    "dragon-rider": jest.fn(async () => ({ manifest: { id: "dragon-rider" } })),
    "spellweavers-run": jest.fn(async () => ({ manifest: { id: "spellweavers-run" } })),
    "griffin-riders-escape": jest.fn(async () => ({ manifest: { id: "griffin-riders-escape" } })),
    "storm-castle-tower": jest.fn(async () => ({ manifest: { id: "storm-castle-tower" } })),
  },
}));

jest.mock("@reading-advantage/game-cartridges/editions", () => ({
  primaryChibiEdition: { id: "primary-chibi", title: "Primary Chibi" },
  secondaryEpicEdition: { id: "secondary-epic", title: "Secondary Epic" },
  resolveCartridgeEdition: (id: string) => ({ id, title: id }),
}));

describe("APKArcadeHost", () => {
  beforeEach(() => {
    mockUseArcadeSession.mockReturnValue({
      session: { user: { id: "student-1", role: "STUDENT" } },
      status: "authenticated",
    });
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        xpEarned: 8,
        duplicate: false,
        activityId: "activity-1",
      }),
    })) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads one shared host and switches editions without changing content", async () => {
    render(
      <APKArcadeHost
        cartridgeId="dragon-flight"
        locale="en"
        title="Dragon Flight"
        inputMode="vocabulary"
      />,
    );

    const host = await screen.findByTestId("apk-host");
    expect(host).toHaveAttribute("data-edition", "primary-chibi");
    expect(screen.getByText("journey")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Secondary Epic" }));
    expect(await screen.findByTestId("apk-host")).toHaveAttribute(
      "data-edition",
      "secondary-epic",
    );
    expect(screen.getByText("journey")).toBeInTheDocument();
    expect(screen.getAllByTestId("apk-host")).toHaveLength(1);
  });

  it("posts a strict completion without display XP and offers the continuous loop", async () => {
    render(
      <APKArcadeHost
        cartridgeId="astral-mage"
        locale="en"
        title="Astral Mage"
        inputMode="sentence"
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Finish cartridge" }),
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith(
      "/reading/api/v1/apk/complete",
      expect.objectContaining({ method: "POST" }),
    );
    const request = (global.fetch as jest.Mock).mock.calls[0]?.[1] as NonNullable<
      Parameters<typeof fetch>[1]
    >;
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      gameType: "astral-mage",
      score: 400,
      accuracy: 1,
      correctAnswers: 4,
      totalAttempts: 4,
    });
    expect(body).not.toHaveProperty("xp");
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("schoolId");

    expect(await screen.findByText("Saved · 8 XP earned")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replay" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Catalog" })).toHaveLength(2);
    for (const link of screen.getAllByRole("link", { name: "Catalog" })) {
      expect(link).toHaveAttribute("href", "/");
    }
    expect(screen.getByRole("link", { name: /Next Game/ })).toHaveAttribute(
      "href",
      "/en/student/arcade/sorcerer-ziggurat",
    );
  });

  it("fails closed when no authenticated student session exists", () => {
    mockUseArcadeSession.mockReturnValue({ session: null, status: "unauthenticated" });

    render(
      <APKArcadeHost
        cartridgeId="magic-defense"
        locale="en"
        title="Magic Defense"
        inputMode="vocabulary"
      />,
    );

    expect(screen.queryByTestId("apk-host")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Sign in");
  });

  it("publishes readable keyboard and touch instructions for the runner wave", async () => {
    render(
      <APKArcadeHost
        cartridgeId="dragon-rider"
        locale="en"
        title="Dragon Rider"
        inputMode="vocabulary"
      />,
    );

    expect(
      screen.getByLabelText("Dragon Rider controls"),
    ).toHaveTextContent("Arrow Left and Arrow Right");
    expect(screen.getByLabelText("Dragon Rider controls")).toHaveTextContent(
      "tapping",
    );
    expect(await screen.findByTestId("apk-host")).toBeInTheDocument();
  });
});
