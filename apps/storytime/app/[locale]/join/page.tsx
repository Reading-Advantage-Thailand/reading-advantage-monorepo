import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { JOIN_COPY, joinCopy, joinLines } from "../../../lib/join-copy";

/**
 * The "How to join" page of the Storytime app (design section 2, AC-4.5).
 *
 * The page is public: a visitor without a session sees it, and it writes no cookie. It holds no
 * week content and no media link. The copy comes from the PR hand-off and stays a draft until
 * the PR copy and the Thai check of Daniel are recorded, so the page shows a draft marker while
 * the status is `draft`.
 */

/**
 * Gives the title of the browser tab.
 * @param props.params The locale of the page.
 * @returns The page metadata.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: joinCopy(locale).title, robots: "noindex, nofollow" };
}

/**
 * Renders the "How to join" page.
 * @param props.params The locale of the page.
 * @returns The page.
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const copy = joinCopy(locale);
  const translate = await getTranslations({ locale });
  const t = (key: string) => translate(key);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 p-6">
      {JOIN_COPY.status === "draft" ? (
        <p data-draft="true" className="rounded-xl border border-amber-500 p-3">
          {t("joinDraftMarker")}
        </p>
      ) : null}
      <h1 className="text-2xl font-semibold" lang={locale === "th" ? "th" : "en"}>
        {copy.heading}
      </h1>
      <p className="leading-7" lang={locale === "th" ? "th" : "en"}>
        {copy.whoItIsFor}
      </p>
      <p className="leading-7" lang={locale === "th" ? "th" : "en"}>
        {copy.howToGetSignIn}
      </p>
      <div className="flex flex-col gap-1 leading-7" lang={locale === "th" ? "th" : "en"}>
        {joinLines(copy.contact).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <Link
        href={`/${locale}/sign-in`}
        className="inline-flex min-h-16 w-fit items-center rounded-2xl border border-[#92400e] bg-[#92400e] px-4 py-2 text-white"
      >
        {copy.signInLink}
      </Link>
    </main>
  );
}
