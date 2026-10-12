import { describe, expect, it } from "vitest";

import { challengeCapabilityOf, challengeGames, gameFor, isSentenceGame, LEGACY_GAME_IDS, OLD_GAME_PATHS, oldGameTarget, playableGames, practiceLocaleOf } from "../catalog";

describe("gameFor", () => {
  it("finds a 3D game by its id and by its legacy 2D id", () => {
    expect(gameFor("dragon-flight")?.id).toBe("dragon-flight");
    expect(gameFor("wizard-vs-zombie")?.id).toBe("hero-vs-zombie");
    expect(gameFor("labyrinth-goblin-king")?.id).toBe("labyrinth");
  });

  it("returns undefined for an unknown id", () => {
    expect(gameFor("monster-encounters")).toBeUndefined();
    expect(gameFor("")).toBeUndefined();
  });

  it("maps every legacy id to a playable game", () => {
    for (const id of Object.keys(LEGACY_GAME_IDS)) expect(gameFor(id)?.load).toBeTypeOf("function");
  });
});

describe("challengeCapabilityOf", () => {
  it("reads the capability from the manifest, through a legacy id too", () => {
    expect(challengeCapabilityOf("wizard-vs-zombie")).toEqual({ version: "2026-10-06.1", inputMode: "vocabulary", modalities: ["reading", "read-to-select-audio"] });
    expect(challengeCapabilityOf("dragon-rider")?.inputMode).toBe("vocabulary");
  });

  it("is undefined for a game without a class challenge", () => {
    expect(challengeCapabilityOf("rune-match")).toBeUndefined();
    expect(challengeCapabilityOf("nope")).toBeUndefined();
  });
});

describe("practiceLocaleOf", () => {
  it("uses the page language for translations, and Thai on an English page", () => {
    expect(practiceLocaleOf("vi")).toBe("vi");
    expect(practiceLocaleOf("en")).toBe("th");
  });
});

describe("playableGames, isSentenceGame, challengeGames", () => {
  it("lists the 28 playable games and sorts the sentence games by their needs", () => {
    const games = playableGames();
    expect(games.length).toBe(28);
    expect(isSentenceGame(gameFor("castle-defense")!)).toBe(true);
    expect(isSentenceGame(gameFor("hero-vs-zombie")!)).toBe(false);
  });

  it("lists the challenge games with their manifest title and version", () => {
    expect(challengeGames()).toEqual({
      "dragon-flight": { title: expect.any(String), version: "2026-10-06.1" },
      "hero-vs-zombie": { title: "Hero vs. Zombie", version: "2026-10-06.1" },
      "dragon-rider": { title: expect.any(String), version: "2026-10-06.1" },
    });
  });
});

describe("oldGameTarget", () => {
  it.each(Object.entries(OLD_GAME_PATHS).flatMap(([group, ids]) => ids.map((id) => [group, id])))(
    "sends /student/games/%s/%s to the playable game with the same id",
    (group, id) => {
      const target = oldGameTarget(group, id);
      expect(target).toBe(`/student/games/apk/${id}`);
      expect(gameFor(id)?.id).toBe(id);
    },
  );

  it("gives undefined for an unknown id, a wrong group, or an inherited key", () => {
    expect(oldGameTarget("vocabulary", "unknown")).toBeUndefined();
    expect(oldGameTarget("vocabulary", "potion-rush")).toBeUndefined();
    expect(oldGameTarget("sentences", "rune-match")).toBeUndefined();
    expect(oldGameTarget("toString", "x")).toBeUndefined();
  });
});
