import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = resolve(import.meta.dirname, "..");

const ROUTE_LAYOUTS = [
  ["login/layout.tsx", "metadata.loginTitle"],
  ["settings/layout.tsx", "metadata.settingsTitle"],
  ["campaigns/layout.tsx", "metadata.campaignsTitle"],
  ["campaigns/[id]/layout.tsx", "metadata.campaignDetailTitle"],
  ["campaigns/[id]/video/layout.tsx", "metadata.videoTitle"],
] as const;

describe("Marketing per-page metadata", () => {
  it.each(ROUTE_LAYOUTS)(
    "%s exports localized page metadata",
    (relativePath, titleKey) => {
      const source = readFileSync(resolve(APP_ROOT, relativePath), "utf8");
      expect(source).toMatch(/export\s+const\s+metadata:\s*Metadata/);
      expect(source).toMatch(new RegExp(`title:\\s*t\\("${titleKey}"\\)`));
      expect(source).not.toMatch(/"use client"/);
    },
  );

  it("declares every page metadata title in the shared dictionary", async () => {
    const { getMarketingMessage } = await import("@/lib/i18n");
    for (const [, titleKey] of ROUTE_LAYOUTS) {
      expect(getMarketingMessage(titleKey)).not.toEqual(titleKey);
    }
  });
});
