import { Link } from "@/locales/navigation";
import { ArrowRight, Mail, GitBranch, Clock, Target } from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import { Button } from "@/components/ui/button";
import { MasteryAdvantageGraph } from "@/components/marketing/mastery-advantage-graph";
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getScopedI18n("pages.home");

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

  return (
    <main className="overflow-x-hidden bg-[#faf9f7] text-black">
      {/* ─────────────────────────────────────────────────────────────
          HERO — Mastery Advantage as the engine
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
                  href="/mastery-advantage"
                  className="text-sm font-medium text-black border-b border-[#dad4c8] pb-0.5 hover:border-sky-500 transition-colors"
                >
                  {t("hero.secondaryCta")} →
                </Link>
              </div>

              {/* Evidence bar */}
              <dl className="mt-16 grid grid-cols-3 gap-6 pt-8 border-t border-[#dad4c8] max-w-xl">
                <div>
                  <dd className="text-3xl md:text-4xl font-semibold tracking-tight text-black">
                    9
                  </dd>
                  <dt className="text-xs uppercase tracking-wider text-[#9f9b93] mt-2">
                    {t("hero.stats.products")}
                  </dt>
                </div>
                <div>
                  <dd className="text-3xl md:text-4xl font-semibold tracking-tight text-black">
                    2,172+
                  </dd>
                  <dt className="text-xs uppercase tracking-wider text-[#9f9b93] mt-2">
                    {t("hero.stats.skills")}
                  </dt>
                </div>
                <div>
                  <dd className="text-3xl md:text-4xl font-semibold tracking-tight text-black">
                    {t("kstSrs")}
                  </dd>
                  <dt className="text-xs uppercase tracking-wider text-[#9f9b93] mt-2">
                    {t("hero.stats.engine")}
                  </dt>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-5 hidden lg:block">
              <div className="relative rounded-3xl overflow-hidden border border-[#dad4c8] bg-white shadow-[rgba(0,0,0,0.1)_0px_1px_1px,rgba(0,0,0,0.04)_0px_-1px_1px_inset,rgba(0,0,0,0.05)_0px_-0.5px_1px]">
                <MasteryAdvantageGraph className="w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          THE ENGINE — KST + SRS pillars
         ───────────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-white border-y border-[#dad4c8]">
        <div className="container mx-auto px-4 max-w-6xl">
          <header className="max-w-2xl mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 mb-6">
              {t("engine.eyebrow")}
            </p>
            <h2 className="text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-black mb-6">
              {t("engine.title")}
            </h2>
            <p className="text-base md:text-lg leading-relaxed text-[#55534e] mb-10">
              {t("engine.description")}
            </p>
            <Button variant="default" asChild>
              <Link href="/mastery-advantage">
                {t("engine.cta")}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </header>

          <div className="grid md:grid-cols-3 gap-px bg-[#dad4c8] border border-[#dad4c8] rounded-2xl overflow-hidden">
            <div className="bg-white p-8 flex flex-col gap-4">
              <span className="w-10 h-10 rounded-full bg-sky-100 text-sky-900 flex items-center justify-center">
                <GitBranch className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-semibold tracking-tight text-black">
                {t("engine.pillars.kst.title")}
              </h3>
              <p className="text-sm leading-relaxed text-[#55534e]">
                {t("engine.pillars.kst.description")}
              </p>
            </div>
            <div className="bg-white p-8 flex flex-col gap-4">
              <span className="w-10 h-10 rounded-full bg-sky-100 text-sky-900 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-semibold tracking-tight text-black">
                {t("engine.pillars.srs.title")}
              </h3>
              <p className="text-sm leading-relaxed text-[#55534e]">
                {t("engine.pillars.srs.description")}
              </p>
            </div>
            <div className="bg-white p-8 flex flex-col gap-4">
              <span className="w-10 h-10 rounded-full bg-sky-100 text-sky-900 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-semibold tracking-tight text-black">
                {t("engine.pillars.placement.title")}
              </h3>
              <p className="text-sm leading-relaxed text-[#55534e]">
                {t("engine.pillars.placement.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          THE SUITE — all 9 products
         ───────────────────────────────────────────────────────────── */}
      <section id="products" className="py-24 md:py-32 border-t border-[#dad4c8]">
        <div className="container mx-auto px-4 max-w-6xl">
          <header className="max-w-2xl mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 mb-6">
              {t("suite.eyebrow")}
            </p>
            <h2 className="text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-black mb-6">
              {t("suite.title")}
            </h2>
            <p className="text-base md:text-lg leading-relaxed text-[#55534e]">
              {t("suite.description")}
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
          FOR THAI PRIVATE SCHOOLS
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

      {/* ─────────────────────────────────────────────────────────────
          CTA
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
              href="/mastery-advantage"
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
