import "@testing-library/jest-dom/vitest";
import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { APKGameHost } from "./apk-game-host.js";
import { createMockGameFactory } from "../testing/test-kit.js";
import { createRuntimeCartridge, createRuntimeEdition, validResults } from "../testing/fixtures.js";
import type { GameFactory } from "../runtime/types.js";

describe("APKGameHost", () => {
  it("provides accessible status, canvas region, controls, and completion output", async () => {
    const factory = createMockGameFactory();
    const onComplete = vi.fn();
    render(
      <APKGameHost
        aria-label="Gate runner QC"
        cartridge={createRuntimeCartridge()}
        input={[{ term: "river", translation: "riviere" }]}
        edition={createRuntimeEdition()}
        factory={factory}
        onComplete={onComplete}
        instructions="Choose the matching translation."
      />,
    );

    expect(screen.getByRole("region", { name: "Gate runner QC" })).toBeInTheDocument();
    expect(screen.getByText("Loading game..." )).toHaveAttribute("aria-live", "polite");
    await screen.findByText("Game ready");
    expect(screen.getByText("Choose the matching translation.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pause game" }));
    expect(screen.getByRole("button", { name: "Resume game" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume game" }));
    expect(screen.getByRole("button", { name: "Pause game" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mute game" }));
    expect(screen.getByRole("button", { name: "Unmute game" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Unmute game" }));
    expect(screen.getByRole("button", { name: "Mute game" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restart game" }));
    await screen.findByText("Game ready");

    act(() => factory.contexts[0]?.complete(validResults));
    expect(await screen.findByText("Game complete")).toBeInTheDocument();
    expect(screen.getByText("Score: 120")).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(validResults);
  });

  it("renders actionable startup failures outside the canvas", async () => {
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={[{ term: "river", translation: "riviere" }]}
        edition={createRuntimeEdition()}
        factory={async () => {
          throw new Error("WebGL unavailable");
        }}
      />,
    );
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("WebGL unavailable"));
  });

  it("keeps one canvas when StrictMode remounts during async renderer startup", async () => {
    const pending: Array<() => void> = [];
    const destroy = vi.fn();
    const factory: GameFactory = async ({ container }) => {
      const canvas = document.createElement("canvas");
      container.append(canvas);
      await new Promise<void>((resolve) => pending.push(resolve));
      return {
        destroy: () => {
          destroy();
          canvas.remove();
        },
      };
    };

    render(
      <StrictMode>
        <APKGameHost
          cartridge={createRuntimeCartridge()}
          input={[{ term: "river", translation: "riviere" }]}
          edition={createRuntimeEdition()}
          factory={factory}
        />
      </StrictMode>,
    );

    await waitFor(() => expect(pending).toHaveLength(2));
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(1);

    await act(async () => {
      for (const resolve of pending) resolve();
      await Promise.resolve();
    });

    await screen.findByText("Game ready");
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
