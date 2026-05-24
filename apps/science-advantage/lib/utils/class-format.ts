import type { StandardsAlignment } from '@/lib/enums';

type Locale = 'en' | 'th';

const STANDARDS_LABEL: Record<StandardsAlignment, Record<Locale, string>> = {
  THAI: {
    en: 'Thai National Standards',
    th: 'มาตรฐานการศึกษาของไทย',
  },
  NGSS: {
    en: 'NGSS',
    th: 'NGSS',
  },
};

function resolveLocale(locale: string | undefined): Locale {
  if (locale?.toLowerCase().startsWith('th')) {
    return 'th';
  }

  return 'en';
}

export function getStandardsAlignmentLabel(
  alignment: StandardsAlignment,
  locale?: string,
) {
  const resolvedLocale = resolveLocale(locale);
  return STANDARDS_LABEL[alignment]?.[resolvedLocale] ?? alignment;
}

export function formatStudentCount(count: number, locale?: string) {
  const resolvedLocale = resolveLocale(locale);
  const numberFormatter = new Intl.NumberFormat(resolvedLocale);
  const formattedCount = numberFormatter.format(count);

  if (count === 0) {
    return resolvedLocale === 'th'
      ? 'ยังไม่มีนักเรียน'
      : 'No students yet';
  }

  if (resolvedLocale === 'th') {
    return `${formattedCount} นักเรียน`;
  }

  return `${formattedCount} ${count === 1 ? 'student' : 'students'}`;
}

export function formatGradeLevel(gradeLevel: number, locale?: string) {
  const resolvedLocale = resolveLocale(locale);
  const numberFormatter = new Intl.NumberFormat(resolvedLocale, {
    maximumFractionDigits: 0,
  });
  const gradeLabel = numberFormatter.format(gradeLevel);

  if (resolvedLocale === 'th') {
    return `ชั้นประถมศึกษาปีที่ ${gradeLabel}`;
  }

  return `Grade ${gradeLabel}`;
}
