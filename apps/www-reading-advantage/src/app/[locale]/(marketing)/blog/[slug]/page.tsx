import {
  getBlogPost,
  getAllPosts,
  extractHeadings,
  getRelatedPosts,
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

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, slug } = await props.params;
  const post = await getBlogPost(slug, locale as "en" | "th" | "zh");
  if (!post) return {};

  return {
    title: `${post.title} | Reading Advantage Blog`,
    description: post.excerpt,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      images: post.coverImage ? [post.coverImage] : [],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : [],
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  };
}

async function BlogPost(props: Props) {
  const { locale, slug } = await props.params;
  const post = await getBlogPost(slug, locale as "en" | "th" | "zh");

  if (!post) {
    notFound();
  }

  const t = await getScopedI18n("pages.blog");
  const headings = extractHeadings(post.rawContent);
  const allPosts = await getAllPosts(locale as "en" | "th" | "zh");
  const relatedPosts = getRelatedPosts(post.slug, post.tags, allPosts, 3);

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
        <BlogHeader
          title={post.title}
          date={post.date}
          author={post.author}
          readingTime={post.readingTime}
          locale={locale}
        />
        {post.coverImage && (
          <Image
            src={post.coverImage}
            alt={post.title}
            width={1200}
            height={400}
            className="w-full h-64 object-cover rounded-lg mb-8"
          />
        )}
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          <div className="lg:col-span-3">
            <div
              className="prose prose-lg max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl prose-a:text-blue-600 prose-strong:text-gray-900 prose-ul:list-disc prose-ol:list-decimal"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
            <ProductCTA product={post.product} locale={locale} />
            <ContactCTA locale={locale} />
          </div>
          <div className="lg:col-span-1">
            <TableOfContents headings={headings} />
          </div>
        </div>
        <BlogTags tags={post.tags} />
        <RelatedPosts posts={relatedPosts} locale={locale} />
      </article>
    </main>
  );
}

export default BlogPost;
