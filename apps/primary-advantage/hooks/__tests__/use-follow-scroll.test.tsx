// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFollowScroll } from "../use-follow-scroll";

const VIEWPORT = 800;
let scrollTo: ReturnType<typeof vi.fn>;

/** An element ref whose top edge is `top` px below the viewport top. */
function target(top: number) {
  const el = document.createElement("span");
  el.getBoundingClientRect = () => ({ top, bottom: top + 24, height: 24 }) as DOMRect;
  return { current: el };
}

beforeEach(() => {
  scrollTo = vi.fn();
  vi.stubGlobal("scrollTo", scrollTo);
  Object.defineProperty(window, "innerHeight", { value: VIEWPORT, configurable: true });
  Object.defineProperty(window, "scrollY", { value: 100, configurable: true });
});
afterEach(() => vi.unstubAllGlobals());

describe("useFollowScroll", () => {
  it("scrolls so that the sentence sits at about 30 percent of the viewport", () => {
    renderHook(() => useFollowScroll({ targetRef: target(900), enabled: true, sentenceIndex: 3 }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 900 + 100 - VIEWPORT * 0.3, behavior: "smooth" });
  });

  it("does not scroll when the sentence is already in the upper part", () => {
    renderHook(() => useFollowScroll({ targetRef: target(250), enabled: true, sentenceIndex: 3 }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("does not scroll when the audio is not playing", () => {
    renderHook(() => useFollowScroll({ targetRef: target(900), enabled: false, sentenceIndex: 3 }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("stops after a scroll by hand and starts again at the next play", () => {
    const ref = target(900);
    const { rerender } = renderHook(
      (p: { enabled: boolean; sentenceIndex: number }) => useFollowScroll({ targetRef: ref, ...p }),
      { initialProps: { enabled: true, sentenceIndex: 1 } },
    );
    scrollTo.mockClear();
    act(() => void window.dispatchEvent(new Event("wheel")));
    rerender({ enabled: true, sentenceIndex: 2 });
    expect(scrollTo).not.toHaveBeenCalled();
    rerender({ enabled: false, sentenceIndex: 2 });
    rerender({ enabled: true, sentenceIndex: 3 });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("treats a touch move as a scroll by hand, and resume() as a new start", () => {
    const { result, rerender } = renderHook(
      (p: { sentenceIndex: number }) => useFollowScroll({ targetRef: target(900), enabled: true, ...p }),
      { initialProps: { sentenceIndex: 1 } },
    );
    scrollTo.mockClear();
    act(() => void window.dispatchEvent(new Event("touchmove")));
    rerender({ sentenceIndex: 2 });
    expect(scrollTo).not.toHaveBeenCalled();
    act(() => result.current.resume());
    rerender({ sentenceIndex: 3 });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("starts again at the next play after a scroll by hand while paused", () => {
    const ref = target(900);
    const { rerender } = renderHook(
      (p: { enabled: boolean; sentenceIndex: number }) => useFollowScroll({ targetRef: ref, ...p }),
      { initialProps: { enabled: false, sentenceIndex: 1 } },
    );
    act(() => void window.dispatchEvent(new Event("wheel")));
    rerender({ enabled: true, sentenceIndex: 1 });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("ignores a key press on a button", () => {
    const ref = target(900);
    const { rerender } = renderHook(
      (p: { sentenceIndex: number }) => useFollowScroll({ targetRef: ref, enabled: true, ...p }),
      { initialProps: { sentenceIndex: 1 } },
    );
    scrollTo.mockClear();
    const button = document.createElement("button");
    document.body.appendChild(button);
    act(() => void button.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })));
    rerender({ sentenceIndex: 2 });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    button.remove();
  });

  it("stops when the scroll bar is pressed", () => {
    Object.defineProperty(window, "innerWidth", { value: 1015, configurable: true });
    Object.defineProperty(document.documentElement, "clientWidth", { value: 1000, configurable: true });
    const ref = target(900);
    const { rerender } = renderHook(
      (p: { sentenceIndex: number }) => useFollowScroll({ targetRef: ref, enabled: true, ...p }),
      { initialProps: { sentenceIndex: 1 } },
    );
    scrollTo.mockClear();
    act(() => void window.dispatchEvent(new MouseEvent("pointerdown", { clientX: 1008 })));
    rerender({ sentenceIndex: 2 });
    expect(scrollTo).not.toHaveBeenCalled();
    act(() => void window.dispatchEvent(new MouseEvent("pointerdown", { clientX: 200 })));
  });

  it("stops when the student selects text", () => {
    const ref = target(900);
    const { rerender } = renderHook(
      (p: { sentenceIndex: number }) => useFollowScroll({ targetRef: ref, enabled: true, ...p }),
      { initialProps: { sentenceIndex: 1 } },
    );
    scrollTo.mockClear();
    vi.spyOn(window, "getSelection").mockReturnValue({ isCollapsed: false } as Selection);
    act(() => void document.dispatchEvent(new Event("selectionchange")));
    rerender({ sentenceIndex: 2 });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("removes its listeners on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useFollowScroll({ targetRef: target(900), enabled: true, sentenceIndex: 1 }));
    unmount();
    expect(remove.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(["wheel", "touchmove", "keydown"]));
  });
});
