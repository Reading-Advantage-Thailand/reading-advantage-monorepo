import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { teacherPageConfig } from "../teacher-page-config";
import type { SidebarNavItem } from "@/types";

const appDir = path.join(__dirname, "../../app/[locale]");

/**
 * Collects every href the teacher navigation renders: the bottom-bar tabs and the sidebar
 * items with their children.
 * @returns The distinct hrefs.
 */
function hrefs(): string[] {
  const out = new Set<string>();
  teacherPageConfig.tabs?.forEach((tab) => out.add(tab.href));
  const walk = (items: SidebarNavItem[] = []) =>
    items.forEach((item) => {
      if (item.href) out.add(item.href);
      walk(item.items ?? []);
    });
  walk(teacherPageConfig.sidebarNav as SidebarNavItem[]);
  return [...out];
}

describe("teacher navigation (Lane C Phase 3 review)", () => {
  // The sidebar linked /teacher/student-progress, which has only the [id] page, so the link
  // opened a 404 page.
  it.each(hrefs())("%s has a page", (href) => {
    expect(existsSync(path.join(appDir, href, "page.tsx"))).toBe(true);
  });
});
