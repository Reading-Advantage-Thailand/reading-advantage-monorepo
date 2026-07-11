import type { APKInputSnapshot } from "@reading-advantage/advantage-play-kit";
import { describe, expect, it } from "vitest";

import { resolveTraversalActions, type TraversalInputBindings } from "./input";

const bounds = { left: 10, top: 20, width: 300, height: 600 } as const;
const bindings: TraversalInputBindings = {
  keyboard: {
    left: ["ArrowLeft", "KeyA"],
    center: ["ArrowDown", "KeyS"],
    right: ["ArrowRight", "KeyD"],
  },
  regions: [
    { action: "left", minimumX: 0, maximumX: 1 / 3, minimumY: 0, maximumY: 1 },
    { action: "center", minimumX: 1 / 3, maximumX: 2 / 3, minimumY: 0, maximumY: 1 },
    { action: "right", minimumX: 2 / 3, maximumX: 1, minimumY: 0, maximumY: 1 },
  ],
  swipe: { threshold: 60, left: "left", right: "right" },
};

function snapshot(
  keys: readonly string[] = [],
  pointer: Partial<APKInputSnapshot["pointer"]> = {},
): APKInputSnapshot {
  return {
    keys,
    destroyed: false,
    pointer: {
      down: false,
      id: null,
      kind: null,
      startX: 0,
      startY: 0,
      x: 0,
      y: 0,
      ...pointer,
    },
  };
}

describe("resolveTraversalActions", () => {
  it("emits keyboard actions only on a new key edge", () => {
    const idle = snapshot();
    const left = snapshot(["ArrowLeft"]);
    expect(resolveTraversalActions(idle, left, bindings, bounds)).toEqual(["left"]);
    expect(resolveTraversalActions(left, left, bindings, bounds)).toEqual([]);
  });

  it.each(["mouse", "touch"] as const)(
    "maps a %s press through normalized pointer regions",
    (kind) => {
      const pressed = snapshot([], {
        down: true,
        id: 4,
        kind,
        startX: 270,
        startY: 200,
        x: 270,
        y: 200,
      });
      expect(resolveTraversalActions(snapshot(), pressed, bindings, bounds)).toEqual([
        "right",
      ]);
      expect(resolveTraversalActions(pressed, pressed, bindings, bounds)).toEqual([]);
    },
  );

  it("maps a completed touch swipe but ignores the same mouse gesture", () => {
    const started = snapshot([], {
      down: true,
      id: 8,
      kind: "touch",
      startX: 260,
      startY: 300,
      x: 260,
      y: 300,
    });
    const released = snapshot([], {
      kind: "touch",
      startX: 260,
      startY: 300,
      x: 100,
      y: 310,
    });
    expect(resolveTraversalActions(started, released, bindings, bounds)).toEqual([
      "left",
    ]);
    expect(
      resolveTraversalActions(
        { ...started, pointer: { ...started.pointer, kind: "mouse" } },
        { ...released, pointer: { ...released.pointer, kind: "mouse" } },
        bindings,
        bounds,
      ),
    ).toEqual([]);
  });
});
