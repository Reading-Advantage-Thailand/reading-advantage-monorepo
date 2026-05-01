import { createI18nServer } from 'next-international/server';
import { localeImports } from '@/configs/locale-config';

export const {
    getI18n,
    getScopedI18n,
    getCurrentLocale,
    getStaticParams
} = createI18nServer(localeImports);

export { setStaticParamsLocale } from 'next-international/server';