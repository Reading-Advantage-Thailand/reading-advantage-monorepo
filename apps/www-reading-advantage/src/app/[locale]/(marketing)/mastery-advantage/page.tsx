import { Link } from "@/locales/navigation";
import { Mail } from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import { Button } from "@/components/ui/button";
import { MasteryAdvantageGraph } from "@/components/marketing/mastery-advantage-graph";
import { graphLabelsFrom } from "@/components/marketing/mastery-graph-labels";
import { MasteryHeroVideo } from "@/components/marketing/mastery-hero-video";
import {
  MasteryPathPanel,
  MasteryProgressPanel,
  MasteryReviewPanel,
} from "@/components/marketing/mastery-panels";
import { SectionHeader } from "@/components/marketing/section-header";
import { siteLogos, siteVideos } from "@/lib/site-assets";
import { buildMarketingMetadata } from "@/lib/seo";
import type { Metadata } from "next";

/**
 * Builds metadata for the localized Mastery Advantage route.
 * @param params The locale route parameters.
 * @returns The localized route metadata.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getScopedI18n("pages.masteryAdvantage");
  const title = t("hero.title");
  const description = t("hero.description");

  return buildMarketingMetadata({
    description,
    locale,
    path: "/mastery-advantage",
    title,
  });
}

/**
 * Renders the localized Mastery Advantage marketing page.
 * @returns The localized Mastery Advantage page.
 */
