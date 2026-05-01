'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

type DisplayPreference = 'en' | 'th' | 'side-by-side';

interface DisplayPreferenceContextType {
  displayPreference: DisplayPreference;
  setDisplayPreference: (pref: DisplayPreference) => void;
  /** Whether to render Thai content */
  showThai: boolean;
  /** Whether to render English content */
  showEnglish: boolean;
}

const VALID_PREFERENCES: DisplayPreference[] = ['en', 'th', 'side-by-side'];

const DisplayPreferenceContext = createContext<DisplayPreferenceContextType>({
  displayPreference: 'side-by-side',
  setDisplayPreference: () => {},
  showThai: true,
  showEnglish: true,
});

interface DisplayPreferenceProviderProps {
  children: ReactNode;
}

/**
 * DisplayPreferenceProvider manages the user's bilingual display preference.
 * Replaces the binary LanguageProvider with three modes:
 * - 'en': English only (showThai=false)
 * - 'th': Thai primary (showThai=true, fallback to English)
 * - 'side-by-side': Both languages (default)
 */
export function DisplayPreferenceProvider({
  children,
}: DisplayPreferenceProviderProps) {
  const [displayPreference, setDisplayPreferenceState] =
    useState<DisplayPreference>('side-by-side');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('displayPreference');
      if (
        saved &&
        VALID_PREFERENCES.includes(saved as DisplayPreference)
      ) {
        setDisplayPreferenceState(saved as DisplayPreference);
      }
    } catch {
      console.warn(
        '[DisplayPreferenceProvider] Unable to access localStorage'
      );
    }
  }, []);

  const setDisplayPreference = (pref: DisplayPreference) => {
    setDisplayPreferenceState(pref);
    try {
      localStorage.setItem('displayPreference', pref);
      // Also persist to legacy key for backward compatibility with any
      // components still reading 'preferredLanguage'
      const legacyLang = pref === 'side-by-side' ? 'en' : pref;
      localStorage.setItem('preferredLanguage', legacyLang);
    } catch {
      console.warn(
        '[DisplayPreferenceProvider] Unable to persist preference'
      );
    }
  };

  const showThai = displayPreference === 'th' || displayPreference === 'side-by-side';
  const showEnglish = displayPreference === 'en' || displayPreference === 'side-by-side';

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <DisplayPreferenceContext.Provider
      value={{
        displayPreference,
        setDisplayPreference,
        showThai,
        showEnglish,
      }}
    >
      {children}
    </DisplayPreferenceContext.Provider>
  );
}

/**
 * Hook to access the display preference context.
 */
export const useDisplayPreference = () =>
  useContext(DisplayPreferenceContext);
