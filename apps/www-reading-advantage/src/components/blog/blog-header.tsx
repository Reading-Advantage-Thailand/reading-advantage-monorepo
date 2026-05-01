import { BlogHeaderProps } from "@/types/blog";
import { getScopedI18n } from "@/locales/server";

export async function BlogHeader({ title, date, author, readingTime, locale = "en" }: BlogHeaderProps & { locale?: string }) {
  const t = await getScopedI18n("pages.blog");

  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));

  return (
    <div className="space-y-4 pb-8 pt-6 md:space-y-6">
      <div className="flex flex-col items-start gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{formattedDate}</span>
          <span>•</span>
          <span>{t("readingTime", { count: readingTime })}</span>
          <span>•</span>
          <span>{author}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
      </div>
    </div>
  );
}
