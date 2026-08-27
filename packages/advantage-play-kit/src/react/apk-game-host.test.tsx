import "@testing-library/jest-dom/vitest";
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APKGameHost } from "./apk-game-host.js";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG } from "../responsive/responsive-composition.js";
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
  it("passes a compact host composition to the game factory", async () => {
    const width = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
    const height = vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(640);
    const factory = createMockGameFactory();

    try {
      render(
        <APKGameHost
          cartridge={createRuntimeCartridge()}
          input={learningInput}
          edition={createRuntimeEdition()}
          factory={factory}
          responsive={{
            config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
            safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
            inputCapabilities: { touch: true, pointer: true, keyboard: true },
            accessibility: { textScale: 1, touchScale: 1 },
          }}
        />,
      );

      await screen.findByText("Game ready");
      expect(document.querySelector("[data-apk-runtime-mount]")).toHaveStyle({
        width: "100%",
        height: "100%",
      });
      expect(factory.contexts[0]?.composition).toMatchObject({
        profile: "compact",
        safeRect: { width: 390, height: 640 },
      });
    } finally {
      width.mockRestore();
      height.mockRestore();
    }
  });

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
    let failStart = true;
    const onLifecycleTransition = vi.fn(() => {
      if (failStart) {
        throw new Error("The game start signal could not be delivered. Return to the briefing and try again.");
      }
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

    const retryStart = await screen.findByRole("button", { name: "Begin quest" });
    expect(retryStart).toBeEnabled();
    failStart = false;
    fireEvent.click(retryStart);

    expect(await screen.findByText("Game ready")).toBeInTheDocument();
    expect(factory.contexts).toHaveLength(1);
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

    const retryStart = await screen.findByRole("button", { name: "Begin quest" });
    expect(retryStart).toBeEnabled();
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
    fireEvent.click(screen.getByRole("button", { name: "Play again" }));

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
    expect(screen.getByRole("region", { name: "Game result" })).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("Pixel art assets by ElvGames")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exit" })).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(validResults, "complete");
  });

  it("pauses authoritative gameplay before showing the completion panel", async () => {
    const factory = createMockGameFactory();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={[{ term: "river", translation: "riviere" }]}
        edition={createRuntimeEdition()}
        factory={factory}
      />,
    );

    await screen.findByText("Game ready");
    act(() => factory.contexts[0]?.complete(validResults));

    expect(await screen.findByText("Game complete")).toBeInTheDocument();
    expect(factory.instances[0]?.pause).toHaveBeenCalledOnce();
  });

  it("keeps the completed result when host callback identities change", async () => {
    const factory = createMockGameFactory();
    const cartridge = createRuntimeCartridge();
    const edition = createRuntimeEdition();
    const input = [{ term: "river", translation: "riviere" }] as const;
    const firstComplete = vi.fn();
    const firstNavigate = vi.fn();
    const { rerender } = render(
      <APKGameHost
        cartridge={cartridge}
        input={input}
        edition={edition}
        factory={factory}
        onComplete={firstComplete}
        onNavigate={firstNavigate}
      />,
    );

    await screen.findByText("Game ready");
    act(() => factory.contexts[0]?.complete(validResults));
    await screen.findByText("Game complete");

    const replacementComplete = vi.fn();
    const replacementNavigate = vi.fn();
    rerender(
      <APKGameHost
        cartridge={cartridge}
        input={input}
        edition={edition}
        factory={factory}
        onComplete={replacementComplete}
        onNavigate={replacementNavigate}
      />,
    );

    expect(screen.getByText("Game complete")).toBeInTheDocument();
    expect(factory.contexts).toHaveLength(1);
    expect(factory.instances[0]?.destroy).not.toHaveBeenCalled();
  });

  it("rejects diagnostics from an old mount after a replacement mount starts", async () => {
    const factory = createMockGameFactory();
    const onDiagnostic = vi.fn();
    const cartridge = createRuntimeCartridge();
    const edition = createRuntimeEdition();
    const firstInput = [{ term: "river", translation: "riviere" }] as const;
    const replacementInput = [{ term: "mountain", translation: "montagne" }] as const;
    const { rerender } = render(
      <APKGameHost
        cartridge={cartridge}
        input={firstInput}
        edition={edition}
        factory={factory}
        onDiagnostic={onDiagnostic}
      />,
    );

    await screen.findByText("Game ready");
    const oldDiagnostic = factory.contexts[0]?.diagnostic;
    rerender(
      <APKGameHost
        cartridge={cartridge}
        input={replacementInput}
        edition={edition}
        factory={factory}
        onDiagnostic={onDiagnostic}
      />,
    );
    await screen.findByText("Game ready");
    expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce();
    onDiagnostic.mockClear();

    oldDiagnostic?.({ level: "warning", code: "OLD_SESSION", message: "old session" });
    expect(onDiagnostic).not.toHaveBeenCalled();

    factory.contexts[1]?.diagnostic({ level: "info", code: "CURRENT_SESSION", message: "current session" });
    expect(onDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "CURRENT_SESSION" }));
  });

  it.each(["victory", "defeat"] as const)(
    "propagates the %s terminal outcome with the validated result",
    async (outcome) => {
      const factory = createMockGameFactory();
      const onComplete = vi.fn();
      render(
        <APKGameHost
          cartridge={createRuntimeCartridge()}
          input={[{ term: "river", translation: "riviere" }]}
          edition={createRuntimeEdition()}
          factory={factory}
          onComplete={onComplete}
        />,
      );

      await screen.findByText("Game ready");
      act(() => factory.contexts[0]?.complete(validResults, outcome));

      await waitFor(() => expect(onComplete).toHaveBeenCalledWith(validResults, outcome));
    },
  );

  it("renders a defeat result when the cartridge supplies terminal outcome metadata", async () => {
    const factory = createMockGameFactory();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={[{ term: "river", translation: "riviere" }]}
        edition={createRuntimeEdition()}
        factory={factory}
      />,
    );

    await screen.findByText("Game ready");
    act(() => factory.contexts[0]?.complete(validResults, "defeat"));

    expect(await screen.findByText("Try again")).toBeInTheDocument();
    expect(screen.queryByText("Complete")).not.toBeInTheDocument();
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

  it("mounts a class demonstration that cannot emit production completions", async () => {
    const factory = createMockGameFactory();
    const onComplete = vi.fn();
    const onLifecycleTransition = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={briefing}
        onComplete={onComplete}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    expect(await screen.findByText("Class demonstration ready")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("scores are not saved");
    expect(factory.contexts).toHaveLength(1);
    expect(factory.contexts[0]?.sessionMode).toBe("demo");
    expect(onLifecycleTransition).toHaveBeenCalledWith({
      from: "briefing",
      event: "start",
      to: "demo",
    });

    act(() => factory.contexts[0]?.complete(validResults, "victory"));
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.queryByText("Game complete")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause demonstration" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Restart demonstration" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "End demonstration" })).toBeEnabled();
    for (const label of [
      "Pause demonstration",
      "Restart demonstration",
      "End demonstration",
      "Advance demonstration",
      "Mute game",
    ]) {
      expect(screen.getByRole("button", { name: label })).toHaveClass("min-h-11");
      expect(screen.getByRole("button", { name: label })).toHaveStyle({ minHeight: "44px" });
    }
  });

  it("returns from a class demonstration to the briefing without a scored session", async () => {
    const factory = createMockGameFactory();
    const onLifecycleTransition = vi.fn((transition) => {
      if (transition.from === "demo") {
        expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce();
      }
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

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    fireEvent.click(screen.getByRole("button", { name: "End demonstration" }));

    await waitFor(() => expect(onLifecycleTransition).toHaveBeenCalledWith({
      from: "demo",
      event: "demo-complete",
      to: "briefing",
    }));
    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Demonstrate for class" })).toBeEnabled();
    expect(screen.queryByText("Class demonstration ready")).not.toBeInTheDocument();
  });

  it("does not emit the briefing transition when the demo mount fails", async () => {
    const factory = createMockGameFactory();
    const failingFactory: GameFactory = async (context) => {
      if (context.sessionMode === "demo") throw new Error("demo mount failed");
      return factory(context);
    };
    const onLifecycleTransition = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={failingFactory}
        briefing={briefing}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("demo mount failed");
    expect(onLifecycleTransition).not.toHaveBeenCalledWith({
      from: "briefing",
      event: "start",
      to: "demo",
    });
    expect(screen.queryByText("Class demonstration ready")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Begin quest" })).toBeEnabled();
  });

  it("does not claim a demo when the configured Start demo mount fails", async () => {
    const factory = createMockGameFactory();
    const failingFactory: GameFactory = async (context) => {
      if (context.sessionMode === "demo") throw new Error("configured demo mount failed");
      return factory(context);
    };
    const onLifecycleTransition = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={failingFactory}
        briefing={{ ...briefing, startPhase: "demo" }}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("configured demo mount failed");
    expect(onLifecycleTransition).not.toHaveBeenCalledWith({
      from: "briefing",
      event: "start",
      to: "demo",
    });
    expect(screen.queryByText("Class demonstration ready")).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
  });

  it("opens a class demonstration immediately when launchPhase is demo", async () => {
    const factory = createMockGameFactory();
    const onComplete = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={briefing}
        onComplete={onComplete}
        launchPhase="demo"
      />,
    );

    expect(await screen.findByText("Class demonstration ready")).toBeInTheDocument();
    expect(factory.contexts[0]?.sessionMode).toBe("demo");
    expect(screen.queryByRole("button", { name: "Begin quest" })).not.toBeInTheDocument();

    act(() => factory.contexts[0]?.complete(validResults, "victory"));
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.queryByText("Game complete")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restart game" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Exit demonstration" })).not.toBeInTheDocument();
  });

  it("resumes a demonstration with demonstration status", async () => {
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

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    fireEvent.click(screen.getByRole("button", { name: "Pause demonstration" }));
    fireEvent.click(screen.getByRole("button", { name: "Resume demonstration" }));

    expect(await screen.findByText("Class demonstration ready")).toBeInTheDocument();
    expect(screen.queryByText("Game ready")).not.toBeInTheDocument();
  });

  it("cleans up a demonstration before navigating on Exit", async () => {
    const factory = createMockGameFactory();
    const onNavigate = vi.fn(() => {
      expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce();
      expect(factory.liveInstances).toBe(0);
      expect(document.querySelector("[data-apk-runtime-mount]")?.childElementCount).toBe(0);
    });
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={briefing}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    expect(screen.getByRole("button", { name: "Exit demonstration" })).toHaveClass("min-h-11");
    fireEvent.click(screen.getByRole("button", { name: "Exit demonstration" }));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith("catalog"));
    expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce();
    expect(factory.liveInstances).toBe(0);
    expect(document.querySelector("[data-apk-runtime-mount]")?.childElementCount).toBe(0);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Exit demonstration" })).not.toBeInTheDocument();
  });

  it("does not render Exit demonstration without navigation", async () => {
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

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");

    expect(screen.queryByRole("button", { name: "Exit demonstration" })).not.toBeInTheDocument();
  });

  it.each([
    "End demonstration",
    "Restart demonstration",
    "Advance demonstration",
    "Exit demonstration",
  ] as const)("returns to a usable briefing when %s teardown rejects", async (control) => {
    const factory = createMockGameFactory();
    const onNavigate = vi.fn();
    const onLifecycleTransition = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={briefing}
        onNavigate={onNavigate}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    factory.instances[0]?.destroy.mockRejectedValue(new Error("demo teardown failed"));

    fireEvent.click(screen.getByRole("button", { name: control }));

    expect(await screen.findByRole("alert")).toHaveTextContent("demo teardown failed");
    expect(factory.contexts).toHaveLength(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Begin quest" })).toBeEnabled();
    expect(screen.queryByText("Class demonstration ready")).not.toBeInTheDocument();
    expect(screen.queryByText("Game ready")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restart game" })).not.toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
    if (control === "End demonstration") {
      expect(onLifecycleTransition).not.toHaveBeenCalledWith({
        from: "demo",
        event: "demo-complete",
        to: "briefing",
      });
    }
    expect(onLifecycleTransition).not.toHaveBeenCalledWith({
      from: "countdown",
      event: "countdown-complete",
      to: "playing",
    });
  });

  it("does not emit playing when the skipped gameplay mount fails", async () => {
    const factory = createMockGameFactory();
    const failingFactory: GameFactory = async (context) => {
      if (context.sessionMode === "playing") throw new Error("scored mount failed");
      return factory(context);
    };
    const onLifecycleTransition = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={failingFactory}
        briefing={briefing}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    fireEvent.click(screen.getByRole("button", { name: "Advance demonstration" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("scored mount failed");
    expect(onLifecycleTransition).toHaveBeenCalledWith({
      from: "demo",
      event: "demo-complete",
      to: "countdown",
    });
    expect(onLifecycleTransition).not.toHaveBeenCalledWith({
      from: "countdown",
      event: "countdown-complete",
      to: "playing",
    });
    expect(screen.queryByText("Game ready")).not.toBeInTheDocument();
    expect(factory.contexts).toHaveLength(1);
  });

  it("disables demo controls and hides normal controls while teardown is pending", async () => {
    const factory = createMockGameFactory();
    const onNavigate = vi.fn();
    let releaseDestroy: () => void = () => undefined;
    const destroyPending = new Promise<void>((resolve) => {
      releaseDestroy = resolve;
    });
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={briefing}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    factory.instances[0]?.destroy.mockImplementation(() => destroyPending);

    fireEvent.click(screen.getByRole("button", { name: "End demonstration" }));
    await waitFor(() => expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce());

    expect(screen.getByRole("button", { name: "Pause demonstration" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Restart demonstration" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Advance demonstration" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Exit demonstration" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mute game" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Restart game" })).not.toBeInTheDocument();
    expect(factory.contexts).toHaveLength(1);

    await act(async () => {
      releaseDestroy();
    });
    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
  });

  it("does not let stale demo teardown clear a replacement mount", async () => {
    const factory = createMockGameFactory();
    let releaseDestroy: () => void = () => undefined;
    const destroyPending = new Promise<void>((resolve) => {
      releaseDestroy = resolve;
    });
    const cartridge = createRuntimeCartridge();
    const edition = createRuntimeEdition();
    const { rerender } = render(
      <APKGameHost
        cartridge={cartridge}
        input={learningInput}
        edition={edition}
        factory={factory}
        briefing={briefing}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    factory.instances[0]?.destroy.mockImplementation(() => destroyPending);
    fireEvent.click(screen.getByRole("button", { name: "End demonstration" }));
    await waitFor(() => expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce());

    rerender(
      <APKGameHost
        cartridge={cartridge}
        input={[{ term: "mountain", translation: "montagne" }]}
        edition={edition}
        factory={factory}
        briefing={briefing}
        launchPhase="demo"
      />,
    );
    await screen.findByText("Class demonstration ready");
    expect(factory.contexts).toHaveLength(2);

    await act(async () => {
      releaseDestroy();
      await Promise.resolve();
    });

    expect(screen.getByText("Class demonstration ready")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(factory.instances[1]?.destroy).not.toHaveBeenCalled();
  });

  it("ignores a stale demo teardown rejection after a replacement mount starts", async () => {
    const factory = createMockGameFactory();
    let rejectDestroy: (reason?: unknown) => void = () => undefined;
    const destroyPending = new Promise<void>((_resolve, reject) => {
      rejectDestroy = reject;
    });
    const cartridge = createRuntimeCartridge();
    const edition = createRuntimeEdition();
    const { rerender } = render(
      <APKGameHost
        cartridge={cartridge}
        input={learningInput}
        edition={edition}
        factory={factory}
        briefing={briefing}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    factory.instances[0]?.destroy.mockImplementation(() => destroyPending);
    fireEvent.click(screen.getByRole("button", { name: "End demonstration" }));
    await waitFor(() => expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce());

    rerender(
      <APKGameHost
        cartridge={cartridge}
        input={[{ term: "mountain", translation: "montagne" }]}
        edition={edition}
        factory={factory}
        briefing={briefing}
        launchPhase="demo"
      />,
    );
    await screen.findByText("Class demonstration ready");

    await act(async () => {
      rejectDestroy(new Error("stale teardown failed"));
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: "Pause demonstration" })).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(factory.instances[1]?.destroy).not.toHaveBeenCalled();
  });

  it("cleans up a scored mount when the playing transition callback fails", async () => {
    const factory = createMockGameFactory();
    const onLifecycleTransition = vi.fn((transition) => {
      if (transition.to === "playing") throw new Error("playing transition failed");
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

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    fireEvent.click(screen.getByRole("button", { name: "Advance demonstration" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("playing transition failed");
    expect(factory.instances[1]?.pause).toHaveBeenCalledOnce();
    expect(factory.instances[1]?.resume).not.toHaveBeenCalled();
    expect(factory.instances[1]?.destroy).toHaveBeenCalledOnce();
    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
    expect(screen.queryByText("Game ready")).not.toBeInTheDocument();
  });

  it("destroys a scored handle when pausing it for the countdown fails", async () => {
    const baseFactory = createMockGameFactory();
    const pause = vi.fn(() => {
      throw new Error("scored pause failed");
    });
    const destroy = vi.fn();
    const factory: GameFactory = async (context) => {
      if (context.sessionMode === "playing") {
        return { pause, destroy };
      }
      return baseFactory(context);
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

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    fireEvent.click(screen.getByRole("button", { name: "Advance demonstration" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("scored pause failed");
    expect(pause).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
  });

  it("does not accept completion before the scored playing transition succeeds", async () => {
    const baseFactory = createMockGameFactory();
    const onComplete = vi.fn();
    const factory: GameFactory = async (context) => {
      const instance = await baseFactory(context);
      if (context.sessionMode === "playing") context.complete(validResults, "victory");
      return instance;
    };
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={briefing}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    fireEvent.click(screen.getByRole("button", { name: "Advance demonstration" }));

    await screen.findByText("Game ready");
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.queryByText("Game complete")).not.toBeInTheDocument();
  });

  it("returns to briefing and permits retry after a scored mount failure", async () => {
    const successfulFactory = createMockGameFactory();
    let playingAttempts = 0;
    const factory: GameFactory = async (context) => {
      if (context.sessionMode === "playing") {
        playingAttempts += 1;
        if (playingAttempts === 1) throw new Error("scored mount failed");
      }
      return successfulFactory(context);
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

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    fireEvent.click(screen.getByRole("button", { name: "Advance demonstration" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("scored mount failed");
    const retry = await screen.findByRole("button", { name: "Begin quest" });
    expect(retry).toBeEnabled();
    fireEvent.click(retry);
    await screen.findByText("Game ready");
    expect(playingAttempts).toBe(2);
    expect(successfulFactory.contexts).toHaveLength(2);
  });

  it("uses a fixed seed for every demo when the caller omits one", async () => {
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

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    fireEvent.click(screen.getByRole("button", { name: "Restart demonstration" }));
    await screen.findByText("Class demonstration ready");

    expect(factory.contexts[0]?.seed).toBe(1);
    expect(factory.contexts[1]?.seed).toBe(1);
  });

  it("preserves an explicit seed for every demo mount", async () => {
    const factory = createMockGameFactory();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={briefing}
        seed={73}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    fireEvent.click(screen.getByRole("button", { name: "Restart demonstration" }));
    await screen.findByText("Class demonstration ready");

    expect(factory.contexts[0]?.seed).toBe(73);
    expect(factory.contexts[1]?.seed).toBe(73);
  });

  it("renders Advance demonstration only in demo mode", async () => {
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

    expect(screen.queryByRole("button", { name: "Advance demonstration" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End demonstration" })).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    expect(screen.getByRole("button", { name: "Advance demonstration" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "End demonstration" })).toBeEnabled();
  });

  it("skips a class demonstration to countdown then playing and mounts authoritative gameplay", async () => {
    const factory = createMockGameFactory();
    const onLifecycleTransition = vi.fn((transition) => {
      if (transition.to === "playing") {
        expect(factory.contexts).toHaveLength(2);
      }
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

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    expect(factory.contexts).toHaveLength(1);
    expect(factory.contexts[0]?.sessionMode).toBe("demo");

    fireEvent.click(screen.getByRole("button", { name: "Advance demonstration" }));

    await screen.findByText("Game ready");
    expect(factory.instances[0]?.destroy).toHaveBeenCalledTimes(1);
    expect(factory.contexts).toHaveLength(2);
    expect(factory.contexts[1]?.sessionMode).toBe("playing");
    expect(screen.queryByText("Class demonstration ready")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Advance demonstration" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End demonstration" })).not.toBeInTheDocument();
    expect(onLifecycleTransition).toHaveBeenCalledWith({
      from: "demo",
      event: "demo-complete",
      to: "countdown",
    });
    expect(onLifecycleTransition).toHaveBeenCalledWith({
      from: "countdown",
      event: "countdown-complete",
      to: "playing",
    });
  });

  it("allows production completion after skipping the demonstration", async () => {
    const factory = createMockGameFactory();
    const onComplete = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={briefing}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");

    act(() => factory.contexts[0]?.complete(validResults, "victory"));
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Advance demonstration" }));
    await screen.findByText("Game ready");

    act(() => factory.contexts[1]?.complete(validResults, "victory"));
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(validResults, "victory"));
    expect(await screen.findByText("Game complete")).toBeInTheDocument();
  });

  it("keeps End demonstration returning to briefing while Advance starts real play", async () => {
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

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");

    fireEvent.click(screen.getByRole("button", { name: "Advance demonstration" }));
    await screen.findByText("Game ready");

    expect(onLifecycleTransition).not.toHaveBeenCalledWith({
      from: "demo",
      event: "demo-complete",
      to: "briefing",
    });
    expect(screen.queryByRole("button", { name: "Begin quest" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause game" })).toBeInTheDocument();
  });

  it("does not show Advance demonstration outside demo mode and keeps tutorial and playing controls unchanged", async () => {
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

    expect(screen.queryByRole("button", { name: "Advance demonstration" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause game" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End demonstration" })).not.toBeInTheDocument();
  });
});
