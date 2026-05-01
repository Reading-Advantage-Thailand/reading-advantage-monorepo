'use client';
import { I18nProviderClient } from '@/locales/client';
import { ReactNode } from 'react';

type LocaleProviderProps = {
    locale: string;
    children: ReactNode;
};

export function LocaleProvider({ locale, children }: LocaleProviderProps) {
    return (
        <I18nProviderClient locale={locale}>
            {children}
        </I18nProviderClient>
    );
}