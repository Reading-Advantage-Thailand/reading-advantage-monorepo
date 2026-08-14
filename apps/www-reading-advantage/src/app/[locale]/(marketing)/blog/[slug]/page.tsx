import { existsSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import {
  getBlogPost,
  getAllPosts,
  extractHeadings,
  getBlogPostLocales,
  getRelatedPosts,
  isSafeBlogSlug,
  normalizeBlogLocale,
} from "@/lib/blog";
import { BlogHeader } from "@/components/blog/blog-header";
import { BlogBreadcrumbs } from "@/components/blog/blog-breadcrumbs";
import { BlogTags } from "@/components/blog/blog-tags";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { RelatedPosts } from "@/components/blog/related-posts";
import { ProductCTA } from "@/components/blog/product-cta";
import { ContactCTA } from "@/components/blog/contact-cta";
import { getScopedI18n } from "@/locales/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import HeroSection from "@/components/marketing/hero-section";
import { buildMarketingMetadata } from "@/lib/seo";

const FALLBACK_IMAGE = "/images/teacher-at-board.png";
const SAFE_COVER_PATH =
  /^\/(?:blog|images)\/[a-z0-9._/-]+\.(?:png|jpe?g|webp|avif)$/i;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

function resolveCoverImage(coverImage: string | undefined): string {
  if (
    !coverImage ||
    coverImage.includes("..") ||
    !SAFE_COVER_PATH.test(coverImage)
  ) {
    return FALLBACK_IMAGE;
  }

  const publicRoot = resolve(process.cwd(), "public");
  const publicPath = resolve(publicRoot, coverImage.slice(1));
  if (
    !publicPath.startsWith(`${publicRoot}${sep}`) ||
    !existsSync(publicPath)
  ) {
    return FALLBACK_IMAGE;
  }

  try {
    const bytes = readFileSync(publicPath).subarray(0, 12);
    const extension = coverImage
      .slice(coverImage.lastIndexOf("."))
      .toLowerCase();

    if (extension === ".png") {
      return hasMagic(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        ? coverImage
        : FALLBACK_IMAGE;
    }
    if (extension === ".jpg" || extension === ".jpeg") {
      return hasMagic(bytes, [0xff, 0xd8, 0xff]) ? coverImage : FALLBACK_IMAGE;
    }
    if (extension === ".webp") {
      return hasMagic(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        ascii(bytes, 8, 12) === "WEBP"
        ? coverImage
        : FALLBACK_IMAGE;
    }
    return ascii(bytes, 4, 8) === "ftyp" &&
      ["avif", "avis"].includes(ascii(bytes, 8, 12))
      ? coverImage
      : FALLBACK_IMAGE;
  } catch {
    return FALLBACK_IMAGE;
  }
}

function hasMagic(bytes: Uint8Array, expected: readonly number[]): boolean {
  return expected.every((byte, index) => bytes[index] === byte);
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

/**
 * Builds metadata from the requested blog post and available translations.
 * @param props The locale and slug route parameters.
 * @returns The article metadata or an empty result for an invalid post.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isSafeBlogSlug(slug)) return {};

  const requestedLocale = normalizeBlogLocale(locale);
  const post = await getBlogPost(slug, requestedLocale);
  if (!post) return {};

  const availableLocales = getBlogPostLocales(slug);
  const effectiveLocale = availableLocales.includes(requestedLocale)
    ? requestedLocale
    : "en";
  const title = `${post.title} | Reading Advantage Blog`;
  const image = resolveCoverImage(post.coverImage);
  const metadata = buildMarketingMetadata({
    alternateLocales: availableLocales,
    description: post.excerpt,
    image,
    locale: effectiveLocale,
    path: `/blog/${slug}`,
    title,
  });
  return {
    ...metadata,
    authors: [{ name: post.author }],
    description: post.excerpt,
    openGraph: {
      ...(metadata.openGraph ?? {}),
      authors: [post.author],
      description: post.excerpt,
      title: post.title,
      type: "article",
      publishedTime: post.date,
      images: [image],
      tags: post.tags,
    },
    twitter: {
      ...(metadata.twitter ?? {}),
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [image],
    },
  };
}

/**
 * Renders a localized blog article and its related content.
 * @param props The locale and slug route parameters.
 * @returns The rendered blog article.
 */
async function BlogPost(props: Props) {
  const { locale, slug } = await props.params;
  const effectiveLocale = normalizeBlogLocale(locale);
  const post = await getBlogPost(slug, effectiveLocale);

  if (!post) {
    notFound();
  }

  const t = await getScopedI18n("pages.blog");
  const headings = extractHeadings(post.rawContent);
  const allPosts = await getAllPosts(effectiveLocale);
  const relatedPosts = getRelatedPosts(post.slug, post.tags, allPosts, 3);
  const coverImage = resolveCoverImage(post.coverImage);

  return (
    <main>
      <HeroSection
        title={post.title}
        description={`${post.author} • ${t("readingTime", { count: post.readingTime })}`}
        ctaButton={{
          text: "Back to Blog",
          href: "/blog",
          variant: "primary",
        }}
        height="medium"
      />
      <article className="container mx-auto px-4 py-8">
        <BlogBreadcrumbs postTitle={post.title} />
        {post.coverImage && (
          <Image
            src={coverImage}
            alt={post.title}
            width={1200}
            height={400}
            className="w-full h-64 object-cover rounded-lg mb-8"
          />
        )}
        <BlogHeader
          title={post.title}
          date={post.date}
          author={post.author}
          readingTime={post.readingTime}
          locale={effectiveLocale}
        />
        <BlogTags tags={post.tags} className="mb-8" />
        <div className="border-t" />
        <div className="lg:grid lg:grid-cols-4 lg:gap-8 mt-8">
          <div className="lg:col-span-3">
            <div
              className="prose prose-lg max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl prose-a:text-blue-600 prose-strong:text-gray-900 prose-ul:list-disc prose-ol:list-decimal"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
            <div className="border-t my-8" />
            <ProductCTA product={post.product} locale={effectiveLocale} />
            <ContactCTA locale={effectiveLocale} />
          </div>
          <div className="lg:col-span-1">
            <TableOfContents headings={headings} />
          </div>
        </div>
        <RelatedPosts posts={relatedPosts} locale={effectiveLocale} />
      </article>
    </main>
  );
}

export default BlogPost;
