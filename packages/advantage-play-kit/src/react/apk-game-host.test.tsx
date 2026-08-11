import "@testing-library/jest-dom/vitest";
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APKGameHost } from "./apk-game-host.js";
import { createMockGameFactory } from "../testing/test-kit.js";
import { createRuntimeCartridge, createRuntimeEdition, validResults } from "../testing/fixtures.js";
import type { GameFactory } from "../runtime/types.js";

afterEach(cleanup);

const briefing = {
  title: "Temple Word Quest",
  objective: "Match each Thai word with its English translation.",
  instructions: [{ title: "Choose", description: "Choose the matching translation." }],
  learningPreview: { heading: "Words to learn" },
  controls: [{ mode: "touch", label: "Tap", action: "Choose an answer" }],
  labels: { startAction: "Begin quest" },
} as const;

const learningInput = [
  { term: "แม่น้ำ", translation: "river" },
  { term: "ภูเขา", translation: "mountain" },
] as const;

describe("APKGameHost", () => {
  it("does not create a cartridge until its briefing Start action is activated, then mounts exactly once", async () => {
    const factory = createMockGameFactory();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={briefing}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(factory.contexts).toHaveLength(0);
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Pause game" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mute game" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restart game" })).not.toBeInTheDocument();

    const start = screen.getByRole("button", { name: "Begin quest" });
    fireEvent.click(start);
    fireEvent.click(start);

    await screen.findByText("Game ready");
    expect(factory.contexts).toHaveLength(1);
  });

  it("fails closed for invalid briefing data without creating a factory", async () => {
    const factory = createMockGameFactory();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={{ ...briefing, title: "   " } as never}
      />,
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(factory.contexts).toHaveLength(0);
  });

  it("fails closed for invalid learning input without creating a factory", async () => {
    const factory = createMockGameFactory();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={[{ term: "river" }]}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={briefing}
      />,
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(factory.contexts).toHaveLength(0);
  });

  it("emits the configured Start transition exactly once before mounting gameplay", async () => {
    const factory = createMockGameFactory();
    const onLifecycleTransition = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={briefing}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    const start = await screen.findByRole("button", { name: "Begin quest" });
    fireEvent.click(start);
    fireEvent.click(start);
    expect(onLifecycleTransition).toHaveBeenCalledWith({
      from: "briefing",
      event: "start",
      to: "playing",
    });
    expect(onLifecycleTransition).toHaveBeenCalledOnce();
    await screen.findByText("Game ready");
    expect(factory.contexts).toHaveLength(1);
  });

  it("recovers a synchronous Start lifecycle callback failure to a fresh briefing without mounting gameplay", async () => {
    const factory = createMockGameFactory();
    const onLifecycleTransition = vi.fn(() => {
      throw new Error("The game start signal could not be delivered. Return to the briefing and try again.");
    });
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={briefing}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The game start signal could not be delivered");
    expect(factory.contexts).toHaveLength(0);
    expect(screen.queryByText("Game ready")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause game" })).not.toBeInTheDocument();

    const returnToBriefing = screen.getByRole("button", { name: "Return to briefing" });
    expect(returnToBriefing).toBeEnabled();
    fireEvent.click(returnToBriefing);

    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(factory.contexts).toHaveLength(0);
    expect(screen.queryByText("Game ready")).not.toBeInTheDocument();
  });

  it("keeps a non-playing Start phase gated after emitting its transition", async () => {
    const factory = createMockGameFactory();
    const onLifecycleTransition = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={{ ...briefing, startPhase: "tutorial" }}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    expect(onLifecycleTransition).toHaveBeenCalledWith({
      from: "briefing",
      event: "start",
      to: "tutorial",
    });
    expect(onLifecycleTransition).toHaveBeenCalledOnce();
    expect(factory.contexts).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Pause game" })).not.toBeInTheDocument();
  });

  it("returns an unavailable Start phase error to the briefing without mounting gameplay", async () => {
    const factory = createMockGameFactory();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={{ ...briefing, startPhase: "tutorial" }}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("tutorial phase is not available");
    expect(factory.contexts).toHaveLength(0);

    const returnToBriefing = screen.getByRole("button", { name: "Return to briefing" });
    expect(returnToBriefing).toBeEnabled();
    fireEvent.click(returnToBriefing);

    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(factory.contexts).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Pause game" })).not.toBeInTheDocument();
  });

  it("recovers a renderer startup failure to a fresh briefing before one successful retry mount", async () => {
    const successfulFactory = createMockGameFactory();
    let attempts = 0;
    const factory: GameFactory = async (context) => {
      attempts += 1;
      if (attempts === 1) {
        const canvas = document.createElement("canvas");
        context.container.append(canvas);
        throw new Error("WebGL unavailable");
      }

      const canvas = document.createElement("canvas");
      context.container.append(canvas);
      const handle = await successfulFactory(context);
      return {
        ...handle,
        destroy: () => {
          canvas.remove();
          handle.destroy();
        },
      };
    };
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={briefing}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("WebGL unavailable");
    expect(attempts).toBe(1);
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(0);

    const returnToBriefing = screen.getByRole("button", { name: "Return to briefing" });
    expect(returnToBriefing).toBeEnabled();
    fireEvent.click(returnToBriefing);

    const retryStart = await screen.findByRole("button", { name: "Begin quest" });
    expect(retryStart).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(0);

    fireEvent.click(retryStart);
    await screen.findByText("Game ready");
    expect(attempts).toBe(2);
    expect(successfulFactory.contexts).toHaveLength(1);
    expect(successfulFactory.liveInstances).toBe(1);
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(1);
  });

  it("cleans up a completed briefing-enabled session before returning to briefing and creating one fresh replay mount", async () => {
    const factory = createMockGameFactory();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={briefing}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await screen.findByText("Game ready");
    expect(factory.contexts).toHaveLength(1);
    expect(factory.liveInstances).toBe(1);

    act(() => factory.contexts[0]?.complete(validResults));
    await screen.findByText("Game complete");
    fireEvent.click(screen.getByRole("button", { name: "Restart game" }));

    await screen.findByRole("button", { name: "Begin quest" });
    expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce();
    expect(factory.liveInstances).toBe(0);
    expect(factory.contexts).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Begin quest" }));
    await screen.findByText("Game ready");
    expect(factory.contexts).toHaveLength(2);
    expect(factory.liveInstances).toBe(1);
  });

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

  it("keeps StrictMode briefing-gated until Start, then displays one canvas", async () => {
    let mounts = 0;
    const factory: GameFactory = async ({ container }) => {
      mounts += 1;
      const canvas = document.createElement("canvas");
      container.append(canvas);
      return {
        destroy: () => canvas.remove(),
      };
    };

    render(
      <StrictMode>
        <APKGameHost
          cartridge={createRuntimeCartridge()}
          input={learningInput}
          edition={createRuntimeEdition()}
          factory={factory}
          briefing={briefing}
        />
      </StrictMode>,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(mounts).toBe(0);
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Begin quest" }));
    await screen.findByText("Game ready");
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(1);
  });
});
