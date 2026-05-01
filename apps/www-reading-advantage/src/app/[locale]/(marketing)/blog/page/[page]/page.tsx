import { Metadata } from "next";
import { getAllPosts, getPaginatedPosts } from "@/lib/blog";
import { BlogCard } from "@/components/blog/blog-card";
import { BlogListItem } from "@/types/blog";
import HeroSection from "@/components/marketing/hero-section";

interface PageProps {
  params: Promise<{ locale: string; page: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  const totalPages = Math.ceil(posts.length / 9);
  return Array.from({ length: totalPages }, (_, i) => ({
    page: String(i + 1),
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { page } = await params;
  const pageNumber = parseInt(page, 10);

  return {
    title: `Blog - Page ${pageNumber} | Reading Advantage`,
    description: `Educational insights, learning strategies, and updates from Reading Advantage. Page ${pageNumber}.`,
    openGraph: {
      title: `Reading Advantage Blog - Page ${pageNumber}`,
      description: `Educational insights, learning strategies, and updates from Reading Advantage. Page ${pageNumber}.`,
      type: "website",
      images: ["/images/reading-advantage-demo.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: `Reading Advantage Blog - Page ${pageNumber}`,
      description: `Educational insights, learning strategies, and updates from Reading Advantage. Page ${pageNumber}.`,
      images: ["/images/reading-advantage-demo.png"],
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  };
}

export default async function BlogPaginatedPage({ params }: PageProps) {
  const { locale, page } = await params;
  const pageNumber = parseInt(page, 10);

  const allPosts = await getAllPosts(locale as "en" | "th" | "zh");
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
            <BlogCard key={post.slug} post={post} locale={locale} />
          ))}
        </div>
      </div>
    </main>
  );
}
