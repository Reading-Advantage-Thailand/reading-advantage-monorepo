import Image from "next/image";
import { BlogListItem } from "@/types/blog";
import { LocalizedLink } from "@/components/common/localized-link";
import { getScopedI18n } from "@/locales/server";

interface BlogCardProps {
  post: BlogListItem;
  locale?: string;
}

export async function BlogCard({ post, locale = "en" }: BlogCardProps) {
  const t = await getScopedI18n("pages.blog");

  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(post.date));

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      {post.coverImage && (
        <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>{formattedDate}</span>
          <span>•</span>
          <span>{t("readingTime", { count: post.readingTime })}</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">
          <LocalizedLink href={`/blog/${post.slug}`} className="hover:underline">
            {post.title}
          </LocalizedLink>
        </h2>
        <p className="text-muted-foreground mb-4">{post.excerpt}</p>
        <div className="flex items-center gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
