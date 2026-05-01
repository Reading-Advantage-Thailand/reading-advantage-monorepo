/**
 * Genre Localization Service
 * 
 * Provides localized labels and rationale text for genre engagement metrics
 * and recommendations. Supports multiple languages and fallback to English.
 */

import { prisma } from '@/lib/prisma';

// Supported locales for genre recommendations
export type SupportedLocale = 'en' | 'th' | 'cn' | 'tw' | 'vi';

// Import locale dictionaries
const LOCALES = {
  en: () => import('@/locales/en').then(m => m.default),
  th: () => import('@/locales/th').then(m => m.default),
  cn: () => import('@/locales/cn').then(m => m.default),
  tw: () => import('@/locales/tw').then(m => m.default),
  vi: () => import('@/locales/vi').then(m => m.default),
};

// Cache for loaded locale dictionaries
const localeCache = new Map<string, any>();

/**
 * Load and cache locale dictionary
 */
async function getLocaleDictionary(locale: SupportedLocale): Promise<any> {
  if (localeCache.has(locale)) {
    return localeCache.get(locale);
  }

  try {
    const dictionary = await LOCALES[locale]();
    localeCache.set(locale, dictionary);
    return dictionary;
  } catch (error) {
    console.warn(`Failed to load locale ${locale}, falling back to English`);
    if (locale !== 'en') {
      return getLocaleDictionary('en');
    }
    throw new Error(`Failed to load English locale: ${error}`);
  }
}

/**
 * Get localized genre name
 */
export async function getLocalizedGenreName(
  genre: string, 
  locale: SupportedLocale = 'en'
): Promise<string> {
  try {
    const dictionary = await getLocaleDictionary(locale);
    return dictionary.genreEngagement?.genres?.[genre] || genre;
  } catch (error) {
    console.warn(`Localization error for genre ${genre}:`, error);
    return genre;
  }
}

/**
 * Get localized recommendation rationale
 */
export async function getLocalizedRationale(
  type: 'high_engagement_similar' | 'underexplored_adjacent' | 'level_appropriate_new',
  sourceGenre: string,
  targetGenre: string,
  locale: SupportedLocale = 'en'
): Promise<string> {
  try {
    const dictionary = await getLocaleDictionary(locale);
    const template = dictionary.genreEngagement?.recommendations?.rationale?.[type];
    
    if (!template) {
      // Fallback templates
      const fallbackTemplates = {
        high_engagement_similar: `Strong ${sourceGenre} engagement suggests you might enjoy ${targetGenre}`,
        underexplored_adjacent: `Based on your ${sourceGenre} reading, explore ${targetGenre} for variety`,
        level_appropriate_new: `${targetGenre} matches your reading level - discover something new!`
      };
      return fallbackTemplates[type];
    }

    // Get localized genre names
    const localizedSource = await getLocalizedGenreName(sourceGenre, locale);
    const localizedTarget = await getLocalizedGenreName(targetGenre, locale);

    // Replace placeholders
    return template
      .replace('{sourceGenre}', localizedSource)
      .replace('{targetGenre}', localizedTarget);
  } catch (error) {
    console.warn(`Localization error for rationale ${type}:`, error);
    // Return English fallback
    return getLocalizedRationale(type, sourceGenre, targetGenre, 'en');
  }
}

/**
 * Get localized recommendation type label
 */
export async function getLocalizedRecommendationType(
  type: 'high_engagement_similar' | 'underexplored_adjacent' | 'level_appropriate_new',
  locale: SupportedLocale = 'en'
): Promise<string> {
  try {
    const dictionary = await getLocaleDictionary(locale);
    return dictionary.genreEngagement?.recommendations?.types?.[type] || type;
  } catch (error) {
    console.warn(`Localization error for recommendation type ${type}:`, error);
    return type;
  }
}

/**
 * Get localized metric label
 */
export async function getLocalizedMetricLabel(
  metric: string,
  locale: SupportedLocale = 'en'
): Promise<string> {
  try {
    const dictionary = await getLocaleDictionary(locale);
    return dictionary.genreEngagement?.metrics?.[metric] || metric;
  } catch (error) {
    console.warn(`Localization error for metric ${metric}:`, error);
    return metric;
  }
}

