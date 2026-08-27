import type { Metadata } from "next";
import {
  getAllPosts,
  getBlogPostLocales,
  getPaginatedPosts,
  normalizeBlogLocale,
} from "@/lib/blog";
import { BlogCard } from "@/components/blog/blog-card";
import { BlogPagination } from "@/components/blog/blog-pagination";
import { BlogListItem } from "@/types/blog";
import HeroSection from "@/components/marketing/hero-section";
import { getScopedI18n } from "@/locales/server";
import { buildMarketingMetadata } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Builds locale-aware metadata for the blog index.
 * @param props The locale route parameters.
 * @returns The blog index metadata.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const effectiveLocale = normalizeBlogLocale(locale);
  const t = await getScopedI18n("pages.blog");

  return buildMarketingMetadata({
    alternateLocales: getBlogPostLocales(),
    description: t("description"),
    locale: effectiveLocale,
    path: "/blog",
    title: t("title"),
  });
}

/**
 * Renders the localized blog index.
 * @param props The locale route parameters.
 * @returns The rendered blog index.
 */
export default async function BlogPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getScopedI18n("pages.blog");
  const allPosts = await getAllPosts(locale as "en" | "th" | "zh");
  const { posts, totalPages } = await getPaginatedPosts(1, 9, allPosts);

  return (
    <main>
      <HeroSection
        title={t("title")}
        description="Educational insights, learning strategies, and product updates from Reading Advantage."
        ctaButton={{
          text: "Contact Us",
          href: "/contact",
          variant: "primary",
        }}
        height="medium"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post: BlogListItem) => (
            <BlogCard key={post.slug} post={post} locale={locale} />
          ))}
        </div>
        <BlogPagination currentPage={1} totalPages={totalPages} />
      </div>
    </main>
  );
}
