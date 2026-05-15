export function formatRelativeTime(date: Date | null | undefined, locale: string): string {
  if (!date || isNaN(date.getTime())) {
    return locale === "th" ? "ไม่ทราบ" : "unknown";
  }
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 30) return locale === "th" ? "เมื่อสักครู่" : "just now";
  if (minutes < 1) return locale === "th" ? `${seconds} วินาทีที่แล้ว` : `${seconds} seconds ago`;

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (minutes < 60) return rtf.format(-minutes, "minute");
  if (hours < 24) return rtf.format(-hours, "hour");
  if (days < 30) return rtf.format(-days, "day");

  return rtf.format(-Math.floor(days / 30), "month");
}

export function formatNumber(n: number | null | undefined, locale: string): string {
  if (n === null || n === undefined || isNaN(n)) {
    return locale === "th" ? "ไม่ทราบ" : "unknown";
  }
  return new Intl.NumberFormat(locale).format(n);
}

export function formatDate(date: Date | null | undefined, locale: string): string {
  if (!date || isNaN(date.getTime())) {
    return locale === "th" ? "ไม่ทราบ" : "unknown";
  }
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
