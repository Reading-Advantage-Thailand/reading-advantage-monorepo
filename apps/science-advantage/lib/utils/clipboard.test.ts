import { afterEach, describe, expect, it, vi } from "vitest";

import { copyToClipboard } from "./clipboard";

describe("copyToClipboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses navigator.clipboard when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } } as unknown as Navigator);

    const result = await copyToClipboard("ABC123");

    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith("ABC123");
  });

  it("returns false if navigator clipboard throws", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard disabled"));
    vi.stubGlobal("navigator", { clipboard: { writeText } } as unknown as Navigator);

    const result = await copyToClipboard("XYZ789");

    expect(result).toBe(false);
  });

  it("returns false when clipboard is unavailable in non-DOM environment", async () => {
    vi.stubGlobal("navigator", {} as unknown as Navigator);

    const result = await copyToClipboard("HELLO");

    expect(result).toBe(false);
  });
});
