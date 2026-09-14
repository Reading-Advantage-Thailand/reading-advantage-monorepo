/**
 * Shared render helpers that mount components through the real next-intl
 * message trees from messages/*.json instead of an identity mock. With the
 * provider in place, a missing message key surfaces as untranslated key text
 * in the DOM, so assertions on user-facing copy stay honest.
 */
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps, ReactElement } from "react";

import enMessages from "../../../messages/en.json";
import thMessages from "../../../messages/th.json";

/** Real message trees loaded from the app's translation files. */
export const testMessages = {
  en: enMessages,
  th: thMessages,
} as const;

/** Locales the shared helper can provide to a render. */
export type TestLocale = keyof typeof testMessages;

type ProviderMessages = ComponentProps<
  typeof NextIntlClientProvider
>["messages"];

/**
 * Wraps an element in NextIntlClientProvider with a real message tree.
 * @param ui The element to wrap.
 * @param locale Locale whose messages file backs the provider. Defaults to "en".
 * @returns The provider-wrapped element.
 */
export function withMessages(
  ui: ReactElement,
  locale: TestLocale = "en",
): ReactElement {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={testMessages[locale] as ProviderMessages}
    >
      {ui}
    </NextIntlClientProvider>
  );
}

/**
 * Renders a component through the real message tree for one locale.
 * @param ui The element to render.
 * @param options Testing Library options plus the provider locale.
 * @returns The Testing Library render result.
 */
export function renderWithMessages(
  ui: ReactElement,
  options: RenderOptions & { locale?: TestLocale } = {},
): RenderResult {
  const { locale = "en", ...renderOptions } = options;
  return render(withMessages(ui, locale), renderOptions);
}
