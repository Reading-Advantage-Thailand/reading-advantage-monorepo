import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Link } from "@/locales/navigation";
import { getScopedI18n } from "@/locales/server";
import { buildMarketingMetadata } from "@/lib/seo";

const IMAGE_DIR = "/images/storytime-advantage";

const STORY_IMAGES = [
  { name: "week-02-how-many-cakes", alt: "week02HowManyCakes" },
  { name: "week-03-it-is-red", alt: "week03ItIsRed" },
  { name: "week-04-nan-and-pam-nap", alt: "week04NanAndPamNap" },
  { name: "week-05-two-ears", alt: "week05TwoEars" },
  { name: "week-06-i-see-a-cat", alt: "week06ISeeACat" },
  { name: "week-07-top-on-a-pot", alt: "week07TopOnAPot" },
] as const;

/** Builds metadata for the localized Storytime Advantage route. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getScopedI18n("pages.products.storytimeAdvantage");
  return buildMarketingMetadata({
    description: t("metadata.description"),
    locale,
    path: "/products/storytime-advantage",
    title: t("metadata.title"),
  });
}

/** Renders the Storytime Advantage marketing page. */
export default async function StorytimeAdvantage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getScopedI18n("pages.products.storytimeAdvantage");

  return (
    <main className="overflow-x-hidden bg-site-page text-site-body">
      <section
        data-testid="st-hero"
        className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-amber-700 text-white"
      >
        <div className="container mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-24">
          <div className="lg:col-span-6">
            <span className="mb-6 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900">
              {t("hero.comingSoon")}
            </span>
            <h1 className="mb-5 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mb-4 text-xl leading-relaxed text-amber-50">
              {t("hero.subtitle")}
            </p>
            <p className="max-w-2xl text-lg leading-relaxed text-amber-50">
              {t("hero.description")}
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-2xl bg-white px-7 py-4 font-bold text-amber-900 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              {t("cta.buttons.joinWaitlist")}
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
          </div>
          <div className="lg:col-span-6">
            <Image
              src={`${IMAGE_DIR}/week-01-hello-pip.webp`}
              alt={t("heroAlt")}
              width={1200}
              height={900}
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="h-auto w-full rounded-3xl border border-white/40 shadow-xl"
            />
          </div>
        </div>
      </section>

      <section data-testid="st-section-1" className="border-y border-site-border bg-white py-16 lg:py-20">
        <div className="container mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="mb-3 font-semibold text-amber-800">{t("adaptiveEngine.eyebrow")}</p>
            <h2 className="mb-5 text-3xl font-bold text-site-navy md:text-4xl">
              {t("adaptiveEngine.heading")}
            </h2>
            <p className="text-lg leading-relaxed">{t("adaptiveEngine.description")}</p>
          </div>
          <div className="lg:col-span-7">
            <Image
              src={`${IMAGE_DIR}/level-2-unit-1-cover-art.webp`}
              alt={t("adaptiveEngine.alt")}
              width={960}
              height={720}
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="h-auto w-full rounded-3xl border border-site-border shadow-lg"
            />
          </div>
        </div>
      </section>

      <section data-testid="st-section-2" className="bg-amber-500 py-16 text-white lg:py-20">
        <div className="container mx-auto max-w-7xl px-4">
          <p className="mb-4 text-center text-sm font-semibold text-amber-50">{t("eyebrows.keyFeatures")}</p>
          <h2 className="mx-auto mb-10 max-w-3xl text-center text-3xl font-bold md:text-4xl">
            {t("keyFeatures.heading")}
          </h2>
          <div className="grid gap-8 lg:grid-cols-2">
            {[0, 1].map((group) => (
              <article key={group} className="rounded-3xl bg-white p-6 text-site-body shadow-lg sm:p-9">
                <h3 className="mb-5 text-2xl font-bold text-site-navy">
                  {t(`keyFeatures.features.${group}.title`)}
                </h3>
                <ul className="space-y-4">
                  {[0, 1, 2, 3].map((point) => (
                    <li key={point} className="flex gap-3 leading-relaxed">
                      <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                      {t(`keyFeatures.features.${group}.points.${point}`)}
                    </li>
                  ))}
                </ul>
                {group === 1 && (
                  <div className="mt-7 grid grid-cols-2 gap-4">
                    <Image src={`${IMAGE_DIR}/week-01-reader-hello-cover.webp`} alt={t("images.week01ReaderHelloCover")} width={480} height={360} sizes="(max-width: 640px) 45vw, 20vw" className="h-auto w-full rounded-xl border border-site-border" />
                    <Image src={`${IMAGE_DIR}/week-01-reader-nan-can-nod-cover.webp`} alt={t("images.week01ReaderNanCanNodCover")} width={480} height={360} sizes="(max-width: 640px) 45vw, 20vw" className="h-auto w-full rounded-xl border border-site-border" />
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section data-testid="st-section-3" className="bg-white py-16 lg:py-20">
        <div className="container mx-auto max-w-7xl px-4">
          <p className="mb-4 text-sm font-semibold text-amber-800">{t("eyebrows.k3Curriculum")}</p>
          <h2 className="mb-10 max-w-4xl text-3xl font-bold text-site-navy md:text-4xl">{t("coreValue.heading")}</h2>
          <div className="mb-10 grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((feature) => (
              <article key={feature} className="border-l-4 border-amber-500 pl-5">
                <h3 className="mb-2 text-xl font-bold text-site-navy">{t(`coreValue.features.${feature}.title`)}</h3>
                <p className="leading-relaxed">{t(`coreValue.features.${feature}.description`)}</p>
              </article>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {STORY_IMAGES.map((image) => (
              <Image
                key={image.name}
                src={`${IMAGE_DIR}/${image.name}.webp`}
                alt={t(`images.${image.alt}`)}
                width={900}
                height={675}
                sizes="(max-width: 768px) 50vw, 33vw"
                className="h-auto w-full rounded-2xl border border-site-border shadow-md"
              />
            ))}
          </div>
        </div>
      </section>

      <section data-testid="st-section-4" className="bg-amber-50 py-16 lg:py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <p className="mb-4 text-center text-sm font-semibold text-amber-800">{t("eyebrows.teacherResources")}</p>
          <h2 className="mb-10 text-center text-3xl font-bold text-site-navy md:text-4xl">{t("teacherTools.heading")}</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {[0, 1, 2].map((tool) => (
              <article key={tool} className="rounded-2xl border border-amber-100 bg-white p-7 shadow-sm">
                <h3 className="mb-3 text-xl font-bold text-site-navy">{t(`teacherTools.tools.${tool}.title`)}</h3>
                <p className="leading-relaxed">{t(`teacherTools.tools.${tool}.description`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section data-testid="st-section-5" className="bg-white py-16 lg:py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <p className="mb-4 text-center text-sm font-semibold text-amber-800">{t("eyebrows.frequentlyAskedQuestions")}</p>
          <h2 className="mb-8 text-center text-3xl font-bold text-site-navy md:text-4xl">{t("faq.heading")}</h2>
          <div className="divide-y divide-site-border border-y border-site-border">
            {[0, 1, 2, 3, 4].map((item) => (
              <details key={item} className="py-5">
                <summary className="cursor-pointer text-lg font-semibold text-site-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700">
                  {t(`faq.questions.${item}.question`)}
                </summary>
                <p className="pt-4 leading-relaxed">{t(`faq.questions.${item}.answer`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section data-testid="st-cta" className="bg-gradient-to-br from-amber-700 to-amber-800 py-16 text-center text-white lg:py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="mb-5 text-3xl font-bold md:text-4xl">{t("cta.heading")}</h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-amber-50">{t("cta.description")}</p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/contact" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-white px-7 py-4 font-bold text-amber-900 hover:bg-amber-50">
              {t("cta.buttons.joinWaitlist")}<ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
            <Link href="/contact" className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-white px-7 py-4 font-bold text-white hover:bg-white hover:text-amber-900">
              {t("cta.buttons.learnMore")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
