import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { studentPageConfig } from "../student-page-config";
import { teacherPageConfig } from "../teacher-page-config";
import { adminPageConfig } from "../admin-page-config";
import { systemPageConfig } from "../system-page-config";
import { settingsPageConfig } from "../settings-page-config";
import type { SidebarNavItem } from "@/types";

const messagesDir = path.join(__dirname, "../../messages");
const locales = readdirSync(messagesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));

const configs = [
  studentPageConfig,
  teacherPageConfig,
  adminPageConfig,
  systemPageConfig,
  settingsPageConfig,
];

/** Collects titles the sidebar renders: top-level via Sidebar.*, children via Sidebar.subItem.*. */
function collect() {
  const top = new Set<string>();
  const sub = new Set<string>();
  const walk = (items: SidebarNavItem[] = []) =>
    items.forEach((item) => {
      top.add(item.title);
      (item.items ?? []).forEach((c) => sub.add(c.title));
    });
  configs.forEach((c) => walk(c.sidebarNav as SidebarNavItem[]));
  return { top, sub };
}

describe("Sidebar message keys", () => {
  it("serves the five expected locales", () => {
    expect(locales.sort()).toEqual(["cn", "en", "th", "tw", "vi"]);
  });

  it.each(locales)("%s defines every key the sidebar configs use", (locale) => {
    const messages = JSON.parse(
      readFileSync(path.join(messagesDir, `${locale}.json`), "utf8"),
    );
    const { top, sub } = collect();
    const missingTop = [...top].filter((k) => !(k in messages.Sidebar));
    const missingSub = [...sub].filter((k) => !(k in messages.Sidebar.subItem));
    expect({ missingTop, missingSub }).toEqual({
      missingTop: [],
      missingSub: [],
    });
  });
});
