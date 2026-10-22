// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import middleware from "../proxy";

/** Builds a request as the Cloud Run container sees it: bound on 0.0.0.0:8080. */
function containerRequest(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://0.0.0.0:8080${path}`, { headers });
}

const publicHeaders = {
  host: "www.reading-advantage.com",
  "x-forwarded-proto": "https",
};

describe("www proxy locale redirect", () => {
  it("redirects the bare domain to the public /en URL", () => {
    const response = middleware(containerRequest("/", publicHeaders));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://www.reading-advantage.com/en");
  });

  it("prefers x-forwarded-host over host", () => {
    const response = middleware(
      containerRequest("/", { ...publicHeaders, "x-forwarded-host": "reading-advantage.com" }),
    );
    expect(response.headers.get("location")).toBe("https://reading-advantage.com/en");
  });

  it("keeps the query string on the redirect", () => {
    const response = middleware(containerRequest("/?ref=qr", publicHeaders));
    expect(response.headers.get("location")).toBe("https://www.reading-advantage.com/en?ref=qr");
  });

  it("leaves the location alone when no host header is present", () => {
    const response = middleware(containerRequest("/"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://0.0.0.0:8080/en");
  });

  it("serves a prefixed locale path without a redirect", () => {
    const response = middleware(containerRequest("/th", publicHeaders));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
