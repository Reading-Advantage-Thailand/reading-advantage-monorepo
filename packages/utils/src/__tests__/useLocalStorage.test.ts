import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "../hooks/useLocalStorage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  it("returns initial value when localStorage is empty", () => {
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    expect(result.current[0]).toBe("default");
  });

  it("reads existing value from localStorage", () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    expect(result.current[0]).toBe("stored");
  });

  it("updates localStorage when value changes", () => {
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    act(() => {
      result.current[1]("updated");
    });
    expect(localStorage.setItem).toHaveBeenCalledWith("key", JSON.stringify("updated"));
  });

  it("supports functional updates", () => {
    const { result } = renderHook(() => useLocalStorage("count", 0));
    act(() => {
      result.current[1]((prev: number) => prev + 1);
    });
    expect(localStorage.setItem).toHaveBeenCalledWith("count", JSON.stringify(1));
  });

  it("removes value from localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    act(() => {
      result.current[2]();
    });
    expect(localStorage.removeItem).toHaveBeenCalledWith("key");
  });
});
