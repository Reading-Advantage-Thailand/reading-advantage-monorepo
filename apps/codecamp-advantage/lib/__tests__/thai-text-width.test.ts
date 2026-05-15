import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Thai text-width regression prevention", () => {
  const appDir = path.resolve(__dirname, "../../app/[locale]");
  const componentsDir = path.resolve(__dirname, "../../components");

  describe("dashboard page (page.tsx)", () => {
    const content = fs.readFileSync(path.join(appDir, "page.tsx"), "utf-8");

    it("applies line-clamp-2 on module card title", () => {
      expect(content).toContain("line-clamp-2");
    });

    it("applies line-clamp-3 on module card description", () => {
      expect(content).toContain("line-clamp-3");
    });

    it("applies break-words on phase title", () => {
      expect(content).toContain("break-words");
    });

    it("applies flex-wrap on stats card", () => {
      expect(content).toContain("flex-wrap");
    });

    it("applies justify-center on stats card for proper centering when wrapped", () => {
      expect(content).toContain("justify-center");
    });
  });

  describe("admin page (admin/page.tsx)", () => {
    const content = fs.readFileSync(
      path.join(appDir, "admin/page.tsx"),
      "utf-8",
    );

    it("applies whitespace-nowrap on all table header cells", () => {
      const thMatches = content.match(/<th\s/g);
      const whitespaceMatches = content.match(/whitespace-nowrap/g);
      expect(whitespaceMatches?.length).toBe(thMatches?.length ?? 0);
    });
  });

  describe("header component (header.tsx)", () => {
    const content = fs.readFileSync(
      path.join(componentsDir, "header.tsx"),
      "utf-8",
    );

    it("applies min-w-0 on the left header container", () => {
      expect(content).toContain("min-w-0");
    });

    it("applies shrink-0 on navigation links to prevent overflow", () => {
      expect(content).toContain("shrink-0");
    });
  });
});
