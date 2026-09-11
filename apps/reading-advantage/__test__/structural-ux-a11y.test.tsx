/**
 * FR-7 accessibility tests for track `structural_ux_alignment_20260911`.
 *
 * Static invariants read repository source as text. Behavioral checks render
 * the matching game and activate cards from the keyboard. The suite fails
 * before the FR-7 edits and passes after.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Matching from "@/components/matching";
import type { Sentence } from "@/components/practic/types";

const APP_ROOT = path.resolve(__dirname, "..");

/** Reads a path relative to the reading-advantage app root. */
function readSource(relativePath: string): string {
  const absolutePath = path.resolve(APP_ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Expected source file at ${absolutePath} but it is missing.`
    );
  }
  return fs.readFileSync(absolutePath, "utf8");
}

describe("FR-7 static accessibility invariants", () => {
  test("signin form error container announces as an alert", () => {
    const content = readSource("components/user-signin-form.tsx");
    expect(content).toContain('role="alert"');
  });

  test("password reset form uses camelCase SVG attributes", () => {
    const content = readSource("components/user-reset-pass-form.tsx");
    expect(content).toContain("strokeWidth");
    expect(content).toContain("strokeLinecap");
    expect(content).toContain("strokeLinejoin");
    expect(content).not.toContain("stroke-width");
    expect(content).not.toContain("stroke-linecap");
    expect(content).not.toContain("stroke-linejoin");
  });

  test("level-test chat message list is a polite live region", () => {
    const content = readSource("components/level-test-chat.tsx");
    expect(content).toContain('aria-live="polite"');
  });

  test("sidebar components use a real link instead of window.history.back", () => {
    for (const file of [
      "components/sidebar-nav.tsx",
      "components/teacher/sidebar-teacher-nav.tsx",
      "components/system/system-sidebar-nav.tsx",
    ]) {
      const content = readSource(file);
      expect(content).not.toContain("window.history.back");
    }
    const sidebar = readSource("components/sidebar-nav.tsx");
    expect(sidebar).toContain("@/i18n/routing");
  });

  test("matching cards use a real button element", () => {
    const content = readSource("components/matching.tsx");
    expect(content).toContain("<button");
    expect(content).toContain("handleCardClick");
  });

  test("history table rows with a click handler are keyboard reachable", () => {
    const content = readSource("components/teacher/teacher-data-table.tsx");
    expect(content).toContain("tabIndex");
    expect(content).toContain("onKeyDown");
    expect(content).toContain('role: "link"');
  });

  test("saved word and sentence cells use a real button for navigation", () => {
    for (const file of [
      "components/vocabulary/tab-manage.tsx",
      "components/manage-tab.tsx",
    ]) {
      const content = readSource(file);
      expect(content).toMatch(
        /<button[\s\S]*?handleNavigateToArticle\(row\.original\.articleId\)/
      );
    }
  });

  test("save-to-flashcard has a visible button in article and story content", () => {
    const article = readSource("components/article-content.tsx");
    expect(article).toContain("onClick={saveToFlashcard}");
    expect(article).toContain('t("saveToFlashcard")');

    const story = readSource("components/stories-chapter-content.tsx");
    expect(story).toContain("onClick={saveToFlashcard}");
    expect(story).toContain('t("saveToFlashcard")');
  });

  test("saveToFlashcard label exists in every locale", () => {
    for (const locale of ["en", "th", "tw", "cn", "vi"]) {
      const content = readSource(`locales/${locale}.ts`);
      expect(content).toContain("saveToFlashcard");
    }
  });
});

jest.mock("@/locales/client", () => ({
  useCurrentLocale: () => "en",
  useScopedI18n: () => (key: string) => key,
  usePathname: () => "/student/practice",
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@/components/audio-button", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <img {...props} alt={(props.alt as string) ?? ""} />
  ),
}));

function makeSentence(index: number): Sentence {
  return {
    id: `sentence-${index}`,
    articleId: `article-${index}`,
    createdAt: { _seconds: 0, _nanoseconds: 0 },
    endTimepoint: 2,
    sentence: `Sentence ${index}`,
    sn: index,
    timepoint: 1,
    translation: { th: `คำแปล ${index}` },
    userId: "user-1",
    due: "2099-01-01",
  };
}

async function renderMatching() {
  const sentences = Array.from({ length: 5 }, (_, i) => makeSentence(i));
  (globalThis.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ sentences }),
  });
  render(<Matching userId="user-1" />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Sentence 0" })).toBeInTheDocument()
  );
}

describe("FR-7 matching game keyboard support", () => {
  beforeEach(() => {
    (globalThis.fetch as jest.Mock) = jest.fn();
  });

  test("renders each card as a button", async () => {
    await renderMatching();
    const buttons = screen.getAllByRole("button", { name: /Sentence \d/ });
    expect(buttons).toHaveLength(5);
  });

  test("Enter key activates a card", async () => {
    const user = userEvent.setup();
    await renderMatching();

    const card = screen.getByRole("button", { name: "Sentence 0" });
    card.focus();
    await user.keyboard("{Enter}");

    expect((card.parentElement as HTMLElement).style.border).toContain(
      "2px solid"
    );
  });

  test("Space key on the matching card completes the pair", async () => {
    const user = userEvent.setup();
    await renderMatching();

    const card = screen.getByRole("button", { name: "Sentence 0" });
    card.focus();
    await user.keyboard("{Enter}");

    const match = screen.getByRole("button", { name: "คำแปล 0" });
    match.focus();
    await user.keyboard(" ");

    expect(
      (card.parentElement as HTMLElement).className
    ).toContain("hidden");
    expect(
      (match.parentElement as HTMLElement).className
    ).toContain("hidden");
  });
});
