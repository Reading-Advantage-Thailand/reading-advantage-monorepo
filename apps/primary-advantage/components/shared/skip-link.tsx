import { useTranslations } from "next-intl";

/**
 * Renders the "skip to main content" link. It is hidden until it gets keyboard focus,
 * and it must be the first focusable element of the page.
 * @returns The skip link to #main-content.
 */
export function SkipLink() {
  const t = useTranslations("AppShell");
  return (
    <a
      href="#main-content"
      className="bg-background text-foreground sr-only z-[100] rounded-md px-4 py-2 font-medium shadow-md focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
    >
      {t("skipToContent")}
    </a>
  );
}
