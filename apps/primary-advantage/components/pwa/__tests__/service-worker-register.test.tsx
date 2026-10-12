// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SERVICE_WORKER_SCOPE, SERVICE_WORKER_URL } from "@/lib/pwa/constants";
import { ServiceWorkerRegister } from "../service-worker-register";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("ServiceWorkerRegister", () => {
  it("registers the worker URL with scope / and type module once", () => {
    const register = vi.fn(() => Promise.resolve({}));
    Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });
    const { rerender } = render(<ServiceWorkerRegister />);
    rerender(<ServiceWorkerRegister />);
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(SERVICE_WORKER_URL, { scope: SERVICE_WORKER_SCOPE, type: "module" });
  });

  it("does nothing when navigator.serviceWorker is missing", () => {
    expect("serviceWorker" in navigator).toBe(false);
    expect(() => render(<ServiceWorkerRegister />)).not.toThrow();
  });

  it("does not throw when the registration fails", async () => {
    const register = vi.fn(() => Promise.reject(new Error("blocked")));
    Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });
    expect(() => render(<ServiceWorkerRegister />)).not.toThrow();
    await Promise.resolve();
  });
});
