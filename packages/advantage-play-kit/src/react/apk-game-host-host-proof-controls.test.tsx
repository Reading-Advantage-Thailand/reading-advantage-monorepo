import "@testing-library/jest-dom/vitest";
import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { APKGameHost } from "./apk-game-host.js";
import { createMockGameFactory } from "../testing/test-kit.js";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG } from "../responsive/responsive-composition.js";
import { createRuntimeCartridge, createRuntimeEdition, validResults } from "../testing/fixtures.js";

describe("APKGameHost signed-attempt controls", () => {
  it("can suppress unverified result display and generic restart while preserving completion forwarding", async () => {
    const factory = createMockGameFactory();
    const onComplete = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={[{ term: "river", translation: "riviere" }]}
        edition={createRuntimeEdition()}
        factory={factory}
        onComplete={onComplete}
        showClientResult={false}
        showRestartControl={false}
      />,
    );

    await screen.findByText("Game ready");
    expect(screen.queryByRole("button", { name: "Restart game" })).not.toBeInTheDocument();

    act(() => factory.contexts[0]?.complete(validResults));

    expect(await screen.findByText("Game complete")).toBeInTheDocument();
    expect(screen.queryByLabelText("Game result")).not.toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(validResults);
  });

  it("forwards responsive policy, applies canvas styling, and preserves default local controls", async () => {
    const clientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
    const clientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");
    Object.defineProperties(HTMLElement.prototype, {
      clientWidth: { configurable: true, get: () => 390 },
      clientHeight: { configurable: true, get: () => 844 },
    });
    const factory = createMockGameFactory();
    const rendered = render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={[{ term: "river", translation: "riviere" }]}
        edition={createRuntimeEdition()}
        factory={factory}
        responsive={{
          config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
          safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
          inputCapabilities: { touch: true, pointer: true, keyboard: true },
          accessibility: { textScale: 1, touchScale: 1 },
        }}
        canvasClassName="host-proof-canvas"
        canvasStyle={{ minHeight: 444, touchAction: "pan-y" }}
      />,
    );

    try {
      await screen.findByText("Game ready");
      expect(factory.contexts[0]?.composition).toMatchObject({ profile: "compact", inputMode: "hybrid" });
      const canvasHost = rendered.container.querySelector<HTMLElement>("[data-apk-canvas-host]");
      expect(canvasHost).toHaveClass("host-proof-canvas");
      expect(canvasHost).toHaveStyle({ minHeight: "444px", touchAction: "pan-y" });
      expect(screen.getByRole("button", { name: "Restart game" })).toBeInTheDocument();

      act(() => factory.contexts[0]?.complete(validResults));

      const host = within(rendered.container);
      expect(await host.findByText("Game complete")).toBeInTheDocument();
      expect(host.getByLabelText("Game result")).toBeInTheDocument();
    } finally {
      rendered.unmount();
      if (clientWidth) Object.defineProperty(HTMLElement.prototype, "clientWidth", clientWidth);
      else Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
      if (clientHeight) Object.defineProperty(HTMLElement.prototype, "clientHeight", clientHeight);
      else Reflect.deleteProperty(HTMLElement.prototype, "clientHeight");
    }
  });
});
