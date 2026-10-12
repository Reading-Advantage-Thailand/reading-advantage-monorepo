import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { adminPageConfig } from "../admin-page-config";
import type { SidebarNavItem } from "@/types";

const appDir = path.join(__dirname, "../../app/[locale]");

/**
 * Collects every href the admin navigation renders: the bottom-bar tabs and the sidebar
 * items with their children.
 * @returns The distinct hrefs.
 */
function hrefs(): string[] {
  const out = new Set<string>();
  adminPageConfig.tabs?.forEach((tab) => out.add(tab.href));
  const walk = (items: SidebarNavItem[] = []) =>
    items.forEach((item) => {
      if (item.href) out.add(item.href);
      walk(item.items ?? []);
    });
  walk(adminPageConfig.sidebarNav as SidebarNavItem[]);
  return [...out];
}

describe("admin navigation (primary_parity_admin_dashboard FR-18)", () => {
  it("gives the dashboard entry no sub-items", () => {
    const entry = (adminPageConfig.sidebarNav as SidebarNavItem[]).find((item) => item.href === "/admin/dashboard");
    expect(entry).toBeDefined();
    expect(entry?.items ?? []).toEqual([]);
  });

  it("links to neither empty dashboard sub-page", () => {
    expect(hrefs()).not.toContain("/admin/dashboard/students");
    expect(hrefs()).not.toContain("/admin/dashboard/teachers");
  });

  it.each(hrefs())("%s has a page", (href) => {
    expect(existsSync(path.join(appDir, href, "page.tsx"))).toBe(true);
  });
});
