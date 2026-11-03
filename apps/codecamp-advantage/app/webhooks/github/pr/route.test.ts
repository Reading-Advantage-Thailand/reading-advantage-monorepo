// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("@reading-advantage/webhooks/github", () => ({ default: { fetch: mocks.fetch } }));

import { POST, dynamic, runtime } from "./route";

describe("POST /webhooks/github/pr", () => {
  beforeEach(() => {
    mocks.fetch.mockReset();
    mocks.fetch.mockResolvedValue(new Response("accepted", { status: 202 }));
  });

  it("runs on the dynamic Node runtime so the raw signed body reaches the handler", () => {
    expect(runtime).toBe("nodejs");
    expect(dynamic).toBe("force-dynamic");
  });

  it("forwards the raw body, signature headers, and method to the /pr webhook handler", async () => {
    const body = JSON.stringify({ action: "opened", number: 7 });
    const response = await POST(new Request("https://codecamp.example/webhooks/github/pr?delivery=1", {
      method: "POST",
      body,
      headers: { "x-hub-signature-256": "sha256=abc", "x-github-event": "pull_request", "content-type": "application/json" },
    }));

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const forwarded = mocks.fetch.mock.calls[0][0] as Request;
    const url = new URL(forwarded.url);
    expect(url.pathname).toBe("/pr");
    expect(url.host).toBe("codecamp.example");
    expect(url.search).toBe("?delivery=1");
    expect(forwarded.method).toBe("POST");
    expect(forwarded.headers.get("x-hub-signature-256")).toBe("sha256=abc");
    expect(forwarded.headers.get("x-github-event")).toBe("pull_request");
    await expect(forwarded.text()).resolves.toBe(body);
    expect(response.status).toBe(202);
    await expect(response.text()).resolves.toBe("accepted");
  });

  it("keeps the body byte-exact so the HMAC signature still verifies", async () => {
    const bytes = new Uint8Array([0x7b, 0x22, 0x61, 0x22, 0x3a, 0x20, 0x22, 0xe0, 0xb8, 0x81, 0x22, 0x7d]);
    await POST(new Request("https://codecamp.example/webhooks/github/pr", { method: "POST", body: bytes }));

    const forwarded = mocks.fetch.mock.calls[0][0] as Request;
    expect(new Uint8Array(await forwarded.arrayBuffer())).toEqual(bytes);
  });

  it("returns the handler error response unchanged", async () => {
    mocks.fetch.mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    const response = await POST(new Request("https://codecamp.example/webhooks/github/pr", { method: "POST", body: "{}" }));

    expect(response.status).toBe(401);
  });
});