export default async function MasteryAdvantagePage() {
  const t = await getScopedI18n("pages.masteryAdvantage");

  const states = {
    mastered: t("states.mastered"),
    here: t("states.here"),
    ready: t("states.ready"),
    locked: t("states.locked"),
  };

  const pillars = [
    { title: t("technicalOverview.pillars.kst.title"), description: t("technicalOverview.pillars.kst.description") },
    { title: t("technicalOverview.pillars.fsrs.title"), description: t("technicalOverview.pillars.fsrs.description") },
    { title: t("technicalOverview.pillars.edgeCalibration.title"), description: t("technicalOverview.pillars.edgeCalibration.description") },
    { title: t("technicalOverview.pillars.placement.title"), description: t("technicalOverview.pillars.placement.description") },
    { title: t("technicalOverview.pillars.proficiency.title"), description: t("technicalOverview.pillars.proficiency.description") },
  ];

  const runs = [
    {
      key: "codecamp",
      logo: siteLogos.codecamp.color,
      logoAlt: t("powersEveryProduct.cards.codecamp.logoAlt"),
      status: t("powersEveryProduct.cards.codecamp.status"),
      description: t("powersEveryProduct.cards.codecamp.description"),
      badge: "bg-emerald-100 text-emerald-900",
      bar: "bg-[#22c55e]",
    },
    {
      key: "primary",
      logo: siteLogos.primary.color,
      logoAlt: t("powersEveryProduct.cards.primary.logoAlt"),
      status: t("powersEveryProduct.cards.primary.status"),
      description: t("powersEveryProduct.cards.primary.description"),
      badge: "bg-amber-100 text-amber-900",
      bar: "bg-[#fbbf24]",
    },
    {
      key: "reading",
      logo: siteLogos.reading.color,
      logoAlt: t("powersEveryProduct.cards.reading.logoAlt"),
      status: t("powersEveryProduct.cards.reading.status"),
      description: t("powersEveryProduct.cards.reading.description"),
      badge: "bg-slate-200 text-slate-800",
      bar: "bg-[#0c1437]",
    },
  ];

  const graphLabels = graphLabelsFrom((key, values) => t(key as never, values as never));

  const steps = ["lesson", "tag", "graph"] as const;

  return (
    <main className="overflow-x-hidden bg-[#faf9f7] text-black">
      {/* HERO with muted looping background video */}
      <section className="relative isolate overflow-hidden bg-[#0c1437] pb-24 pt-32 text-white md:pb-32 md:pt-44">
        <MasteryHeroVideo
          src={siteVideos.masteryBloom.src}
          poster={siteVideos.masteryBloom.poster}
          playLabel={t("video.play")}
          pauseLabel={t("video.pause")}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#0c1437] via-[#0c1437]/85 to-[#0c1437]/30" />
        <div className="container relative z-10 mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <p className="mb-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#fbbf24]">{t("hero.eyebrow")}</p>
            <h1 className="mb-8 text-5xl font-semibold leading-[1.02] tracking-[-0.03em] text-white md:text-6xl lg:text-7xl">
              {t("hero.title")}
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-[#dbe2ff] md:text-xl">{t("hero.description")}</p>
          </div>
        </div>
      </section>

      {/* WHAT'S NEXT */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <SectionHeader
                eyebrow={t("adaptivePath.eyebrow")}
                title={t("adaptivePath.title")}
                description={t("adaptivePath.description")}
              />
            </div>
            <div className="lg:col-span-6">
              <MasteryPathPanel label={t("panels.path.label")} caption={t("panels.path.caption")} states={states} />
            </div>
          </div>
        </div>
      </section>

      {/* REVIEW AT THE RIGHT TIME */}
      <section className="border-y border-[#dad4c8] bg-white py-24 md:py-32">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="order-2 lg:order-1 lg:col-span-6">
              <MasteryReviewPanel
                label={t("panels.review.label")}
                caption={t("panels.review.caption")}
                states={states}
                axisMemory={t("panels.review.axisMemory")}
                axisTime={t("panels.review.axisTime")}
                reviewDue={t("panels.review.reviewDue")}
              />
            </div>
            <div className="order-1 lg:order-2 lg:col-span-6">
              <SectionHeader
                eyebrow={t("spacedRepetition.eyebrow")}
                title={t("spacedRepetition.title")}
                description={t("spacedRepetition.description")}
              />
            </div>
          </div>
        </div>
      </section>

      {/* EXPLORE THE GRAPH */}
      <section className="border-y border-[#dad4c8] bg-white py-24 md:py-32">
        <div className="container mx-auto max-w-5xl px-4">
          <SectionHeader
            eyebrow={t("explorer.eyebrow")}
            title={t("explorer.title")}
            description={t("explorer.description")}
            className="mb-10"
          />
          <div className="overflow-hidden rounded-3xl border border-[#dad4c8] shadow-[0_24px_60px_-24px_rgba(12,20,55,0.35)]">
            <MasteryAdvantageGraph interactive labels={graphLabels} className="w-full" />
          </div>
        </div>
      </section>

      {/* PROGRESS YOU CAN SEE */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <SectionHeader
                eyebrow={t("progress.eyebrow")}
                title={t("progress.title")}
                description={t("progress.description")}
              />
            </div>
            <div className="lg:col-span-6">
              <MasteryProgressPanel
                label={t("panels.progress.label")}
                caption={t("panels.progress.caption")}
                states={states}
                example={t("panels.progress.example")}
                skills={[
                  t("panels.progress.skills.a"),
                  t("panels.progress.skills.b"),
                  t("panels.progress.skills.c"),
                  t("panels.progress.skills.d"),
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* HOW A LESSON IS TAGGED */}
      <section className="border-y border-[#dad4c8] bg-white py-24 md:py-32">
        <div className="container mx-auto max-w-6xl px-4">
          <SectionHeader
            eyebrow={t("tagged.eyebrow")}
            title={t("tagged.title")}
            description={t("tagged.description")}
            className="mb-14"
          />
          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step} className="relative rounded-2xl border border-[#dad4c8] bg-[#faf9f7] p-7">
                <span className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#0c1437] text-sm font-semibold text-[#fbbf24]">
                  {i + 1}
                </span>
                <h3 className="mb-3 text-xl font-semibold tracking-tight text-black">{t(`tagged.steps.${step}.title`)}</h3>
                <p className="text-sm leading-relaxed text-[#55534e]">{t(`tagged.steps.${step}.description`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* TECHNICAL OVERVIEW */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto max-w-6xl px-4">
          <SectionHeader
            eyebrow={t("technicalOverview.eyebrow")}
            title={t("technicalOverview.title")}
            description={t("technicalOverview.description")}
            className="mb-16"
          />
          <ol className="grid gap-px overflow-hidden rounded-2xl border border-[#dad4c8] bg-[#dad4c8] md:grid-cols-2 lg:grid-cols-6">
            {pillars.map((item, i) => (
              <li
                key={item.title}
                className={`flex flex-col gap-4 bg-white p-8 ${i < 3 ? "lg:col-span-2" : "lg:col-span-3"} ${i === 4 ? "md:col-span-2" : ""}`}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">0{i + 1}</span>
                <h3 className="text-xl font-semibold tracking-tight text-black">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[#55534e]">{item.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* WHERE IT RUNS */}
      <section className="border-y border-[#dad4c8] bg-white py-24 md:py-32">
        <div className="container mx-auto max-w-6xl px-4">
          <SectionHeader
            eyebrow={t("powersEveryProduct.eyebrow")}
            title={t("powersEveryProduct.title")}
            description={t("powersEveryProduct.description")}
            className="mb-14"
          />
          <ul className="m-0 grid list-none gap-6 p-0 md:grid-cols-3">
            {runs.map((run) => (
              <li key={run.key} className="flex flex-col overflow-hidden rounded-2xl border border-[#dad4c8] bg-[#faf9f7]">
                <div className={`h-1.5 ${run.bar}`} />
                <div className="flex flex-1 flex-col gap-5 p-7">
                  <div className="flex items-center justify-between gap-3">
                    <img src={run.logo} alt={run.logoAlt} className="h-12 w-auto max-w-[60%]" />
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${run.badge}`}>{run.status}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-[#55534e]">{run.description}</p>
                </div>
              </li>
            ))}
          </ul>
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

          <Button
            size="lg"
            variant="default"
            asChild
            className="bg-white text-sky-900 hover:bg-sky-50"
          >
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
