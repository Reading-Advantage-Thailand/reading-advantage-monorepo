import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";

import ArcadeCartridgePage from "./page";

jest.mock("next/navigation", () => ({ notFound: jest.fn() }));
jest.mock("@/features/apk-arcade/APKArcadeHost", () => ({
  APKArcadeHost: (props: { cartridgeId: string; inputMode: string }) => (
    <div data-testid="arcade-host">
      {props.cartridgeId}:{props.inputMode}
    </div>
  ),
}));

describe("ArcadeCartridgePage", () => {
  it("mounts the same generic route for a published cartridge", async () => {
    render(
      await ArcadeCartridgePage({
        params: Promise.resolve({ locale: "en", cartridgeId: "dragon-flight" }),
      }),
    );

    expect(screen.getByTestId("arcade-host")).toHaveTextContent(
      "dragon-flight:vocabulary",
    );
  });

  it("uses the normal not-found boundary for an unknown ID", async () => {
    (notFound as jest.Mock).mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(
      ArcadeCartridgePage({
        params: Promise.resolve({ locale: "en", cartridgeId: "not-a-game" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
