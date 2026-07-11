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
      pointer: {
        down: true,
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
      id: null,
      kind: "touch",
      startX: 240,
      startY: 300,
      x: 70,
      y: 305,
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
