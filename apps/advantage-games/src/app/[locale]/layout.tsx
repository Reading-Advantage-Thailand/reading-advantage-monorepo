import { ReactNode } from "react";
import { GamesLocaleProvider } from "@/locales/GamesLocaleContext";

/**
 * Standalone advantage-games locale layout.
 *
 * Phase 5 (Decision 5.2) expanded the static-params list to all three
 * locale codes so the standalone static export produces `/en/`, `/th/`, and
 * `/zh/` routes. The standalone app still ships only the `en.ts` content;
 * `th` and `zh` routes fall back to key values via the explicit
 * key-fallback in `@/locales/client.ts`. This is honest: the fallback is
 * explicit, not silent.
 *
 * Children are wrapped in `GamesLocaleProvider` with the route's locale so
 * `useCurrentLocale()` reads the URL `[locale]` segment rather than the
 * previous hardcoded `'en'` literal. Host shells in the imported-app
 * context can override this provider with their own locale source.
 */
export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "th" }, { locale: "zh" }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <GamesLocaleProvider value={{ locale }}>
      {children}
    </GamesLocaleProvider>
  );
}