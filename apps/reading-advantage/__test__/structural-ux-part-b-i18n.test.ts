/**
 * Static source invariants for the remaining part B scope of the
 * `structural_ux_alignment_20260911` track — FR-6 i18n, footer fixes,
 * and marketing metadata.
 *
 * These checks read repository source as text. They do not render
 * components or import app modules.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const APP_ROOT = path.resolve(__dirname, "..");

/** Reads a path relative to the reading-advantage app root. */
function readSource(relativePath: string): string {
  const absolutePath = path.resolve(APP_ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Expected source file at ${absolutePath} but it is missing.`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

const LOCALES = ["en", "th", "cn", "tw", "vi"] as const;

describe("structural-ux part B — i18n, footer, and metadata", () => {
  test("auth sign-in page renders copy through i18n", () => {
    const source = readSource("app/[locale]/(auth)/auth/signin/page.tsx");
    expect(source).toContain('getScopedI18n("pages.signInPage")');
    expect(source).not.toContain("Sign in to your account");
    expect(source).not.toContain("Enter your email and password");
    expect(source).not.toContain("Sign up");
  });

  test("sign-in error handler renders copy through i18n", () => {
    const source = readSource("components/signin-error-handler.tsx");
    expect(source).toContain('useScopedI18n("components.signInError")');
    expect(source).not.toContain('"Session Error"');
    expect(source).not.toContain('"Network Error"');
    expect(source).not.toContain('"Authentication Error"');
    expect(source).not.toContain("iOS Users:");
  });

  test("every locale defines the new auth, footer, and sidebar keys", () => {
    for (const locale of LOCALES) {
      const source = readSource(`locales/${locale}.ts`);
      expect(source).toContain("signInPage:");
      expect(source).toContain("signInError:");
      expect(source).toContain("footer:");
      expect(source).toContain("flashcards:");
      expect(source).toContain("settingsUserProfile:");
      expect(source).toContain("systemLicense:");
      expect(source).toContain("systemDashboard:");
      expect(source).toContain("adminArticlesCreation:");
      expect(source).toContain("teacherAssignments:");
    }
  });

  test("admin and system sidebars use i18n keys, not raw English titles", () => {
    for (const config of [
      "configs/admin-page-config.ts",
      "configs/system-page-config.ts",
    ]) {
      const source = readSource(config);
      expect(source).not.toMatch(/title: "[A-Z][^"]*"/);
    }
  });

  test("footer has no wrong link, fake phone, or hardcoded year", () => {
    const source = readSource("components/footer.tsx");
    expect(source).not.toContain("flowbite.com");
    expect(source).not.toContain("456-7890");
    expect(source).not.toContain("+11234567890");
    expect(source).not.toContain("© 2024");
    expect(source).toContain("getFullYear()");
    expect(source).toContain("admin@reading-advantage.com");
    expect(source).toContain('getScopedI18n("components.footer")');
  });

  test("flashcard components render copy through i18n", () => {
    const dashboard = readSource("components/flashcards/flashcard-dashboard.tsx");
    expect(dashboard).toContain('useScopedI18n("components.flashcards.dashboard")');
    expect(dashboard).not.toContain("Flashcard Dashboard");

    const emptyDeck = readSource("components/flashcards/empty-deck.tsx");
    expect(emptyDeck).toContain('useScopedI18n("components.flashcards.emptyDeck")');
    expect(emptyDeck).not.toContain(">How It Works<");
    expect(emptyDeck).not.toContain("Start Reading Now");

    const deckView = readSource("components/flashcards/deck-view.tsx");
    expect(deckView).toContain('useScopedI18n("components.flashcards.deck")');
    expect(deckView).not.toContain("Start Studying (");
    expect(deckView).not.toContain("Refresh Data");

    const game = readSource("components/flashcards/flashcard-game.tsx");
    expect(game).toContain('useScopedI18n("components.flashcards.game")');
    expect(game).not.toContain("Show Answer");
    expect(game).not.toContain("Study Session Complete!");
  });

  test("settings page renders copy through i18n", () => {
    const source = readSource(
      "app/[locale]/(student)/settings/user-profile/page.tsx"
    );
    expect(source).toContain('getScopedI18n("pages.settingsUserProfile")');
    expect(source).not.toContain("Personal information");
    expect(source).not.toContain("Back to Reading Page");
  });

  test("system license pages render copy through i18n", () => {
    const columns = readSource(
      "app/[locale]/(system)/system/license/columns.tsx"
    );
    expect(columns).toContain("getColumns");
    expect(columns).not.toContain('header: "School name"');
    expect(columns).not.toContain('"Delete license?"');

    const form = readSource(
      "app/[locale]/(system)/system/license/create-license-form.tsx"
    );
    expect(form).toContain('useScopedI18n("pages.systemLicense.form")');
    expect(form).not.toContain("Create Licenses");
    expect(form).not.toContain("School name must be at least 5 characters.");
  });

  test("marketing pages export per-page metadata", () => {
    for (const page of [
      "app/[locale]/(index)/page.tsx",
      "app/[locale]/(index)/about/page.tsx",
      "app/[locale]/(index)/authors/page.tsx",
      "app/[locale]/(index)/contact/page.tsx",
      "app/[locale]/(index)/privacy-policy/page.tsx",
      "app/[locale]/(index)/terms/page.tsx",
    ]) {
      const source = readSource(page);
      expect(source).toContain("export const metadata");
    }
  });
});
