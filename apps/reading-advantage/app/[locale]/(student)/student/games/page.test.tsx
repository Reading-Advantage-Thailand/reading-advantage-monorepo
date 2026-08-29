import { fireEvent, render, screen } from "@testing-library/react";

import GamesPage from "./page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("@/locales/client", () => ({
  useScopedI18n: () => (key: string) => key,
}));
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));
jest.mock("@reading-advantage/game-cartridges", () => ({
  cartridgeCatalog: [
    {
      id: "dragon-flight",
      title: "Dragon Flight",
      description: "Fly through gates.",
      inputMode: "vocabulary",
    },
    {
      id: "castle-defense",
      title: "Castle Defense",
      description: "Defend the castle.",
      inputMode: "sentence",
    },
  ],
}));

describe("Reading student games catalog", () => {
  it("lists every public APK title and opens the live student route", () => {
    render(<GamesPage />);
    expect(screen.getAllByRole("button", { name: /playNow/i })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: /playNow/i })[0]!);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringMatching(/^\/student\/games\/apk\/[a-z0-9-]+$/),
    );
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining("/vocabulary/"));
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining("/sentence/"));
  });
});
