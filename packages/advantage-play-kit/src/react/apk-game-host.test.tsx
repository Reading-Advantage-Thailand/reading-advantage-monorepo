import "@testing-library/jest-dom/vitest";
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APKGameHost } from "./apk-game-host.js";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG } from "../responsive/responsive-composition.js";
import { createMockGameFactory } from "../testing/test-kit.js";
import { createRuntimeCartridge, createRuntimeEdition, validResults } from "../testing/fixtures.js";
import type { APKHostAdapter, GameFactory } from "../runtime/types.js";

const mountHostObserver = vi.hoisted(() => ({
  capture: undefined as ((host: APKHostAdapter) => void) | undefined,
}));

vi.mock("../runtime/runtime.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../runtime/runtime.js")>();
  return {
    ...actual,
    mountCartridge: (...args: Parameters<typeof actual.mountCartridge>) => {
      mountHostObserver.capture?.(args[0].host);
      return actual.mountCartridge(...args);
    },
  };
});

afterEach(() => {
  mountHostObserver.capture = undefined;
  cleanup();
});

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

const tutorial = {
  schemaVersion: 1,
  id: "temple-word-quest-tutorial",
  title: "Temple Word Quest tutorial",
  seed: 29,
  labels: {
    progress: "Tutorial progress",
    pause: "Pause tutorial",
    resume: "Resume tutorial",
    advance: "Next tutorial step",
    replay: "Replay tutorial",
    skip: "Skip tutorial",
  },
  targets: [{ id: "mechanic:choice", kind: "mechanic" }],
  actions: [{ id: "action:choose", deterministic: true, consequence: "correct" }],
  steps: [{
    id: "step:choose",
    title: "Choose the correct answer",
    explanation: "The tutorial chooses one matching answer.",
    targetId: "mechanic:choice",
    actionId: "action:choose",
    timing: { leadInMs: 0, demonstrationMs: 0, lingerMs: 0 },
  }],
  lifecycle: {
    pause: "freeze-current-step",
    advance: "sequential",
    replay: "restart-with-same-seed",
    skip: { enabled: true, to: "playing" },
    complete: { to: "playing" },
    productionEffects: {
      emitGameResults: false,
      persistProgress: false,
      awardAuthoritativeXp: false,
      writeLeaderboard: false,
      applyFailureConsequences: false,
    },
  },
} as const;

