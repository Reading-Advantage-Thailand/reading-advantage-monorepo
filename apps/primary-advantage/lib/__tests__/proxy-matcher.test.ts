import { describe, expect, it } from "vitest";
import { config } from "../../proxy";

const matcher = new RegExp(`^${config.matcher[0]}$`);

describe("proxy matcher for PWA files", () => {
  it.each([
    "/serwist/sw.js",
    "/manifest.webmanifest",
    "/icons/primary-advantage-192.png",
    "/icons/primary-advantage-512-maskable.png",
    "/offline.html",
  ])("skips %s", (pathname) => {
    expect(matcher.test(pathname)).toBe(false);
  });

  it.each(["/serwist/sw", "/manifest", "/icons/primary-advantage-192", "/offline"])(
    "still matches the dotless path %s",
    (pathname) => {
      expect(matcher.test(pathname)).toBe(true);
    },
  );
});
