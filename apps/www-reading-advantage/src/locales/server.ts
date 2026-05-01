import { localeImports } from '@/config/locale-config';
import { createI18nServer } from 'next-international/server'

export const { getI18n, getScopedI18n, getStaticParams } = createI18nServer({
    ...localeImports,
})