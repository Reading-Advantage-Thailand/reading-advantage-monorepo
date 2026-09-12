import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

type LocaleProviderProps = {
    locale: string;
    children: ReactNode;
};

/**
 * Supplies the requested translations to client controls.
 * @param props The route locale and page content.
 * @returns The localized page provider.
 */
export async function LocaleProvider({ locale, children }: LocaleProviderProps) {
    const messages = await getMessages({ locale });
    return (
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Bangkok">
            {children}
        </NextIntlClientProvider>
    );
}
