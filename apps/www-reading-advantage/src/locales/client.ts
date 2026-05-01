"use client"
import { localeImports } from '@/config/locale-config'
import { createI18nClient } from 'next-international/client'

export const { useI18n, useScopedI18n, I18nProviderClient, useCurrentLocale, useChangeLocale } = createI18nClient({
    ...localeImports
})