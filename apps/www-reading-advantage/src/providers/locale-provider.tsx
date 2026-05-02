"use client";

import { NextIntlClientProvider } from "next-intl";
import { ReactNode } from "react";

type LocaleProviderProps = {
  locale: string;
  messages: Record<string, unknown>;
  children: ReactNode;
};

export function LocaleProvider({ locale, messages, children }: LocaleProviderProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
