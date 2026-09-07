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

  it("applies sequential functional updates to the latest value", () => {
    const { result } = renderHook(() => useLocalStorage("count", 0));
    act(() => {
      result.current[1]((prev: number) => prev + 1);
      result.current[1]((prev: number) => prev + 1);
    });

    expect(result.current[0]).toBe(2);
    expect(localStorage.setItem).toHaveBeenLastCalledWith("count", JSON.stringify(2));
  });

  it("removes value from localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    act(() => {
      result.current[2]();
    });
    expect(localStorage.removeItem).toHaveBeenCalledWith("key");
  });

  it("resets when another tab removes the key", () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage("key", "default"));

    act(() => window.dispatchEvent(new StorageEvent("storage", { key: "key", newValue: null })));

    expect(result.current[0]).toBe("default");
  });

  it("resets when another tab clears storage", () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage("key", "default"));

    act(() => window.dispatchEvent(new StorageEvent("storage", { key: null, newValue: null })));

    expect(result.current[0]).toBe("default");
  });

  it("ignores sessionStorage clear events", () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage("key", "default"));

    act(() => window.dispatchEvent(new StorageEvent("storage", { key: null, newValue: null, storageArea: sessionStorage })));

    expect(result.current[0]).toBe("stored");
  });
});
