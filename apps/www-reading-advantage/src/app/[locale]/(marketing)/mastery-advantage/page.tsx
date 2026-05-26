import { Link } from "@/locales/navigation";
import { Mail } from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import { Button } from "@/components/ui/button";
import { MarketingSvg } from "@/components/marketing/marketing-svg";
import type { Locale } from "@/config/locale-config";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getScopedI18n("pages.masteryAdvantage");

  return {
    title: "Mastery Advantage — The Adaptive Engine",
    description: t("hero.description"),
    openGraph: {
      title: "Mastery Advantage — The Adaptive Engine",
      description: t("hero.description"),
      locale,
    },
  };
}

export default async function MasteryAdvantagePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getScopedI18n("pages.masteryAdvantage");

  const products = [
    { key: "reading-advantage", name: "Reading Advantage", color: "bg-sky-100 text-sky-800 border-sky-200" },
    { key: "primary-advantage", name: "Primary Advantage", color: "bg-sky-50 text-sky-700 border-sky-100" },
    { key: "storytime-advantage", name: "Storytime Advantage", color: "bg-amber-50 text-amber-700 border-amber-100" },
    { key: "math-advantage", name: "Math Advantage", color: "bg-orange-50 text-orange-700 border-orange-100" },
    { key: "science-advantage", name: "Science Advantage", color: "bg-rose-50 text-rose-700 border-rose-100" },
    { key: "stem-advantage", name: "STEM Advantage", color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
    { key: "zhongwen-advantage", name: "Zhongwen Advantage", color: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100" },
    { key: "tutor-advantage", name: "Tutor Advantage", color: "bg-violet-50 text-violet-700 border-violet-100" },
    { key: "codecamp-advantage", name: "CodeCamp Advantage", color: "bg-purple-50 text-purple-700 border-purple-100" },
  ];

  const pillars = [
    {
      title: t("technicalOverview.pillars.kst.title"),
      description: t("technicalOverview.pillars.kst.description"),
    },
    {
      title: t("technicalOverview.pillars.fsrs.title"),
      description: t("technicalOverview.pillars.fsrs.description"),
    },
    {
      title: t("technicalOverview.pillars.edgeCalibration.title"),
      description: t("technicalOverview.pillars.edgeCalibration.description"),
    },
    {
      title: t("technicalOverview.pillars.placement.title"),
      description: t("technicalOverview.pillars.placement.description"),
    },
    {
      title: t("technicalOverview.pillars.proficiency.title"),
      description: t("technicalOverview.pillars.proficiency.description"),
    },
  ];

  return (
    <main className="overflow-x-hidden bg-[#faf9f7] text-black">
      {/* ─────────────────────────────────────────────────────────────
          HERO — Adaptive path
         ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 md:pt-36 pb-24 md:pb-32">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 mb-8">
                {t("hero.eyebrow")}
              </p>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.02] tracking-[-0.03em] text-black mb-8">
                {t("hero.title")}
              </h1>
              <p className="text-lg md:text-xl leading-relaxed text-[#55534e] max-w-xl">
                {t("hero.description")}
              </p>
            </div>

            <div className="lg:col-span-6">
              <div className="relative rounded-3xl overflow-hidden border border-[#dad4c8] bg-white shadow-[rgba(0,0,0,0.1)_0px_1px_1px,rgba(0,0,0,0.04)_0px_-1px_1px_inset,rgba(0,0,0,0.05)_0px_-0.5px_1px]">
                <MarketingSvg
                  baseName="ma-marketing-adaptive-path"
                  locale={locale as Locale}
                  className="w-full h-auto"
                  alt="Adaptive learning path visualization"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SPACED REPETITION
         ───────────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-white border-y border-[#dad4c8]">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="relative rounded-3xl overflow-hidden border border-[#dad4c8] bg-white shadow-[rgba(0,0,0,0.1)_0px_1px_1px,rgba(0,0,0,0.04)_0px_-1px_1px_inset,rgba(0,0,0,0.05)_0px_-0.5px_1px]">
                <MarketingSvg
                  baseName="ma-marketing-spaced-repetition"
                  locale={locale as Locale}
                  className="w-full h-auto"
                  alt="Spaced repetition visualization"
                />
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 mb-8">
                {t("spacedRepetition.eyebrow")}
              </p>
              <h2 className="text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-black mb-6">
                {t("spacedRepetition.title")}
              </h2>
              <p className="text-base md:text-lg leading-relaxed text-[#55534e]">
                {t("spacedRepetition.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          PROGRESS TRACKING
         ───────────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 mb-8">
                {t("progress.eyebrow")}
              </p>
              <h2 className="text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-black mb-6">
                {t("progress.title")}
              </h2>
              <p className="text-base md:text-lg leading-relaxed text-[#55534e]">
                {t("progress.description")}
              </p>
            </div>

            <div className="lg:col-span-6">
              <div className="relative rounded-3xl overflow-hidden border border-[#dad4c8] bg-white shadow-[rgba(0,0,0,0.1)_0px_1px_1px,rgba(0,0,0,0.04)_0px_-1px_1px_inset,rgba(0,0,0,0.05)_0px_-0.5px_1px]">
                <MarketingSvg
                  baseName="ma-marketing-progress"
                  locale={locale as Locale}
                  className="w-full h-auto"
                  alt="Progress tracking visualization"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          TECHNICAL OVERVIEW
         ───────────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-white border-y border-[#dad4c8]">
        <div className="container mx-auto px-4 max-w-6xl">
          <header className="max-w-2xl mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 mb-6">
              {t("technicalOverview.eyebrow")}
            </p>
            <h2 className="text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-black mb-6">
              {t("technicalOverview.title")}
            </h2>
            <p className="text-base md:text-lg leading-relaxed text-[#55534e]">
              {t("technicalOverview.description")}
            </p>
          </header>

          <ol className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#dad4c8] border border-[#dad4c8] rounded-2xl overflow-hidden">
            {pillars.map((item, i) => (
              <li
                key={item.title}
                className="bg-white p-8 flex flex-col gap-4"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  0{i + 1}
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-black">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#55534e]">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          POWERS EVERY PRODUCT
         ───────────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-6xl">
          <header className="max-w-2xl mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 mb-6">
              {t("powersEveryProduct.eyebrow")}
            </p>
            <h2 className="text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-black mb-6">
              {t("powersEveryProduct.title")}
            </h2>
            <p className="text-base md:text-lg leading-relaxed text-[#55534e]">
              {t("powersEveryProduct.description")}
            </p>
          </header>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <Link
                key={product.key}
                href={`/products/${product.key}`}
                className={`flex items-center justify-center p-6 rounded-2xl border ${product.color} hover:shadow-md hover:-translate-y-1 transition-all duration-200`}
              >
                <span className="text-sm font-semibold text-center">
                  {product.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          CTA
         ───────────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-sky-900 text-white">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300 mb-6">
            {t("cta.eyebrow")}
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-[-0.02em] text-white mb-8">
            {t("cta.title")}
          </h2>
          <p className="text-lg md:text-xl leading-relaxed text-sky-100 mb-12 max-w-2xl mx-auto">
            {t("cta.description")}
          </p>

          <Button size="lg" variant="default" asChild className="bg-white text-sky-900 hover:bg-sky-50">
            <Link href="/contact">
              <Mail className="w-5 h-5" />
              {t("cta.button")}
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
