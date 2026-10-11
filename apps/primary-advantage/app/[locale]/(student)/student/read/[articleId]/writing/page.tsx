import { redirect } from "@/i18n/navigation";

/**
 * The legacy app's `/writing` link of an article (printed QR codes, spec D3). The article page
 * holds the writing question, so this page opens it; the article page resolves a legacy id.
 * @param props.params The locale and the article id.
 * @returns A redirect to the article.
 */
export default async function ArticleWritingPage({ params }: { params: Promise<{ locale: string; articleId: string }> }) {
  const { locale, articleId } = await params;
  return redirect({ href: `/student/read/${encodeURIComponent(articleId)}`, locale });
}
