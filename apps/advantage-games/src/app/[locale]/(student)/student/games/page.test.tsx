import { render, screen } from "@testing-library/react";

import StudentGamesCatalogPage, { resolveCatalogGameHref } from "./page";
import { gameCards } from "@/lib/gameCards";

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
