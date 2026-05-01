const RELATIVE_TIME_UNITS: Array<{
  unit: Intl.RelativeTimeFormatUnit;
  milliseconds: number;
}> = [
  { unit: 'year', milliseconds: 1000 * 60 * 60 * 24 * 365 },
  { unit: 'month', milliseconds: 1000 * 60 * 60 * 24 * 30 },
  { unit: 'week', milliseconds: 1000 * 60 * 60 * 24 * 7 },
  { unit: 'day', milliseconds: 1000 * 60 * 60 * 24 },
  { unit: 'hour', milliseconds: 1000 * 60 * 60 },
  { unit: 'minute', milliseconds: 1000 * 60 },
  { unit: 'second', milliseconds: 1000 },
];

function toDate(date: Date | string | number): Date | null {
  if (date instanceof Date) {
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatRelativeTime(
  value: Date | string | number,
  locale: string = 'en',
): string {
  const date = toDate(value);

  if (!date) {
    return '—';
  }

  const now = Date.now();
  const diff = date.getTime() - now;
  const absDiff = Math.abs(diff);

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  for (const { unit, milliseconds } of RELATIVE_TIME_UNITS) {
    if (absDiff >= milliseconds || unit === 'second') {
      const value = Math.round(diff / milliseconds);
      return formatter.format(value, unit);
    }
  }

  return formatter.format(0, 'second');
}
