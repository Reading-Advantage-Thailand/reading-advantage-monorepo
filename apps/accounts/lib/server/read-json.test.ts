import { describe, expect, it } from "vitest";

import { readJson } from "./read-json";

describe("readJson", () => {
  it("returns parsed JSON for a JSON response", async () => {
    const response = new Response(JSON.stringify({ message: "ok" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    await expect(readJson(response)).resolves.toEqual({ message: "ok" });
  });

  it("returns undefined when the response body is not valid JSON", async () => {
    const response = new Response("<html>failure</html>", {
      status: 500,
      headers: { "content-type": "text/html" },
    });

    await expect(readJson(response)).resolves.toBeUndefined();
  });

  it("returns undefined when the response body is empty", async () => {
    const response = new Response(null, { status: 500 });

    await expect(readJson(response)).resolves.toBeUndefined();
  });
});