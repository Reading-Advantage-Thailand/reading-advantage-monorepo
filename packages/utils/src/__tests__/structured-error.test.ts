import { describe, expect, it, vi } from "vitest";

import { logStructuredError } from "../structured-error.js";

describe("logStructuredError", () => {
  it("writes one structured JSON error with stable context", () => {
    const write = vi.fn();

    logStructuredError(
      {
        event: "sales_oidc_callback_failed",
        requestId: "request-123",
        error: new TypeError("private token value"),
        fields: { method: "GET", route: "/api/auth/callback" },
      },
      write,
    );

    expect(write).toHaveBeenCalledOnce();
    expect(JSON.parse(write.mock.calls[0]![0])).toEqual({
      level: "error",
      event: "sales_oidc_callback_failed",
      requestId: "request-123",
      errorName: "TypeError",
      method: "GET",
      route: "/api/auth/callback",
    });
  });

  it("redacts error messages and stacks", () => {
    const write = vi.fn();
    const error = new Error("password=secret");

    logStructuredError({ event: "login_failed", error }, write);

    const output = write.mock.calls[0]![0];
    expect(output).not.toContain("password=secret");
    expect(output).not.toContain("stack");
    expect(JSON.parse(output)).toEqual({
      level: "error",
      event: "login_failed",
      errorName: "Error",
    });
  });

  it("uses UnknownError for thrown non-Error values", () => {
    const write = vi.fn();

    logStructuredError({ event: "logout_failed", error: "secret" }, write);

    expect(JSON.parse(write.mock.calls[0]![0])).toEqual({
      level: "error",
      event: "logout_failed",
      errorName: "UnknownError",
    });
  });

  it("prevents context fields from replacing protected fields", () => {
    const write = vi.fn();

    logStructuredError({
      event: "expected_event",
      error: new Error("hidden"),
      fields: { level: "info", event: "wrong_event", errorName: "WrongError" },
    }, write);

    expect(JSON.parse(write.mock.calls[0]![0])).toMatchObject({
      level: "error",
      event: "expected_event",
      errorName: "Error",
    });
  });
});
