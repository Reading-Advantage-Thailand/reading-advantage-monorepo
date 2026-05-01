'use client';
import { ReactNode } from 'react';
import { I18nProviderClient } from '../../locales/client';

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