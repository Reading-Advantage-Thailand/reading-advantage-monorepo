import { fireEvent, render, screen } from "@testing-library/react";

import { StudentGamesCatalog } from "./StudentGamesCatalog";

const mockPush = jest.fn();
const mockStudentRpgCatalogPanel = jest.fn(({ ownerKey }: { ownerKey?: string }) => (
  <div data-testid="student-rpg-catalog-panel">owner={ownerKey ?? "none"}</div>
));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ locale: "th" }),
}));
jest.mock("@/locales/client", () => ({
  useScopedI18n: () => (key: string) => key,
}));
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt: string; src: string }) => <img alt={props.alt} src={props.src} />,
}));
jest.mock("@reading-advantage/advantage-play-kit/react", () => ({
  StudentRpgCatalogPanel: (props: { ownerKey?: string }) => mockStudentRpgCatalogPanel(props),
  StudentChallengeCatalogPanel: (props: Record<string, unknown>) => <div data-testid="student-challenges" data-props={JSON.stringify(props)} />,
}));
jest.mock("@reading-advantage/game-cartridges", () => ({
  CARTRIDGE_CHALLENGE_CAPABILITIES: { "dragon-flight": { version: "v1" } },
  getCartridgeCatalogEntry: (id: string) => id === "dragon-flight" ? { title: "Dragon Flight" } : undefined,
  cartridgeCatalog: [
    { id: "dragon-flight", title: "Dragon Flight", description: "Fly through gates.", inputMode: "vocabulary" },
    { id: "castle-defense", title: "Castle Defense", description: "Defend the castle.", inputMode: "sentence" },
  ],
}));

describe("StudentGamesCatalog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows one RPG panel above the existing catalog sections", () => {
    render(<StudentGamesCatalog ownerKey="school-1:student-7" />);

    expect(screen.getByTestId("student-rpg-catalog-panel")).toHaveTextContent("owner=school-1:student-7");
    expect(mockStudentRpgCatalogPanel).toHaveBeenCalledTimes(1);
    expect(JSON.parse(screen.getByTestId("student-challenges").getAttribute("data-props") ?? "{}")).toMatchObject({
      ownerKey: "school-1:student-7", locale: "th", games: { "dragon-flight": { title: "Dragon Flight", version: "v1" } },
    });
    expect(screen.getByText("sections.vocabulary")).toBeInTheDocument();
    expect(screen.getByText("sections.sentence")).toBeInTheDocument();
  });

  it("lists every public APK title and opens the live student route", () => {
    render(<StudentGamesCatalog ownerKey="school-1:student-7" />);
    expect(screen.getAllByRole("button", { name: /playNow/i })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: /playNow/i })[0]!);

    expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/student\/games\/apk\/[a-z0-9-]+$/));
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining("/vocabulary/"));
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining("/sentence/"));
  });

  it("preserves catalog cover images and card navigation", () => {
    render(<StudentGamesCatalog />);

    expect(screen.getByRole("img", { name: "Dragon Flight" })).toHaveAttribute("src", "/games/cover/dragon-flight-cover.png");
    fireEvent.click(screen.getByText("Castle Defense"));
    expect(mockPush).toHaveBeenCalledWith("/student/games/apk/castle-defense");
  });
});