/**
 * Get localized timeframe label
 */
export async function getLocalizedTimeframe(
  timeframe: '7d' | '30d' | '90d' | '6m',
  locale: SupportedLocale = 'en'
): Promise<string> {
  try {
    const dictionary = await getLocaleDictionary(locale);
    return dictionary.genreEngagement?.metrics?.timeframes?.[timeframe] || timeframe;
  } catch (error) {
    console.warn(`Localization error for timeframe ${timeframe}:`, error);
    return timeframe;
  }
}

/**
 * Get localized scope label
 */
export async function getLocalizedScope(
  scope: 'student' | 'class' | 'school',
  locale: SupportedLocale = 'en'
): Promise<string> {
  try {
    const dictionary = await getLocaleDictionary(locale);
    return dictionary.genreEngagement?.metrics?.scopes?.[scope] || scope;
  } catch (error) {
    console.warn(`Localization error for scope ${scope}:`, error);
    return scope;
  }
}

/**
 * Get localized insight text
 */
export async function getLocalizedInsight(
  insightKey: string,
  variables: Record<string, string | number> = {},
  locale: SupportedLocale = 'en'
): Promise<string> {
  try {
    const dictionary = await getLocaleDictionary(locale);
    let template = dictionary.genreEngagement?.insights?.[insightKey];
    
    if (!template) {
      return `Insight: ${insightKey}`;
    }

    // Replace all variables in the template
    for (const [key, value] of Object.entries(variables)) {
      template = template.replace(`{${key}}`, String(value));
    }

    return template;
  } catch (error) {
    console.warn(`Localization error for insight ${insightKey}:`, error);
    return `Insight: ${insightKey}`;
  }
}

/**
 * Get user's preferred locale from database
 */
export async function getUserLocale(userId: string): Promise<SupportedLocale> {
  try {
    // Check if user has a locale preference stored
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        // Assuming we might add a locale field in the future
        // For now, determine from school location or other factors
        school: {
          select: { country: true }
        }
      }
    });

    // Simple country-to-locale mapping
    const countryLocaleMap: Record<string, SupportedLocale> = {
      'Thailand': 'th',
      'China': 'cn',
      'Taiwan': 'tw',
      'Vietnam': 'vi',
    };

    const country = user?.school?.country;
    return countryLocaleMap[country || ''] || 'en';
  } catch (error) {
    console.warn(`Failed to get user locale for ${userId}:`, error);
    return 'en';
  }
}

/**
 * Localize a complete genre recommendation object
 */
export async function localizeGenreRecommendation(
  recommendation: {
    genre: string;
    rationale: string;
    recommendationType: 'high_engagement_similar' | 'underexplored_adjacent' | 'level_appropriate_new';
    confidenceScore: number;
  },
  sourceGenre: string,
  locale: SupportedLocale = 'en'
) {
  const localizedGenre = await getLocalizedGenreName(recommendation.genre, locale);
  const localizedRationale = await getLocalizedRationale(
    recommendation.recommendationType,
    sourceGenre,
    recommendation.genre,
    locale
  );
  const localizedType = await getLocalizedRecommendationType(
    recommendation.recommendationType,
    locale
  );

  return {
    ...recommendation,
    genre: localizedGenre,
    rationale: localizedRationale,
    typeLabel: localizedType,
    originalGenre: recommendation.genre, // Keep original for system use
  };
}

/**
 * Batch localize multiple genres
 */
export async function localizeGenreList(
  genres: string[],
  locale: SupportedLocale = 'en'
): Promise<Array<{ original: string; localized: string }>> {
  const results = await Promise.all(
    genres.map(async (genre) => ({
      original: genre,
      localized: await getLocalizedGenreName(genre, locale)
    }))
  );
  
  return results;
}

/**
 * Clear locale cache (useful for testing or when locale files are updated)
 */
export function clearLocaleCache(): void {
  localeCache.clear();
}