const createReplayExperience = (replayEntry: "tutorial" | "playing") => ({
  definition: {
    briefing: { ...briefing, startPhase: "playing" as const },
    tutorial,
    debrief: {
      outcome: "complete" as const,
      requiredCredit: "Pixel art assets by ElvGames",
      replayEntry,
      exitDestination: "catalog",
    },
  },
  createTutorialActionDriver: () => ({ execute: vi.fn() }),
});

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

  it("emits the configured Start transition exactly once after mounting gameplay", async () => {
    const factory = createMockGameFactory();
    const onLifecycleTransition = vi.fn((transition) => {
      if (transition.to === "playing") expect(factory.contexts).toHaveLength(1);
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

    const start = await screen.findByRole("button", { name: "Begin quest" });
    fireEvent.click(start);
    fireEvent.click(start);
    await waitFor(() => expect(onLifecycleTransition).toHaveBeenCalledWith({
      from: "briefing",
      event: "start",
      to: "playing",
    }));
    expect(onLifecycleTransition).toHaveBeenCalledOnce();
    await screen.findByText("Game ready");
    expect(factory.contexts).toHaveLength(1);
  });

  it("recovers a synchronous Start lifecycle callback failure after cleaning up gameplay", async () => {
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
    expect(factory.contexts).toHaveLength(1);
    expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce();
    expect(screen.queryByText("Game ready")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause game" })).not.toBeInTheDocument();

    const retryStart = await screen.findByRole("button", { name: "Begin quest" });
    expect(retryStart).toBeEnabled();
    failStart = false;
    fireEvent.click(retryStart);

    expect(await screen.findByText("Game ready")).toBeInTheDocument();
    expect(factory.contexts).toHaveLength(2);
  });

  it("keeps a non-playing Start phase gated until its tutorial is ready", async () => {
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
    expect(await screen.findByRole("alert")).toHaveTextContent("tutorial phase is not available");
    expect(onLifecycleTransition).not.toHaveBeenCalled();
    expect(factory.contexts).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Begin quest" })).toBeEnabled();
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

    expect(screen.getByRole("button", { name: "Begin quest" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Return to briefing" })).not.toBeInTheDocument();
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

  it("does not emit a playing Start transition when the playing mount fails", async () => {
    const factory = createMockGameFactory();
    const onLifecycleTransition = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={async (context) => {
          if (context.sessionMode === "playing") throw new Error("playing mount failed");
          return factory(context);
        }}
        briefing={briefing}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("playing mount failed");
    expect(onLifecycleTransition).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Begin quest" })).toBeEnabled();
  });

  it("does not emit a tutorial Start transition when the tutorial mount fails", async () => {
    const factory = createMockGameFactory();
    const onLifecycleTransition = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={async (context) => {
          if (context.sessionMode === "tutorial") throw new Error("tutorial mount failed");
          return factory(context);
        }}
        briefing={{ ...briefing, startPhase: "tutorial" }}
        tutorial={tutorial}
        tutorialActionDriver={{ execute: vi.fn() }}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("tutorial mount failed");
    expect(onLifecycleTransition).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Begin quest" })).toBeEnabled();
  });

  it("keeps tutorial Start transactional when controller start fails", async () => {
    const factory = createMockGameFactory();
    const tutorialActionDriver = {
      execute: vi.fn(),
      destroy: vi.fn(),
    };
    const onLifecycleTransition = vi.fn();
    const tutorialClock = {
      now: vi.fn(() => 0),
      setTimeout: vi.fn(() => {
        throw new Error("tutorial scheduling failed");
      }),
      clearTimeout: vi.fn(),
    };
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={{ ...briefing, startPhase: "tutorial" }}
        tutorial={tutorial}
        tutorialActionDriver={tutorialActionDriver}
        tutorialClock={tutorialClock}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("tutorial scheduling failed");
    expect(onLifecycleTransition).not.toHaveBeenCalled();
    expect(tutorialActionDriver.destroy).toHaveBeenCalledOnce();
    expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce();
    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
  });

  it("recovers from tutorial controller construction failure without publishing Start", async () => {
    const factory = createMockGameFactory();
    const tutorialActionDriver = { execute: vi.fn(), destroy: vi.fn() };
    const onLifecycleTransition = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={{ ...briefing, startPhase: "tutorial" }}
        tutorial={{ ...tutorial, steps: [] } as never}
        tutorialActionDriver={tutorialActionDriver}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Game could not start");
    expect(onLifecycleTransition).not.toHaveBeenCalled();
    expect(tutorialActionDriver.destroy).toHaveBeenCalledOnce();
    expect(factory.contexts).toHaveLength(0);
    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
  });

  it("cleans tutorial resources when the external Start transition fails", async () => {
    const factory = createMockGameFactory();
    const tutorialActionDriver = {
      execute: vi.fn(),
      destroy: vi.fn(),
    };
    const onLifecycleTransition = vi.fn(() => {
      throw new Error("tutorial start signal failed");
    });
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={{ ...briefing, startPhase: "tutorial" }}
        tutorial={tutorial}
        tutorialActionDriver={tutorialActionDriver}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("tutorial start signal failed");
    expect(onLifecycleTransition).toHaveBeenCalledWith({
      from: "briefing",
      event: "start",
      to: "tutorial",
    });
    expect(tutorialActionDriver.destroy).toHaveBeenCalledOnce();
    expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce();
    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
  });

  it("rejects every callback retained by a failed mount after its retry succeeds", async () => {
    const successfulFactory = createMockGameFactory();
    const capturedHosts: APKHostAdapter[] = [];
    const onComplete = vi.fn();
    const onNavigate = vi.fn();
    const onDiagnostic = vi.fn();
    let attempts = 0;
    let failedMountPoint: HTMLElement | undefined;
    mountHostObserver.capture = (host) => capturedHosts.push(host);
    const factory: GameFactory = async (context) => {
      attempts += 1;
      if (attempts === 1) {
        failedMountPoint = context.container;
        throw new Error("renderer startup failed");
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
        onComplete={onComplete}
        onNavigate={onNavigate}
        onDiagnostic={onDiagnostic}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("renderer startup failed");
    fireEvent.click(screen.getByRole("button", { name: "Begin quest" }));
    await screen.findByText("Game ready");
    expect(capturedHosts).toHaveLength(2);
    expect(successfulFactory.contexts[0]?.container).toBe(failedMountPoint);
    onDiagnostic.mockClear();
    const replacementPauseCalls = successfulFactory.instances[0]?.pause.mock.calls.length ?? 0;

    await act(async () => {
      await capturedHosts[0]?.complete(validResults, "victory");
      capturedHosts[0]?.navigate?.("catalog");
      capturedHosts[0]?.diagnostic?.({
        level: "warning",
        code: "FAILED_MOUNT_CALLBACK",
        message: "A failed mount retained a callback",
        timestamp: 1,
      });
    });

    expect(successfulFactory.instances[0]?.pause).toHaveBeenCalledTimes(replacementPauseCalls);
    expect(onComplete).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onDiagnostic).not.toHaveBeenCalled();
    expect(screen.getByText("Game ready")).toBeInTheDocument();
    expect(screen.queryByText("Game complete")).not.toBeInTheDocument();
  });

  it("contains navigation and diagnostic callback failures without blocking completion", async () => {
    const factory = createMockGameFactory();
    const capturedHosts: APKHostAdapter[] = [];
    const onComplete = vi.fn();
    const onNavigate = vi.fn(() => {
      throw new Error("navigation observer failed");
    });
    const onDiagnostic = vi.fn(() => {
      throw new Error("diagnostic observer failed");
    });
    mountHostObserver.capture = (host) => capturedHosts.push(host);
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        onComplete={onComplete}
        onNavigate={onNavigate}
        onDiagnostic={onDiagnostic}
      />,
    );

    await screen.findByText("Game ready");
    expect(() => capturedHosts[0]?.navigate?.("catalog")).not.toThrow();
    expect(() => capturedHosts[0]?.diagnostic?.({
      level: "warning",
      code: "OBSERVER_FAILURE",
      message: "The diagnostic observer failed",
      timestamp: 1,
    })).not.toThrow();

    await act(async () => {
      await capturedHosts[0]?.complete(validResults, "victory");
    });
    expect(await screen.findByText("Game complete")).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(validResults, "victory");
  });

  it("contains tutorial snapshot callback failures without blocking tutorial playback", async () => {
    const factory = createMockGameFactory();
    const onTutorialSnapshot = vi.fn(() => {
      throw new Error("tutorial observer failed");
    });
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={{ ...briefing, startPhase: "tutorial" }}
        tutorial={tutorial}
        tutorialActionDriver={{ execute: vi.fn() }}
        onTutorialSnapshot={onTutorialSnapshot}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    expect(await screen.findByRole("button", { name: "Pause tutorial" })).toBeInTheDocument();
    expect(onTutorialSnapshot).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("accepts a synchronous completion emitted by a successful scored resume", async () => {
    const demoFactory = createMockGameFactory();
    const onComplete = vi.fn();
    const onLifecycleTransition = vi.fn();
    const factory: GameFactory = async (context) => {
      if (context.sessionMode === "demo") return demoFactory(context);
      return {
        pause: vi.fn(),
        resume: vi.fn(() => {
          context.complete(validResults, "victory");
        }),
        destroy: vi.fn(),
      };
    };
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
    await screen.findByText("Class demonstration ready");
    fireEvent.click(screen.getByRole("button", { name: "Advance demonstration" }));

    expect(await screen.findByText("Game complete")).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(validResults, "victory");
    expect(onLifecycleTransition).toHaveBeenCalledWith({
      from: "countdown",
      event: "countdown-complete",
      to: "playing",
    });
    expect(onLifecycleTransition).toHaveBeenCalledWith({
      from: "playing",
      event: "game-complete",
      to: "results",
    });
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

  it.each(["tutorial", "playing"] as const)(
    "publishes a results replay transition after the %s target initializes",
    async (replayEntry) => {
      const factory = createMockGameFactory();
      const onLifecycleTransition = vi.fn((transition) => {
        if (transition.from === "results") {
          expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce();
          expect(factory.contexts).toHaveLength(2);
          expect(factory.contexts[1]?.sessionMode).toBe(replayEntry);
        }
      });
      render(
        <APKGameHost
          cartridge={createRuntimeCartridge()}
          input={learningInput}
          edition={createRuntimeEdition()}
          factory={factory}
          standardExperience={createReplayExperience(replayEntry)}
          onLifecycleTransition={onLifecycleTransition}
        />,
      );

      fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
      await screen.findByText("Game ready");
      act(() => factory.contexts[0]?.complete(validResults));
      await screen.findByText("Game complete");
      fireEvent.click(screen.getByRole("button", { name: "Play again" }));

      await waitFor(() => expect(onLifecycleTransition).toHaveBeenCalledWith({
        from: "results",
        event: "replay",
        to: replayEntry,
      }));
    },
  );

  it("does not publish a results replay transition when the target mount fails", async () => {
    const baseFactory = createMockGameFactory();
    let attempts = 0;
    const factory: GameFactory = async (context) => {
      attempts += 1;
      if (attempts === 2) throw new Error("replay target mount failed");
      return baseFactory(context);
    };
    const onLifecycleTransition = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        standardExperience={createReplayExperience("playing")}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await screen.findByText("Game ready");
    act(() => baseFactory.contexts[0]?.complete(validResults));
    await screen.findByText("Game complete");
    fireEvent.click(screen.getByRole("button", { name: "Play again" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("replay target mount failed");
    expect(onLifecycleTransition).not.toHaveBeenCalledWith({
      from: "results",
      event: "replay",
      to: "playing",
    });
    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
  });

  it("does not publish a results replay transition when cleanup fails", async () => {
    const factory = createMockGameFactory();
    const onLifecycleTransition = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        standardExperience={createReplayExperience("playing")}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await screen.findByText("Game ready");
    act(() => factory.contexts[0]?.complete(validResults));
    await screen.findByText("Game complete");
    factory.instances[0]?.destroy.mockRejectedValue(new Error("replay cleanup failed"));
    fireEvent.click(screen.getByRole("button", { name: "Play again" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("replay cleanup failed");
    expect(onLifecycleTransition).not.toHaveBeenCalledWith({
      from: "results",
      event: "replay",
      to: "playing",
    });
    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
  });

  it("does not overwrite a completion with ready after a restart completes its replacement", async () => {
    const baseFactory = createMockGameFactory();
    const onComplete = vi.fn();
    const factory: GameFactory = async (context) => {
      const instance = await baseFactory(context);
      if (baseFactory.contexts.length === 2) context.complete(validResults, "victory");
      return instance;
    };
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        onComplete={onComplete}
      />,
    );

    await screen.findByText("Game ready");
    fireEvent.click(screen.getByRole("button", { name: "Restart game" }));

    expect(await screen.findByText("Game complete")).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(validResults, "victory");
    expect(screen.queryByText("Game ready")).not.toBeInTheDocument();
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

    act(() => factory.contexts[1]?.complete(validResults));
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

  it("starts one renderer when StrictMode remounts during async renderer startup", async () => {
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

    await waitFor(() => expect(pending).toHaveLength(1));
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(1);

    await act(async () => {
      for (const resolve of pending) resolve();
      await Promise.resolve();
    });

    await screen.findByText("Game ready");
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(1);
    expect(destroy).not.toHaveBeenCalled();
  });

  it("settles and cleans an in-flight mount before a prop replacement starts", async () => {
    let releaseFirstMount: () => void = () => undefined;
    const firstMountPending = new Promise<void>((resolve) => {
      releaseFirstMount = resolve;
    });
    const destroyers: Array<ReturnType<typeof vi.fn>> = [];
    let attempts = 0;
    let liveRenderers = 0;
    const factory: GameFactory = vi.fn(async ({ container }) => {
      attempts += 1;
      const canvas = document.createElement("canvas");
      container.append(canvas);
      liveRenderers += 1;
      let destroyed = false;
      const destroy = vi.fn(() => {
        if (destroyed) return;
        destroyed = true;
        liveRenderers -= 1;
        canvas.remove();
      });
      destroyers.push(destroy);
      if (attempts === 1) await firstMountPending;
      return { destroy };
    });
    const cartridge = createRuntimeCartridge();
    const edition = createRuntimeEdition();
    const { rerender } = render(
      <APKGameHost
        cartridge={cartridge}
        input={[{ term: "river", translation: "riviere" }]}
        edition={edition}
        factory={factory}
      />,
    );
    await waitFor(() => expect(factory).toHaveBeenCalledOnce());

    rerender(
      <APKGameHost
        cartridge={cartridge}
        input={[{ term: "mountain", translation: "montagne" }]}
        edition={edition}
        factory={factory}
      />,
    );
    await act(() => Promise.resolve());
    expect(factory).toHaveBeenCalledOnce();
    expect(liveRenderers).toBe(1);

    await act(async () => {
      releaseFirstMount();
    });
    await screen.findByText("Game ready");
    expect(factory).toHaveBeenCalledTimes(2);
    expect(destroyers[0]).toHaveBeenCalledOnce();
    expect(liveRenderers).toBe(1);
    expect(document.querySelectorAll("[data-apk-canvas-host] canvas")).toHaveLength(1);
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

  it("omits End demonstration when a direct demo has no briefing destination", async () => {
    const factory = createMockGameFactory();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        launchPhase="demo"
      />,
    );

    await screen.findByText("Class demonstration ready");
    expect(screen.queryByRole("button", { name: "End demonstration" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restart demonstration" })).toBeEnabled();
  });

  it("retries a failed direct demo through the visible Restart game action", async () => {
    const successfulFactory = createMockGameFactory();
    let attempts = 0;
    const factory: GameFactory = async (context) => {
      attempts += 1;
      if (attempts === 1) throw new Error("direct demo mount failed");
      return successfulFactory(context);
    };
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        launchPhase="demo"
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("direct demo mount failed");
    const retry = screen.getByRole("button", { name: "Restart game" });
    expect(retry).toBeEnabled();
    fireEvent.click(retry);

    await screen.findByText("Class demonstration ready");
    expect(attempts).toBe(2);
    expect(successfulFactory.contexts[0]?.sessionMode).toBe("demo");
    expect(successfulFactory.liveInstances).toBe(1);
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

  it("accepts completion emitted during an immediate no-briefing playing mount", async () => {
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
        onComplete={onComplete}
      />,
    );

    expect(await screen.findByText("Game complete")).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(validResults, "victory");
  });

  it("retries a failed no-briefing playing mount through Restart game", async () => {
    const successfulFactory = createMockGameFactory();
    let attempts = 0;
    const factory: GameFactory = async (context) => {
      attempts += 1;
      if (attempts === 1) throw new Error("direct playing mount failed");
      return successfulFactory(context);
    };
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("direct playing mount failed");
    fireEvent.click(screen.getByRole("button", { name: "Restart game" }));

    await screen.findByText("Game ready");
    expect(attempts).toBe(2);
    expect(successfulFactory.contexts[0]?.sessionMode).toBe("playing");
  });

  it("ignores a completion save failure after a direct restart", async () => {
    const factory = createMockGameFactory();
    let rejectSave: (reason?: unknown) => void = () => undefined;
    const savePending = new Promise<void>((_resolve, reject) => {
      rejectSave = reject;
    });
    const onComplete = vi.fn(() => savePending);
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        onComplete={onComplete}
      />,
    );

    await screen.findByText("Game ready");
    act(() => factory.contexts[0]?.complete(validResults, "victory"));
    await screen.findByText("Game complete");
    fireEvent.click(screen.getByRole("button", { name: "Play again" }));
    await screen.findByText("Game ready");

    await act(async () => {
      rejectSave(new Error("old result save failed"));
      await Promise.resolve();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Game ready")).toBeInTheDocument();
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

  it("retries failed demonstration cleanup before returning to briefing", async () => {
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
    factory.instances[0]?.destroy.mockImplementationOnce(() => {
      throw new Error("demo renderer cleanup failed");
    });

    fireEvent.click(screen.getByRole("button", { name: "End demonstration" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("demo renderer cleanup failed");
    expect(factory.contexts).toHaveLength(1);
    expect(factory.liveInstances).toBe(1);
    const retry = await screen.findByRole("button", { name: "Return to briefing" });
    fireEvent.click(retry);

    await screen.findByRole("button", { name: "Begin quest" });
    expect(factory.instances[0]?.destroy).toHaveBeenCalledTimes(2);
    expect(factory.liveInstances).toBe(0);
    expect(factory.contexts).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Begin quest" }));
    await screen.findByText("Game ready");
    expect(factory.contexts).toHaveLength(2);
    expect(factory.liveInstances).toBe(1);
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

  it("recovers a thrown pause command without escaping React", async () => {
    const factory = createMockGameFactory();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
      />,
    );

    await screen.findByText("Game ready");
    factory.instances[0]?.pause.mockImplementationOnce(() => {
      throw new Error("pause command failed");
    });
    fireEvent.click(screen.getByRole("button", { name: "Pause game" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("pause command failed");
    expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce();
    const retry = await screen.findByRole("button", { name: "Restart game" });
    fireEvent.click(retry);
    await screen.findByText("Game ready");
    expect(factory.contexts).toHaveLength(2);
    expect(factory.liveInstances).toBe(1);
  });

  it("recovers a thrown resume command without escaping React", async () => {
    const factory = createMockGameFactory();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
      />,
    );

    await screen.findByText("Game ready");
    fireEvent.click(screen.getByRole("button", { name: "Pause game" }));
    await screen.findByRole("button", { name: "Resume game" });
    factory.instances[0]?.resume.mockImplementationOnce(() => {
      throw new Error("resume command failed");
    });
    fireEvent.click(screen.getByRole("button", { name: "Resume game" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("resume command failed");
    expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce();
    const retry = await screen.findByRole("button", { name: "Restart game" });
    fireEvent.click(retry);
    await screen.findByText("Game ready");
    expect(factory.contexts).toHaveLength(2);
    expect(factory.liveInstances).toBe(1);
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
    expect(onLifecycleTransition).not.toHaveBeenCalledWith({
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
    expect(factory.contexts).toHaveLength(1);

    await act(async () => {
      releaseDestroy();
      await Promise.resolve();
    });

    await screen.findByText("Class demonstration ready");
    expect(factory.contexts).toHaveLength(2);
    expect(screen.getByText("Class demonstration ready")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(factory.instances[1]?.destroy).not.toHaveBeenCalled();
  });

  it("does not let delayed stale mount cleanup overwrite a replacement demo", async () => {
    let releaseCleanup: () => void = () => undefined;
    const cleanupPending = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const tutorialDestroy = vi.fn(() => cleanupPending);
    const successfulFactory = createMockGameFactory();
    let attempts = 0;
    const factory: GameFactory = async (context) => {
      attempts += 1;
      if (attempts === 1) throw new Error("tutorial renderer failed");
      return successfulFactory(context);
    };
    const cartridge = createRuntimeCartridge();
    const edition = createRuntimeEdition();
    const { rerender } = render(
      <APKGameHost
        cartridge={cartridge}
        input={learningInput}
        edition={edition}
        factory={factory}
        briefing={{ ...briefing, startPhase: "tutorial" }}
        tutorial={tutorial}
        tutorialActionDriver={{ execute: vi.fn(), destroy: tutorialDestroy }}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await waitFor(() => expect(tutorialDestroy).toHaveBeenCalledOnce());

    rerender(
      <APKGameHost
        cartridge={cartridge}
        input={[{ term: "mountain", translation: "montagne" }]}
        edition={edition}
        factory={factory}
        launchPhase="demo"
      />,
    );
    expect(successfulFactory.contexts).toHaveLength(0);

    await act(async () => {
      releaseCleanup();
      await Promise.resolve();
    });

    await screen.findByText("Class demonstration ready");
    expect(screen.getByText("Class demonstration ready")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause demonstration" })).toBeEnabled();
    expect(successfulFactory.instances[0]?.destroy).not.toHaveBeenCalled();
  });

  it("emits the tutorial playing transition only after preview cleanup and scored mount succeed", async () => {
    let releaseDestroy: () => void = () => undefined;
    const destroyPending = new Promise<void>((resolve) => {
      releaseDestroy = resolve;
    });
    const factory = createMockGameFactory();
    const onLifecycleTransition = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={{ ...briefing, startPhase: "tutorial" }}
        tutorial={tutorial}
        tutorialActionDriver={{ execute: vi.fn() }}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await screen.findByRole("button", { name: "Pause tutorial" });
    factory.instances[0]?.destroy.mockImplementation(() => destroyPending);

    fireEvent.click(screen.getByRole("button", { name: "Skip tutorial" }));
    await waitFor(() => expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce());
    expect(onLifecycleTransition).not.toHaveBeenCalledWith({
      from: "tutorial",
      event: "tutorial-skip",
      to: "playing",
    });
    expect(factory.contexts).toHaveLength(1);

    await act(async () => {
      releaseDestroy();
      await Promise.resolve();
    });
    await screen.findByText("Game ready");
    expect(factory.contexts).toHaveLength(2);
    expect(onLifecycleTransition).toHaveBeenCalledWith({
      from: "tutorial",
      event: "tutorial-skip",
      to: "playing",
    });
  });

  it("accepts tutorial mount completion only after provisional resume and transition", async () => {
    const baseFactory = createMockGameFactory();
    const onComplete = vi.fn();
    const onLifecycleTransition = vi.fn();
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
        briefing={{ ...briefing, startPhase: "tutorial" }}
        tutorial={tutorial}
        tutorialActionDriver={{ execute: vi.fn() }}
        onComplete={onComplete}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await screen.findByRole("button", { name: "Pause tutorial" });
    fireEvent.click(screen.getByRole("button", { name: "Skip tutorial" }));

    expect(await screen.findByText("Game complete")).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(validResults, "victory");
    expect(baseFactory.instances[1]?.pause).toHaveBeenCalledTimes(2);
    expect(onLifecycleTransition).toHaveBeenCalledWith({
      from: "tutorial",
      event: "tutorial-skip",
      to: "playing",
    });
  });

  it.each(["mount", "resume"] as const)(
    "keeps tutorial countdown transitions provisional when scored %s fails",
    async (failureStage) => {
      const factory = createMockGameFactory();
      const onLifecycleTransition = vi.fn();
      const failingFactory: GameFactory = async (context) => {
        if (context.sessionMode !== "playing") return factory(context);
        if (failureStage === "mount") throw new Error("scored mount failed");
        const instance = await factory(context);
        instance.resume.mockImplementation(() => {
          throw new Error("scored resume failed");
        });
        return instance;
      };
      const countdownTutorial = {
        ...tutorial,
        lifecycle: {
          ...tutorial.lifecycle,
          skip: { ...tutorial.lifecycle.skip, to: "countdown" },
        },
      } as const;
      render(
        <APKGameHost
          cartridge={createRuntimeCartridge()}
          input={learningInput}
          edition={createRuntimeEdition()}
          factory={failingFactory}
          briefing={{ ...briefing, startPhase: "tutorial" }}
          tutorial={countdownTutorial}
          tutorialActionDriver={{ execute: vi.fn() }}
          onLifecycleTransition={onLifecycleTransition}
        />,
      );

      fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
      await screen.findByRole("button", { name: "Pause tutorial" });
      fireEvent.click(screen.getByRole("button", { name: "Skip tutorial" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(`scored ${failureStage} failed`);
      expect(onLifecycleTransition).not.toHaveBeenCalledWith({
        from: "tutorial",
        event: "tutorial-skip",
        to: "countdown",
      });
      expect(onLifecycleTransition).not.toHaveBeenCalledWith({
        from: "countdown",
        event: "countdown-complete",
        to: "playing",
      });
      expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
    },
  );

  it("recovers to the briefing when tutorial preview cleanup rejects", async () => {
    const factory = createMockGameFactory();
    const onLifecycleTransition = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={{ ...briefing, startPhase: "tutorial" }}
        tutorial={tutorial}
        tutorialActionDriver={{ execute: vi.fn() }}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await screen.findByRole("button", { name: "Pause tutorial" });
    factory.instances[0]?.destroy.mockRejectedValue(new Error("tutorial preview cleanup failed"));

    fireEvent.click(screen.getByRole("button", { name: "Skip tutorial" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("tutorial preview cleanup failed");
    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
    expect(onLifecycleTransition).not.toHaveBeenCalledWith({
      from: "tutorial",
      event: "tutorial-skip",
      to: "playing",
    });
    expect(factory.contexts).toHaveLength(1);
  });

  it("attempts controller and renderer cleanup when both tutorial cleanups reject", async () => {
    const factory = createMockGameFactory();
    const controllerError = new Error("tutorial controller cleanup failed");
    const rendererError = new Error("tutorial renderer cleanup failed");
    const tutorialActionDriver = {
      execute: vi.fn(),
      destroy: vi.fn(() => {
        throw controllerError;
      }),
    };
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={{ ...briefing, startPhase: "tutorial" }}
        tutorial={tutorial}
        tutorialActionDriver={tutorialActionDriver}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await screen.findByRole("button", { name: "Replay tutorial" });
    factory.instances[0]?.destroy.mockRejectedValue(rendererError);
    fireEvent.click(screen.getByRole("button", { name: "Replay tutorial" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(controllerError.message);
    expect(tutorialActionDriver.destroy).toHaveBeenCalledOnce();
    expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Begin quest" })).toBeEnabled();
  });

  it("ignores an overlapping tutorial terminal callback after the first invalidates the preview", async () => {
    const factory = createMockGameFactory();
    let releaseDestroy: () => void = () => undefined;
    const destroyPending = new Promise<void>((resolve) => {
      releaseDestroy = resolve;
    });
    const tutorialActionDriver = {
      execute: vi.fn(),
      destroy: vi.fn(() => destroyPending),
    };
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={{ ...briefing, startPhase: "tutorial" }}
        tutorial={tutorial}
        tutorialActionDriver={tutorialActionDriver}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await screen.findByRole("button", { name: "Skip tutorial" });
    fireEvent.click(screen.getByRole("button", { name: "Skip tutorial" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip tutorial" }));

    await waitFor(() => expect(tutorialActionDriver.destroy).toHaveBeenCalledOnce());
    await act(async () => {
      releaseDestroy();
      await Promise.resolve();
    });

    await screen.findByText("Game ready");
    expect(factory.contexts).toHaveLength(2);
    expect(factory.instances[1]?.destroy).not.toHaveBeenCalled();
  });

  it("tears down tutorial playback when its host dependencies change", async () => {
    const factory = createMockGameFactory();
    const cartridge = createRuntimeCartridge();
    const edition = createRuntimeEdition();
    const tutorialBriefing = { ...briefing, startPhase: "tutorial" } as const;
    const firstDriver = { execute: vi.fn() };
    const secondDriver = { execute: vi.fn() };
    const { rerender } = render(
      <APKGameHost
        cartridge={cartridge}
        input={learningInput}
        edition={edition}
        factory={factory}
        briefing={tutorialBriefing}
        tutorial={tutorial}
        tutorialActionDriver={firstDriver}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await screen.findByRole("button", { name: "Pause tutorial" });
    rerender(
      <APKGameHost
        cartridge={cartridge}
        input={learningInput}
        edition={edition}
        factory={factory}
        briefing={tutorialBriefing}
        tutorial={tutorial}
        tutorialActionDriver={secondDriver}
      />,
    );

    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
    expect(factory.instances[0]?.destroy).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Pause tutorial" })).not.toBeInTheDocument();
  });

  it("does not let replay continue on a detached mount after a prop replacement", async () => {
    let releaseCleanup: () => void = () => undefined;
    const cleanupPending = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const tutorialDestroy = vi.fn(() => cleanupPending);
    const factory = createMockGameFactory();
    const cartridge = createRuntimeCartridge();
    const edition = createRuntimeEdition();
    const { rerender } = render(
      <APKGameHost
        cartridge={cartridge}
        input={learningInput}
        edition={edition}
        factory={factory}
        briefing={{ ...briefing, startPhase: "tutorial" }}
        tutorial={tutorial}
        tutorialActionDriver={{ execute: vi.fn(), destroy: tutorialDestroy }}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await screen.findByRole("button", { name: "Pause tutorial" });
    fireEvent.click(screen.getByRole("button", { name: "Replay tutorial" }));
    await waitFor(() => expect(tutorialDestroy).toHaveBeenCalledOnce());

    rerender(
      <APKGameHost
        cartridge={cartridge}
        input={[{ term: "mountain", translation: "montagne" }]}
        edition={edition}
        factory={factory}
        launchPhase="demo"
      />,
    );
    expect(factory.contexts).toHaveLength(1);

    await act(async () => {
      releaseCleanup();
      await Promise.resolve();
    });

    await screen.findByText("Class demonstration ready");
    expect(screen.getByText("Class demonstration ready")).toBeInTheDocument();
    expect(factory.contexts).toHaveLength(2);
    expect(factory.contexts[1]?.sessionMode).toBe("demo");
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
    factory.instances[0]?.destroy.mockImplementationOnce(() => destroyPending);
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
    expect(factory.contexts).toHaveLength(1);

    await act(async () => {
      rejectDestroy(new Error("stale teardown failed"));
      await Promise.resolve();
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("stale teardown failed");
    fireEvent.click(screen.getByRole("button", { name: "Return to briefing" }));
    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
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
    expect(factory.instances[1]?.resume).toHaveBeenCalledOnce();
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
    const onLifecycleTransition = vi.fn();
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
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Demonstrate for class" }));
    await screen.findByText("Class demonstration ready");
    fireEvent.click(screen.getByRole("button", { name: "Advance demonstration" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("scored pause failed");
    expect(pause).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
    expect(onLifecycleTransition).not.toHaveBeenCalledWith({
      from: "demo",
      event: "demo-complete",
      to: "countdown",
    });
    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
  });

  it("suppresses completion when scored resume emits complete before throwing", async () => {
    const demoFactory = createMockGameFactory();
    const onComplete = vi.fn();
    const onLifecycleTransition = vi.fn();
    const destroy = vi.fn();
    const factory: GameFactory = async (context) => {
      if (context.sessionMode === "demo") return demoFactory(context);
      return {
        pause: vi.fn(),
        resume: vi.fn(() => {
          context.complete(validResults, "victory");
          throw new Error("scored resume failed");
        }),
        destroy,
      };
    };
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
    await screen.findByText("Class demonstration ready");
    fireEvent.click(screen.getByRole("button", { name: "Advance demonstration" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("scored resume failed");
    expect(destroy).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.queryByText("Game complete")).not.toBeInTheDocument();
    expect(onLifecycleTransition).not.toHaveBeenCalledWith({
      from: "countdown",
      event: "countdown-complete",
      to: "playing",
    });
    expect(await screen.findByRole("button", { name: "Begin quest" })).toBeEnabled();
  });

  it("accepts completion emitted during the scored mount after demo activation", async () => {
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

    expect(await screen.findByText("Game complete")).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(validResults, "victory");
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

  it("advances a class demonstration to countdown then playing and mounts authoritative gameplay", async () => {
    const factory = createMockGameFactory();
    const onLifecycleTransition = vi.fn((transition) => {
      if (transition.to === "countdown") {
        expect(factory.contexts).toHaveLength(2);
      }
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

  it("serializes a pending Skip before Advance so Skip keeps terminal authority", async () => {
    const factory = createMockGameFactory();
    const callbacks: Array<() => void | Promise<void>> = [];
    let releaseDestroy: () => void = () => undefined;
    const destroyPending = new Promise<void>((resolve) => {
      releaseDestroy = resolve;
    });
    const tutorialClock = {
      now: vi.fn(() => 0),
      setTimeout: vi.fn((callback: () => void | Promise<void>) => {
        callbacks.push(callback);
        return callbacks.length;
      }),
      clearTimeout: vi.fn(),
    };
    const tutorialActionDriver = {
      execute: vi.fn(),
      destroy: vi.fn(() => destroyPending),
    };
    const onLifecycleTransition = vi.fn();
    render(
      <APKGameHost
        cartridge={createRuntimeCartridge()}
        input={learningInput}
        edition={createRuntimeEdition()}
        factory={factory}
        briefing={{ ...briefing, startPhase: "tutorial" }}
        tutorial={tutorial}
        tutorialActionDriver={tutorialActionDriver}
        tutorialClock={tutorialClock}
        onLifecycleTransition={onLifecycleTransition}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Begin quest" }));
    await screen.findByRole("button", { name: "Next tutorial step" });
    await act(async () => {
      await callbacks.shift()?.();
      await callbacks.shift()?.();
    });
    await screen.findByRole("button", { name: "Next tutorial step" });

    fireEvent.click(screen.getByRole("button", { name: "Skip tutorial" }));
    fireEvent.click(screen.getByRole("button", { name: "Next tutorial step" }));
    await waitFor(() => expect(tutorialActionDriver.destroy).toHaveBeenCalledOnce());
    expect(factory.contexts).toHaveLength(1);
    expect(onLifecycleTransition).not.toHaveBeenCalledWith(expect.objectContaining({ to: "playing" }));

    await act(async () => {
      releaseDestroy();
      await Promise.resolve();
    });
    await screen.findByText("Game ready");
    expect(factory.contexts).toHaveLength(2);
    expect(onLifecycleTransition).toHaveBeenCalledWith({
      from: "tutorial",
      event: "tutorial-skip",
      to: "playing",
    });
    expect(onLifecycleTransition).not.toHaveBeenCalledWith({
      from: "tutorial",
      event: "tutorial-complete",
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
