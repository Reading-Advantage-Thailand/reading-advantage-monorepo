import { describe, expect, it, vi } from "vitest";
import { createInputController } from "./input.js";

describe("createInputController", () => {
  it("normalizes keyboard and pointer input and removes listeners", () => {
    const surface = document.createElement("div");
    const controller = createInputController(surface);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowLeft" }));
    surface.dispatchEvent(new PointerEvent("pointerdown", {
      pointerId: 3,
      pointerType: "touch",
      clientX: 10,
      clientY: 20,
    }));
    expect(controller.snapshot()).toMatchObject({
      keys: ["ArrowLeft"],
      pressed: ["ArrowLeft"],
      pointer: {
        down: true,
        cancelled: false,
        id: 3,
        kind: "touch",
        startX: 10,
        startY: 20,
        x: 10,
        y: 20,
      },
    });
    expect(surface.style.touchAction).toBe("none");

    controller.destroy();
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowLeft" }));
    expect(controller.snapshot().destroyed).toBe(true);
    expect(surface.style.touchAction).toBe("");
  });

  it("queues a short key tap until a cartridge consumes the next snapshot", () => {
    const surface = document.createElement("div");
    const controller = createInputController(surface);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));

    expect(controller.snapshot()).toMatchObject({ keys: [], pressed: ["Space"] });
    expect(controller.snapshot()).toMatchObject({ keys: [], pressed: [] });
    controller.destroy();
  });

  it("retains pointer kind and origin through release for gesture resolution", () => {
    const surface = document.createElement("div");
    const controller = createInputController(surface);
    surface.dispatchEvent(new PointerEvent("pointerdown", {
      pointerId: 7,
      pointerType: "touch",
      clientX: 240,
      clientY: 300,
    }));
    surface.dispatchEvent(new PointerEvent("pointermove", {
      pointerId: 7,
      pointerType: "touch",
      clientX: 80,
      clientY: 305,
    }));
    surface.dispatchEvent(new PointerEvent("pointerup", {
      pointerId: 7,
      pointerType: "touch",
      clientX: 70,
      clientY: 305,
    }));

    expect(controller.snapshot().pointer).toEqual({
      down: false,
      released: true,
      cancelled: false,
      id: null,
      kind: "touch",
      startX: 240,
      startY: 300,
      x: 70,
      y: 305,
    });
    controller.destroy();
  });

  it("queues a short pointer release once and suppresses canceled gestures", () => {
    const surface = document.createElement("div");
    const controller = createInputController(surface);
    surface.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 4, pointerType: "touch", clientX: 40, clientY: 50 }));
    surface.dispatchEvent(new PointerEvent("pointerup", { pointerId: 4, pointerType: "touch", clientX: 42, clientY: 52 }));
    expect(controller.snapshot().pointer).toMatchObject({ down: false, released: true, cancelled: false });
    expect(controller.snapshot().pointer.released).toBe(false);

    surface.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 5, pointerType: "touch", clientX: 60, clientY: 70 }));
    surface.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 5, pointerType: "touch", clientX: 62, clientY: 72 }));
    expect(controller.snapshot().pointer).toMatchObject({ down: false, released: false, cancelled: true });
    controller.destroy();
  });

  it("prevents gameplay scroll keys without blocking unrelated keyboard defaults", () => {
    const surface = document.createElement("div");
    const controller = createInputController(surface);
    const arrow = new KeyboardEvent("keydown", {
      code: "ArrowDown",
      cancelable: true,
    });
    const space = new KeyboardEvent("keydown", { code: "Space", cancelable: true });
    const tab = new KeyboardEvent("keydown", { code: "Tab", cancelable: true });

    window.dispatchEvent(arrow);
    window.dispatchEvent(space);
    window.dispatchEvent(tab);
    expect(arrow.defaultPrevented).toBe(true);
    expect(space.defaultPrevented).toBe(true);
    expect(tab.defaultPrevented).toBe(false);
    controller.destroy();
  });

  it("distinguishes a canceled touch gesture from a completed release", () => {
    const surface = document.createElement("div");
    const controller = createInputController(surface);
    surface.dispatchEvent(new PointerEvent("pointerdown", {
      pointerId: 9,
      pointerType: "touch",
      clientX: 200,
      clientY: 300,
    }));
    surface.dispatchEvent(new PointerEvent("pointercancel", {
      pointerId: 9,
      pointerType: "touch",
      clientX: 80,
      clientY: 300,
    }));

    expect(controller.snapshot().pointer).toMatchObject({
      down: false,
      cancelled: true,
      kind: "touch",
      startX: 200,
      x: 80,
    });
    controller.destroy();
  });

  it("prevents browser context menus inside the play surface", () => {
    const surface = document.createElement("div");
    const controller = createInputController(surface);
    const event = new Event("contextmenu", { cancelable: true });
    const preventDefault = vi.spyOn(event, "preventDefault");
    surface.dispatchEvent(event);
    expect(preventDefault).toHaveBeenCalledOnce();
    controller.destroy();
  });
});
