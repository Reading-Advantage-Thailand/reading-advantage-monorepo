import { afterEach, describe, expect, it, vi } from "vitest";

import { logger } from "../logger";

describe("Primary structured logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes one JSON line per event, with an Error as its name, message, and stack", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("apk_practice_failed", { error: new Error("down"), count: 2 });

    const line = JSON.parse(String(error.mock.calls[0]?.[0]));
    expect(line).toMatchObject({ event: "apk_practice_failed", level: "error", count: 2, error: { name: "Error", message: "down" } });
    expect(typeof line.timestamp).toBe("string");
    expect(line.error.stack).toContain("down");
  });

  it("sends info and warn events to their console methods and keeps the event of an entry that cannot be serialized", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    logger.info("started");
    logger.warn("loop", { circular });

    expect(JSON.parse(String(info.mock.calls[0]?.[0]))).toMatchObject({ event: "started", level: "info" });
    expect(JSON.parse(String(warn.mock.calls[0]?.[0]))).toMatchObject({ event: "loop", level: "warn", serializationError: expect.any(String) });
  });
});
