import { describe, expect, it, vi } from "vitest";
import { createInputController } from "./input.js";

describe("createInputController", () => {
  it("normalizes keyboard and pointer input and removes listeners", () => {
    const surface = document.createElement("div");
    const controller = createInputController(surface);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowLeft" }));
    surface.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 3, clientX: 10, clientY: 20 }));
    expect(controller.snapshot()).toMatchObject({
      keys: ["ArrowLeft"],
      pointer: { down: true, id: 3, x: 10, y: 20 },
    });
    expect(surface.style.touchAction).toBe("none");

    controller.destroy();
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowLeft" }));
    expect(controller.snapshot().destroyed).toBe(true);
    expect(surface.style.touchAction).toBe("");
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
