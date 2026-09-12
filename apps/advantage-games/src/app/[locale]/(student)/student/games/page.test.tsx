import { render, screen } from "@testing-library/react";

import StudentGamesCatalogPage, { resolveCatalogGameHref } from "./page";
import { gameCards } from "@/lib/gameCards";

const mockCatalogSession = jest.fn();
jest.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "catalog-session-fixture" }) }),
}));
jest.mock("@reading-advantage/auth", () => ({
  SESSION_COOKIE_NAME: "session_token",
  validateSession: (...args: unknown[]) => mockCatalogSession(...args),
}));
jest.mock("@reading-advantage/db", () => ({ db: {} }));
jest.mock("@reading-advantage/advantage-play-kit/react", () => ({
  StudentRpgCatalogPanel: ({ ownerKey }: { ownerKey?: string }) => (
    <div data-testid="catalog-rewards" data-owner={ownerKey ?? ""} />
  ),
  StudentChallengeCatalogPanel: (props: Record<string, unknown>) => (
    <div data-testid="catalog-challenges" data-props={JSON.stringify(props)} />
  ),
}));
jest.mock("@reading-advantage/game-cartridges", () => ({
  CARTRIDGE_CHALLENGE_CAPABILITIES: { "dragon-flight": { version: "v1" } },
  getCartridgeCatalogEntry: () => ({ title: "Dragon Flight" }),
}));

jest.mock("next/link", () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  Link.displayName = "Link";
  return Link;
});

/**
 * Renders the locale catalog page for a test.
 * @param locale Route locale segment.
 * @returns The rendered catalog output.
 */
async function renderCatalog(locale: string) {
  return render(
    await StudentGamesCatalogPage({
      params: Promise.resolve({ locale }),
    }),
  );
}

describe("StudentGamesCatalogPage", () => {
  beforeEach(() => mockCatalogSession.mockResolvedValue(null));

  it("scopes catalog rewards to the validated student and school", async () => {
    mockCatalogSession.mockResolvedValue({ user: { id: "student-a", schoolId: "school-a", role: "STUDENT" } });
    await renderCatalog("en");
    expect(screen.getByTestId("catalog-rewards")).toHaveAttribute("data-owner", "school-a:student-a");
    expect(JSON.parse(screen.getByTestId("catalog-challenges").getAttribute("data-props") ?? "{}")).toMatchObject({
      ownerKey: "school-a:student-a", locale: "en", games: { "dragon-flight": { title: "Dragon Flight", version: "v1" } },
      basePath: "/", classesEndpoint: "/api/v1/apk/classes", challengesEndpoint: "/api/v1/apk/challenges",
    });
  });

  it.each([
    null,
    { user: { id: "teacher-a", schoolId: "school-a", role: "TEACHER" } },
    { user: { id: "student-a", schoolId: null, role: "STUDENT" } },
  ])("omits catalog reward identity without an eligible student session: %j", async (session) => {
    mockCatalogSession.mockResolvedValue(session);
    await renderCatalog("en");
    expect(screen.getByTestId("catalog-rewards")).toHaveAttribute("data-owner", "");
  });

  it("prefixes a catalog href with the route locale", () => {
    expect(resolveCatalogGameHref("en", "/student/games/apk/castle-defense")).toBe(
      "/en/student/games/apk/castle-defense",
    );
  });

  it("renders every game card title", async () => {
    await renderCatalog("en");

    for (const game of gameCards) {
      expect(screen.getByText(game.title)).toBeInTheDocument();
    }
  });

  it("links each playable card to the locale-prefixed catalog href", async () => {
    await renderCatalog("en");

    const playableGames = gameCards.filter((game) => game.status === "playable" && game.href);
    const links = screen.getAllByRole("link", { name: /Start Game/i });
    const hrefs = links.map((link) => link.getAttribute("href"));

    expect(links).toHaveLength(playableGames.length);
    expect(hrefs).toEqual(
      expect.arrayContaining(playableGames.map((game) => `/en${game.href}`)),
    );
  });

  it("uses the route locale when linking a playable card", async () => {
    await renderCatalog("th");

    const castleDefense = screen
      .getAllByRole("link", { name: /Start Game/i })
      .find((link) => link.getAttribute("href") === "/th/student/games/apk/castle-defense");

    expect(castleDefense).toBeDefined();
  });

  it("includes a home link to an existing arcade route", async () => {
    await renderCatalog("en");

    const home = screen.getByRole("link", { name: /back to arcade/i });
    expect(["/", "/en"]).toContain(home.getAttribute("href"));
  });
});
