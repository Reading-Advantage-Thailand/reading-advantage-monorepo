import en from './en'

type TranslationValue = string | Record<string, unknown>
type TranslationObject = Record<string, TranslationValue>

const translations: Record<string, string> = flattenTranslations(en as TranslationObject)

function flattenTranslations(obj: TranslationObject, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    
    if (typeof value === 'string') {
      result[fullKey] = value
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenTranslations(value as TranslationObject, fullKey))
    }
  }
  
  return result
}

export function useScopedI18n(scope: string) {
  return (key: string, params?: Record<string, string | number>) => {
    const fullKey = `${scope}.${key}`
    let translation = translations[fullKey] || key
    
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = (translation as string).replace(`{${paramKey}}`, String(paramValue))
      })
    }
    
    return translation as string
  }
}

export function useCurrentLocale() {
  return 'en'
}

export function useI18n() {
  return (key: string, params?: Record<string, string | number>) => {
    let translation = translations[key] || key
    
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = (translation as string).replace(`{${paramKey}}`, String(paramValue))
      })
    }
    
    return translation as string
  }
}

export { en }
