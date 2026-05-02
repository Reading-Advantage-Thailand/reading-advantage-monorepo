'use client';
import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';

type LocaleProviderProps = {
    locale: string;
    children: ReactNode;
};

export function LocaleProvider({ locale, children }: LocaleProviderProps) {
    return (
        <NextIntlClientProvider locale={locale}>
            {children}
        </NextIntlClientProvider>
    );
}
