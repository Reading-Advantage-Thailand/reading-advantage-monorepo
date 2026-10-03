import { Link } from "@/locales/navigation";
import { ArrowRight, Mail, GitBranch, Clock, Target, Mic } from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import { Button } from "@/components/ui/button";
import { MasteryAdvantageGraph } from "@/components/marketing/mastery-advantage-graph";
import { graphLabelsFrom } from "@/components/marketing/mastery-graph-labels";
import { SiteImageView } from "@/components/marketing/site-image";
import { SectionHeader } from "@/components/marketing/section-header";
import { HomeLiveCard, HomeRoadmapCard } from "@/components/marketing/home-product-cards";
import { siteImages, siteLogos } from "@/lib/site-assets";
import { buildMarketingMetadata } from "@/lib/seo";
import type { Metadata } from "next";

/**
 * Builds metadata for the public home route.
 * @param props The locale route parameters.
 * @returns The home route metadata.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getScopedI18n("pages.home");
  const title = t("hero.title");
  const description = t("hero.description");

  return buildMarketingMetadata({
    description,
    locale,
    path: "/",
    title,
  });
}

/**
 * Renders the public home page for the requested locale.
 * @param props The locale route parameters.
 * @returns The rendered home page.
 */
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getScopedI18n("pages.home");
  const tm = await getScopedI18n("pages.masteryAdvantage");
  const graphLabels = graphLabelsFrom((key, values) => tm(key as never, values as never));

  const thaiFeatures = [
    {
      title: t("thaiSchools.features.0.title"),
      description: t("thaiSchools.features.0.description"),
    },
    {
      title: t("thaiSchools.features.1.title"),
      description: t("thaiSchools.features.1.description"),
    },
    {
      title: t("thaiSchools.features.2.title"),
      description: t("thaiSchools.features.2.description"),
    },
  ];

  const liveProducts = [
    {
      key: "primary-advantage",
      name: "Primary Advantage",
      logo: siteLogos.primary.color,
      accent: "#22d3ee",
      description: t("v2.products.primary.description"),
      meta: t("v2.products.primary.meta"),
    },
    {
      key: "reading-advantage",
      name: "Reading Advantage",
      logo: siteLogos.reading.color,
      accent: "#38bdf8",
      description: t("v2.products.reading.description"),
      meta: t("v2.products.reading.meta"),
    },
    {
      key: "codecamp-advantage",
      name: "CodeCamp Advantage",
      logo: siteLogos.codecamp.color,
      accent: "#a3e635",
      description: t("v2.products.codecamp.description"),
      meta: t("v2.products.codecamp.meta"),
    },
  ];

  const roadmapProducts = [
    { key: "science-advantage", name: "Science Advantage", logo: siteLogos.science.color },
    { key: "math-advantage", name: "Math Advantage", logo: siteLogos.math.color },
    { key: "zhongwen-advantage", name: "Zhongwen Advantage", logo: siteLogos.zhongwen.color },
    { key: "storytime-advantage", name: "Storytime Advantage", logo: siteLogos.storytime.color },
    { key: "stem-advantage", name: "STEM Advantage", logo: siteLogos.stem.color },
  ];

  const tutorBooks = [
    { name: t("v2.tutor.bookNames.primary2"), logo: siteLogos.primary.color, product: "Primary Advantage" },
    { name: t("v2.tutor.bookNames.primary31"), logo: siteLogos.primary.color, product: "Primary Advantage" },
    { name: t("v2.tutor.bookNames.reading2"), logo: siteLogos.reading.color, product: "Reading Advantage" },
  ];

  const pillars = [
    { key: "kst", Icon: GitBranch },
    { key: "srs", Icon: Clock },
    { key: "placement", Icon: Target },
  ] as const;

  const eyebrow = "text-xs font-semibold uppercase tracking-[0.18em]";

  return (
    <main className="overflow-x-hidden bg-site-page text-black">
      {/* HERO: Mastery Advantage as the engine */}
      <section className="relative pt-28 md:pt-36 pb-20 md:pb-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_80%_20%,rgba(56,189,248,0.16),transparent)]"
        />
        <div className="container relative mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            <div className="lg:col-span-6">
              <p className={`${eyebrow} text-sky-700 mb-8`}>{t("hero.eyebrow")}</p>
              <h1 className="text-4xl sm:text-5xl lg:text-[60px] xl:text-[68px] font-semibold leading-[1.04] tracking-[-0.03em] text-black mb-8">
                {t("hero.title")}
              </h1>
              <p className="text-lg md:text-xl leading-relaxed text-site-body max-w-xl mb-10">
                {t("hero.description")}
              </p>

              <div className="flex flex-wrap items-center gap-6">
                <Button size="lg" variant="default" asChild>
                  <Link href="/contact">
                    {t("hero.cta")}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Link
                  href="/mastery-advantage"
                  className="text-sm font-medium text-black border-b border-site-border pb-0.5 hover:border-sky-500 transition-colors"
                >
                  {t("hero.secondaryCta")} →
                </Link>
              </div>

              <dl className="mt-14 grid grid-cols-3 gap-4 sm:gap-6 pt-8 border-t border-site-border max-w-xl">
                <div>
                  <dd className="text-3xl md:text-4xl font-semibold tracking-tight text-black">3</dd>
                  <dt className="text-xs text-site-body mt-2 leading-snug">{t("hero.stats.products")}</dt>
                </div>
                <div>
                  <dd className="text-3xl md:text-4xl font-semibold tracking-tight text-black">14</dd>
                  <dt className="text-xs text-site-body mt-2 leading-snug">{t("v2.hero.stats.lessons")}</dt>
                </div>
                <div>
                  <dd className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-black">
                    {t("v2.hero.stats.scopeValue")}
                  </dd>
                  <dt className="text-xs text-site-body mt-2 leading-snug">{t("v2.hero.stats.scope")}</dt>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-6">
              <div className="relative pb-10 sm:pb-0">
                <div className="overflow-hidden rounded-3xl border border-site-border bg-white shadow-[0_24px_60px_-24px_rgba(12,20,55,0.35)]">
                  <SiteImageView
                    image={siteImages.workbookTabletCutaway}
                    alt={t("v2.hero.imageAlt")}
                    sizes="(min-width: 1024px) 560px, 100vw"
                    priority
                    className="w-full h-auto"
                  />
                </div>
                <figure className="absolute -bottom-0 left-4 w-[40%] sm:w-[32%] sm:-bottom-8 sm:-left-6 overflow-hidden rounded-2xl border border-site-border bg-white shadow-[0_16px_40px_-16px_rgba(12,20,55,0.4)]">
                  <MasteryAdvantageGraph className="w-full h-auto" labels={graphLabels} pauseControl />
                  <figcaption className="sr-only">{t("v2.hero.graphLabel")}</figcaption>
                </figure>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TUTOR ADVANTAGE: direct-to-family channel */}
      <section className="py-20 md:py-28 bg-emerald-50 border-y border-emerald-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <img src={siteLogos.tutor.color} alt="Tutor Advantage" width={240} height={60} className="h-16 w-auto mb-6" />
              <p className={`${eyebrow} text-emerald-800 mb-5`}>{t("v2.tutor.channel")}</p>
              <h2 className="text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-black mb-6">
                {t("tutor.title")}
              </h2>
              <p className="text-base md:text-lg leading-relaxed text-site-body mb-8">
                {t("tutor.description")}
              </p>

              <p className={`${eyebrow} text-emerald-800 mb-3`}>{t("v2.tutor.booksLabel")}</p>
              <ul className="grid gap-3 sm:grid-cols-3 mb-8">
                {tutorBooks.map((book) => (
                  <li
                    key={book.name}
                    className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-white p-4"
                  >
                    <span className="text-sm font-medium leading-snug text-black">{book.name}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-5 mb-8">
                <div>
                  <p className="text-xs text-site-body">{t("v2.tutor.priceLabel")}</p>
                  <p className="text-3xl font-semibold tracking-tight text-black">{t("v2.tutor.price")}</p>
                </div>
                <p className="max-w-xs text-sm leading-relaxed text-site-body">{t("v2.tutor.priceNote")}</p>
              </div>

              <p className="mb-8 flex items-start gap-3 text-sm leading-relaxed text-site-body">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-emerald-900">
                  <Mic className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>{t("tutor.reedy")}</span>
              </p>

              <Button variant="default" asChild>
                <Link href="/products/tutor-advantage">
                  {t("tutor.cta")}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2">
              <div className="relative pb-10 sm:pb-0">
                <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-[0_24px_60px_-28px_rgba(6,95,70,0.5)]">
                  <SiteImageView
                    image={siteImages.classroomSmallGroup}
                    alt={t("v2.tutor.imageAlt")}
                    sizes="(min-width: 1024px) 560px, 100vw"
                    className="w-full h-auto"
                  />
                </div>
                <div className="absolute bottom-0 right-4 w-[46%] sm:-bottom-8 sm:-right-4 sm:w-[40%] overflow-hidden rounded-2xl border-4 border-emerald-50 bg-white shadow-xl">
                  <SiteImageView
                    image={siteImages.primaryBook}
                    alt={t("v2.tutor.bookAlt")}
                    sizes="240px"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE ENGINE: KST + FSRS pillars */}
      <section className="py-24 md:py-32 bg-white border-b border-site-border">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-12 items-center mb-16">
            <SectionHeader
              eyebrow={t("engine.eyebrow")}
              title={t("engine.title")}
              description={t("engine.description")}
              className="lg:col-span-6"
            >
              <div className="mt-10">
                <Button variant="default" asChild>
                  <Link href="/mastery-advantage">
                    {t("engine.cta")}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </SectionHeader>
            <div className="lg:col-span-6 overflow-hidden rounded-3xl border border-site-border bg-site-navy">
              <SiteImageView
                image={siteImages.masteryClusterHero}
                alt={t("v2.engine.imageAlt")}
                sizes="(min-width: 1024px) 560px, 100vw"
                className="w-full h-auto scale-[1.5]"
              />
            </div>
          </div>

          <ol className="grid md:grid-cols-3 gap-5">
            {pillars.map(({ key, Icon }, i) => (
              <li
                key={key}
                className="relative flex flex-col gap-4 rounded-3xl border border-site-border bg-site-page p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-900">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span aria-hidden="true" className="text-5xl font-semibold tracking-tight text-[#e6e1d6]">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-black">
                  {t(`engine.pillars.${key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-site-body">
                  {t(`engine.pillars.${key}.description`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PRODUCT LINES: live, then roadmap */}
      <section id="products" className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-6xl">
          <SectionHeader
            eyebrow={t("suite.eyebrow")}
            title={t("suite.title")}
            description={t("suite.description")}
            className="mb-14"
          />

          <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-black">
            {t("v2.products.liveLabel")}
          </h3>
          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-site-body">
            {t("v2.products.liveNote")}
          </p>
          <div className="grid gap-5 md:grid-cols-3 mb-16">
            {liveProducts.map((product) => (
              <HomeLiveCard
                key={product.key}
                href={`/products/${product.key}`}
                logo={product.logo}
                name={product.name}
                accent={product.accent}
                description={product.description}
                meta={product.meta}
                cta={t("v2.products.cta")}
              />
            ))}
          </div>

          <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-site-body">
            {t("v2.products.roadmapLabel")}
          </h3>
          <p className="mb-6 text-sm text-site-body">{t("v2.products.roadmapNote")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {roadmapProducts.map((product) => (
              <HomeRoadmapCard
                key={product.key}
                href={`/products/${product.key}`}
                logo={product.logo}
                name={product.name}
                tag={t("v2.products.roadmapTag")}
              />
            ))}
          </div>
        </div>
      </section>

      {/* SCHOOLS: Blended Learning */}
      <section className="py-24 md:py-32 bg-sky-900 text-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-12 items-center mb-14">
            <SectionHeader
              tone="dark"
              eyebrow={t("thaiSchools.eyebrow")}
              title={t("thaiSchools.title")}
              description={t("thaiSchools.description")}
              className="lg:col-span-6"
            >
              <p className="mt-6 text-sm leading-relaxed text-sky-100">{t("v2.schools.blended")}</p>
            </SectionHeader>
            <div className="lg:col-span-6 overflow-hidden rounded-3xl border border-sky-700">
              <SiteImageView
                image={siteImages.classroomBlended}
                alt={t("v2.schools.imageAlt")}
                sizes="(min-width: 1024px) 560px, 100vw"
                className="w-full h-auto"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {thaiFeatures.map((item, i) => (
              <article
                key={item.title}
                className="border border-sky-700 rounded-2xl p-8 bg-sky-900/40"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300 mb-6 block">
                  {t("challengeLabel", { num: i + 1 })}
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-white mb-4">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-sky-100">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <SiteImageView
          image={siteImages.textureWarm}
          alt=""
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-site-page via-site-page/50 to-transparent" />
        <div className="container relative mx-auto px-4 max-w-4xl text-center">
          <p className={`${eyebrow} text-sky-700 mb-6`}>{t("impact.eyebrow")}</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-[-0.02em] text-black mb-8">
            {t("impact.title")}
          </h2>
          <p className="text-lg md:text-xl leading-relaxed text-site-body mb-12 max-w-2xl mx-auto">
            {t("impact.description")}
          </p>

          <div className="flex flex-wrap justify-center items-center gap-6">
            <Button size="lg" variant="default" asChild>
              <Link href="/contact">
                <Mail className="w-5 h-5" />
                {t("impact.cta")}
              </Link>
            </Button>
            <Link
              href="/mastery-advantage"
              className="text-sm font-medium text-black border-b border-site-border pb-0.5 hover:border-sky-500 transition-colors"
            >
              {t("impact.secondaryCta")} →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
