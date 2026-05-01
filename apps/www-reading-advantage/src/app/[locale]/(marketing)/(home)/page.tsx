import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail, Check } from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import { Button } from "@/components/ui/button";

/**
 * Home page — rewritten April 2026.
 *
 * Design language: Clay-inspired warm cream (#faf9f7) canvas with a single
 * product accent (sky-500 / sky-900 for Reading Advantage). Roobert type,
 * oat borders (#dad4c8), playful hover (rotateZ + hard offset shadow).
 *
 * Structural changes vs. previous version:
 *   - 8 sections → 5
 *   - Mission + Overview merged into the hero as evidence stats
 *   - Innovation + Big 4 merged into "How it works"
 *   - Amber / orange / slate / rose palette mix removed — sky only
 *   - Single CTA verb ("Book a demo") repeated instead of 4 different asks
 *   - Gradient-text headlines, blurred color blobs, and decorative icon
 *     gradients removed in favor of honest typography and oat rules
 *
 * See: conductor/DESIGN.md for the full rationale + tokens.
 */
export default async function Home() {
  const t = await getScopedI18n("pages.home");

  const benefits = [
    t("flagship.benefits.0"),
    t("flagship.benefits.1"),
    t("flagship.benefits.2"),
    t("flagship.benefits.3"),
  ];

  const howItWorks = [
    {
      title: t("qualityProtocol.features.0.title"),
      description: t("qualityProtocol.features.0.description"),
    },
    {
      title: t("qualityProtocol.features.1.title"),
      description: t("qualityProtocol.features.1.description"),
    },
    {
      title: t("qualityProtocol.features.2.title"),
      description: t("qualityProtocol.features.2.description"),
    },
    {
      title: t("qualityProtocol.features.3.title"),
      description: t("qualityProtocol.features.3.description"),
    },
  ];

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

  return (
    <main className="overflow-x-hidden bg-[#faf9f7] text-black">
      {/* ─────────────────────────────────────────────────────────────
          HERO — evidence-led, single CTA, warm cream canvas
         ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 md:pt-36 pb-24 md:pb-32">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 mb-8">
                {t("hero.eyebrow")}
              </p>
              <h1 className="text-5xl md:text-6xl lg:text-[80px] font-semibold leading-[1.02] tracking-[-0.03em] text-black mb-8">
                {t("hero.title")}
              </h1>
              <p className="text-lg md:text-xl leading-relaxed text-[#55534e] max-w-xl mb-10">
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
                  href="/products/reading-advantage"
                  className="text-sm font-medium text-black border-b border-[#dad4c8] pb-0.5 hover:border-sky-500 transition-colors"
                >
                  {t("hero.secondaryCta")} →
                </Link>
              </div>

              {/* Evidence bar — the old Overview stats, promoted to hero */}
              <dl className="mt-16 grid grid-cols-3 gap-6 pt-8 border-t border-[#dad4c8] max-w-xl">
                <div>
                  <dd className="text-3xl md:text-4xl font-semibold tracking-tight text-black">
                    +9.5
                  </dd>
                  <dt className="text-xs uppercase tracking-wider text-[#9f9b93] mt-2">
                    {t("hero.stats.gain")}
                  </dt>
                </div>
                <div>
                  <dd className="text-3xl md:text-4xl font-semibold tracking-tight text-black">
                    10K+
                  </dd>
                  <dt className="text-xs uppercase tracking-wider text-[#9f9b93] mt-2">
                    {t("hero.stats.articles")}
                  </dt>
                </div>
                <div>
                  <dd className="text-3xl md:text-4xl font-semibold tracking-tight text-black">
                    12
                  </dd>
                  <dt className="text-xs uppercase tracking-wider text-[#9f9b93] mt-2">
                    {t("hero.stats.levels")}
                  </dt>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-5 hidden lg:block">
              <div className="relative rounded-3xl overflow-hidden border border-[#dad4c8] bg-white shadow-[rgba(0,0,0,0.1)_0px_1px_1px,rgba(0,0,0,0.04)_0px_-1px_1px_inset,rgba(0,0,0,0.05)_0px_-0.5px_1px]">
                <Image
                  src="/images/reading-advantage-demo.png"
                  alt="Reading Advantage student dashboard"
                  width={720}
                  height={720}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FLAGSHIP — what it is, who it's for
         ───────────────────────────────────────────────────────────── */}
      <section id="products" className="py-24 md:py-32 border-t border-[#dad4c8]">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">
            <header className="lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 mb-6">
                {t("flagship.eyebrow")}
              </p>
              <h2 className="text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-black mb-6">
                {t("flagship.title")}
              </h2>
              <p className="text-base md:text-lg leading-relaxed text-[#55534e] mb-10">
                {t("flagship.description")}
              </p>

              <Button variant="default" asChild>
                <Link href="/products/reading-advantage">
                  {t("flagship.cta")}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </header>

            <ul className="lg:col-span-7 space-y-5">
              {benefits.map((benefit, i) => (
                <li
                  key={i}
                  className="flex items-start gap-5 p-6 bg-white border border-[#dad4c8] rounded-2xl"
                >
                  <span
                    className="flex-shrink-0 w-10 h-10 rounded-full bg-sky-100 text-sky-900 flex items-center justify-center font-semibold text-sm"
                    aria-hidden="true"
                  >
                    <Check className="w-5 h-5" />
                  </span>
                  <p className="text-base md:text-lg leading-relaxed text-black">
                    {benefit}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          HOW IT WORKS — the Big 4 Quality Protocol
          (merged from the old Innovation + Quality Protocol sections)
         ───────────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-white border-y border-[#dad4c8]">
        <div className="container mx-auto px-4 max-w-6xl">
          <header className="max-w-2xl mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 mb-6">
              {t("howItWorks.eyebrow")}
            </p>
            <h2 className="text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-black mb-6">
              {t("howItWorks.title")}
            </h2>
            <p className="text-base md:text-lg leading-relaxed text-[#55534e]">
              {t("howItWorks.description")}
            </p>
          </header>

          <ol className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-[#dad4c8] border border-[#dad4c8] rounded-2xl overflow-hidden">
            {howItWorks.map((item, i) => (
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
          FOR THAI PRIVATE SCHOOLS — the "loud" section (sky-900)
         ───────────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-sky-900 text-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <header className="max-w-2xl mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300 mb-6">
              {t("thaiSchools.eyebrow")}
            </p>
            <h2 className="text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-white mb-6">
              {t("thaiSchools.title")}
            </h2>
            <p className="text-base md:text-lg leading-relaxed text-sky-100">
              {t("thaiSchools.description")}
            </p>
          </header>

          <div className="grid md:grid-cols-3 gap-6">
            {thaiFeatures.map((item, i) => (
              <article
                key={item.title}
                className="border border-sky-700 rounded-2xl p-8 bg-sky-900/40 backdrop-blur-sm"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300 mb-6 block">
                  Challenge 0{i + 1}
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

      {/* ─────────────────────────────────────────────────────────────
          CTA — single ask, time-boxed, repeated verb from the hero
         ───────────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 mb-6">
            {t("impact.eyebrow")}
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-[-0.02em] text-black mb-8">
            {t("impact.title")}
          </h2>
          <p className="text-lg md:text-xl leading-relaxed text-[#55534e] mb-12 max-w-2xl mx-auto">
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
              href="/products/reading-advantage"
              className="text-sm font-medium text-black border-b border-[#dad4c8] pb-0.5 hover:border-sky-500 transition-colors"
            >
              {t("impact.secondaryCta")} →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
