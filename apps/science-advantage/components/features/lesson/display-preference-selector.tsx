'use client';

import { cn } from '@/lib/utils';
import { useDisplayPreference } from '@/contexts/display-preference-context';

interface DisplayPreferenceSelectorProps {
  className?: string;
}

const PREFERENCE_OPTIONS = [
  { value: 'en' as const, label: 'English', shortLabel: 'EN' },
  { value: 'th' as const, label: 'Thai', shortLabel: 'TH' },
  { value: 'side-by-side' as const, label: 'Side-by-Side', shortLabel: 'EN+TH' },
] as const;

/**
 * DisplayPreferenceSelector renders a three-option toggle for bilingual display modes.
 * Replaces the binary LanguageToggle with granular control.
 */
export function DisplayPreferenceSelector({
  className,
}: DisplayPreferenceSelectorProps) {
  const { displayPreference, setDisplayPreference } =
    useDisplayPreference();

  return (
    <div
      className={cn('flex rounded-lg border border-gray-200 bg-gray-50 p-0.5', className)}
      role="radiogroup"
      aria-label="Display language preference"
    >
      {PREFERENCE_OPTIONS.map((option) => (
        <button
          key={option.value}
          role="radio"
          aria-checked={displayPreference === option.value}
          onClick={() => setDisplayPreference(option.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            displayPreference === option.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <span className="hidden sm:inline">{option.label}</span>
          <span className="sm:hidden">{option.shortLabel}</span>
        </button>
      ))}
    </div>
  );
}
