import type { Metadata } from "next";
import {
  getAllPosts,
  getBlogPostLocales,
  getBlogPostTotalPages,
  getPaginatedPosts,
  normalizeBlogLocale,
} from "@/lib/blog";
import { BlogCard } from "@/components/blog/blog-card";
import { BlogPagination } from "@/components/blog/blog-pagination";
import { BlogListItem } from "@/types/blog";
import HeroSection from "@/components/marketing/hero-section";
import { getScopedI18n } from "@/locales/server";
import { notFound } from "next/navigation";
import { buildMarketingMetadata } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string; page: string }>;
}

function parsePageNumber(page: string, totalPages: number): number | null {
  if (!/^[1-9]\d*$/.test(page)) return null;

  const pageNumber = Number(page);
  if (!Number.isSafeInteger(pageNumber) || pageNumber > totalPages) {
    return null;
  }

  return pageNumber;
}

/**
 * Lists the statically generated blog page parameters.
 * @returns The available pagination parameters.
 */
export async function generateStaticParams(): Promise<Array<{ page: string }>> {
  const posts = await getAllPosts();
  const totalPages = Math.ceil(posts.length / 9);
  return Array.from({ length: totalPages }, (_, i) => ({
    page: String(i + 1),
  }));
}

/**
 * Builds locale-aware metadata for a valid blog page.
 * @param props The locale and page route parameters.
 * @returns The blog pagination metadata or an empty result for invalid pages.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, page } = await params;
  const effectiveLocale = normalizeBlogLocale(locale);
  const totalPages = getBlogPostTotalPages(effectiveLocale, 9);
  const pageNumber = parsePageNumber(page, totalPages);
  if (pageNumber === null) return {};

  const t = await getScopedI18n("pages.blog");
  const title = `${t("title")} - Page ${pageNumber}`;
  const description = `${t("description")} Page ${pageNumber}.`;

  return buildMarketingMetadata({
    alternateLocales: getBlogPostLocales(),
    description,
    locale: effectiveLocale,
    path: `/blog/page/${pageNumber}`,
    title,
  });
}

/**
 * Renders a localized blog pagination page.
 * @param props The locale and page route parameters.
 * @returns The rendered blog pagination page.
 */
export default async function BlogPaginatedPage({ params }: PageProps) {
  const { locale, page } = await params;
  const effectiveLocale = normalizeBlogLocale(locale);
  const totalPages = getBlogPostTotalPages(effectiveLocale, 9);
  const pageNumber = parsePageNumber(page, totalPages);
  if (pageNumber === null) notFound();

  const allPosts = await getAllPosts(effectiveLocale);
  const { posts } = await getPaginatedPosts(pageNumber, 9, allPosts);

  return (
    <main>
      <HeroSection
        title={`Blog - Page ${pageNumber}`}
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
            <BlogCard key={post.slug} post={post} locale={effectiveLocale} />
          ))}
        </div>
        <BlogPagination currentPage={pageNumber} totalPages={totalPages} />
      </div>
    </main>
  );
}
