'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LanguageContextType {
  language: 'en' | 'th';
  setLanguage: (lang: 'en' | 'th') => void;
  showThai: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  showThai: false,
});

interface LanguageProviderProps {
  children: ReactNode;
}

/**
 * LanguageProvider manages the user's preferred language for lesson content.
 * Persists preference to localStorage and provides context to child components.
 *
 * Features:
 * - Defaults to English ('en')
 * - Persists preference to localStorage
 * - Avoids hydration mismatch by delaying state read until mount
 */
export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<'en' | 'th'>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('preferredLanguage') as 'en' | 'th' | null;
      if (saved && (saved === 'en' || saved === 'th')) {
        setLanguageState(saved);
      }
    } catch {
      // localStorage may not be available (SSR, incognito mode restrictions)
      console.warn('[LanguageProvider] Unable to access localStorage');
    }
  }, []);

  const setLanguage = (lang: 'en' | 'th') => {
    setLanguageState(lang);
    try {
      localStorage.setItem('preferredLanguage', lang);
    } catch {
      // localStorage may not be available
      console.warn('[LanguageProvider] Unable to persist language preference');
    }
  };

  // Avoid hydration mismatch by rendering children with default value until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        showThai: language === 'th',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access the language context.
 *
 * @returns {LanguageContextType} The current language state and setters
 * @example
 * ```tsx
 * const { language, setLanguage, showThai } = useLanguage();
 * ```
 */
export const useLanguage = () => useContext(LanguageContext);
