import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Target,
  RefreshCw,
  GraduationCap,
  ArrowRight,
  Check,
  Microscope,
  Atom,
  Sparkles,
} from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import { OverlappingSection } from "@/components/ui/overlapping-section";
import { LargeImageBreak } from "@/components/ui/large-image-break";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Science Advantage - Reading Advantage Thailand",
  description:
    "Comprehensive K-12 science education platform aligned with NGSS standards. Interactive learning, adaptive curriculum, and teacher support tools.",
  openGraph: {
    title: "Science Advantage - Reading Advantage Thailand",
    description:
      "Transform K-12 science education with our comprehensive, NGSS-aligned platform launching in 2025.",
  },
};

export default async function ScienceAdvantage() {
  const t = await getScopedI18n("pages.products.scienceAdvantage");
  return (
    <main className="overflow-x-hidden">
      {/* Hero Section - Inline with rose gradient */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">
        <Image
          src="/images/hero-science-advantage.jpg"
          alt="Digital science discovery platform"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-rose-300 to-rose-800 opacity-90" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="container relative z-10 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl py-24">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-800 px-4 py-2 rounded-full text-sm font-bold mb-6">
                {t("hero.comingSoon")}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
                {t("hero.title")}
              </h1>
              <p className="text-xl md:text-2xl lg:text-3xl leading-relaxed mb-8 text-rose-50">
                {t("hero.subtitle")}
              </p>
              <p className="text-lg md:text-xl leading-relaxed mb-8 text-rose-100">
                {t("hero.description")}
              </p>
              <Link
                href="#waitlist"
                className="inline-flex items-center gap-2 bg-white text-rose-700 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-lg hover:bg-rose-50"
              >
                {t("hero.cta")}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="lg:col-span-5 flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-8 duration-1000">
              <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 shadow-2xl">
                <Image
                  src="/science-advantage.png"
                  alt="Science Advantage Logo"
                  width={350}
                  height={350}
                  className="w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 object-contain rounded-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Value Proposition — Full-Width Color Room (Rose) */}
      <section className="bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-rose-100 block mb-4">
              WHY SCIENCE ADVANTAGE
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-16">
              {t("coreValue.heading")}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card
                padding="p-12"
                className="rounded-[40px] bg-white/10 backdrop-blur-sm border-rose-200/30 text-white hover:-translate-y-2 hover:shadow-2xl"
                data-testid="value-card"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-rose-300 to-rose-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <BookOpen className="w-8 h-8 text-white" strokeWidth={2} />
                </div>
                <h3 className="text-2xl font-bold mb-4">
                  {t("coreValue.features.0.title")}
                </h3>
                <p className="text-rose-50 leading-relaxed">
                  {t("coreValue.features.0.description")}
                </p>
              </Card>
              <Card
                padding="p-12"
                className="rounded-[40px] bg-white/10 backdrop-blur-sm border-rose-200/30 text-white hover:-translate-y-2 hover:shadow-2xl"
                data-testid="value-card"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-rose-300 to-rose-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Target className="w-8 h-8 text-white" strokeWidth={2} />
                </div>
                <h3 className="text-2xl font-bold mb-4">
                  {t("coreValue.features.1.title")}
                </h3>
                <p className="text-rose-50 leading-relaxed">
                  {t("coreValue.features.1.description")}
                </p>
              </Card>
              <Card
                padding="p-12"
                className="rounded-[40px] bg-white/10 backdrop-blur-sm border-rose-200/30 text-white hover:-translate-y-2 hover:shadow-2xl"
                data-testid="value-card"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-rose-300 to-rose-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <RefreshCw className="w-8 h-8 text-white" strokeWidth={2} />
                </div>
                <h3 className="text-2xl font-bold mb-4">
                  {t("coreValue.features.2.title")}
                </h3>
                <p className="text-rose-50 leading-relaxed">
                  {t("coreValue.features.2.description")}
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Large Image Break */}
      <LargeImageBreak
        src="/images/science-advantage-hero.jpg"
        alt="Science Advantage"
        overlayPosition="center"
        data-testid="image-break"
        overlayText={
          <div>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t("coreValue.heading")}
            </h3>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed">
              {t("hero.subtitle")}
            </p>
          </div>
        }
      />

      {/* NGSS Aligned Features — Asymmetric 7/5 */}
      <section className="bg-white py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-rose-600 block mb-4">
              NGSS ALIGNED
            </span>
            <div className="grid lg:grid-cols-12 gap-12 items-start">
              <div className="lg:col-span-7">
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                  {t("keyFeatures.heading")}
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed mb-8">
                  {t("hero.description")}
                </p>
              </div>
              <div className="lg:col-span-5 space-y-8">
                {[
                  {
                    icon: BookOpen,
                    title: t("keyFeatures.features.0.title"),
                    points: [
                      t("keyFeatures.features.0.points.0"),
                      t("keyFeatures.features.0.points.1"),
                      t("keyFeatures.features.0.points.2"),
                      t("keyFeatures.features.0.points.3"),
                    ],
                  },
                  {
                    icon: RefreshCw,
                    title: t("keyFeatures.features.1.title"),
                    points: [
                      t("keyFeatures.features.1.points.0"),
                      t("keyFeatures.features.1.points.1"),
                      t("keyFeatures.features.1.points.2"),
                      t("keyFeatures.features.1.points.3"),
                    ],
                  },
                  {
                    icon: Microscope,
                    title: t("keyFeatures.features.2.title"),
                    points: [
                      t("keyFeatures.features.2.points.0"),
                      t("keyFeatures.features.2.points.1"),
                      t("keyFeatures.features.2.points.2"),
                      t("keyFeatures.features.2.points.3"),
                    ],
                  },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="bg-gradient-to-br from-rose-50 to-white rounded-3xl p-8 border border-rose-100"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
                        <feature.icon
                          className="w-6 h-6 text-white"
                          strokeWidth={2}
                        />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {feature.title}
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {feature.points.map((point, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-600 leading-relaxed">
                            {point.replace(/^[✓•]\s*/, "")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience — 2-column editorial layout */}
      <section className="bg-slate-50 py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-slate-500 block mb-4">
              BUILT FOR
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-16">
              {t("targetAudience.heading")}
            </h2>
            <div
              className="grid md:grid-cols-2 gap-8"
              data-testid="editorial-layout"
            >
              {[
                {
                  icon: GraduationCap,
                  title: t("targetAudience.audiences.0.title"),
                  points: [
                    t("targetAudience.audiences.0.points.0"),
                    t("targetAudience.audiences.0.points.1"),
                    t("targetAudience.audiences.0.points.2"),
                    t("targetAudience.audiences.0.points.3"),
                  ],
                },
                {
                  icon: Atom,
                  title: t("targetAudience.audiences.1.title"),
                  points: [
                    t("targetAudience.audiences.1.points.0"),
                    t("targetAudience.audiences.1.points.1"),
                    t("targetAudience.audiences.1.points.2"),
                    t("targetAudience.audiences.1.points.3"),
                  ],
                },
                {
                  icon: Sparkles,
                  title: t("targetAudience.audiences.2.title"),
                  points: [
                    t("targetAudience.audiences.2.points.0"),
                    t("targetAudience.audiences.2.points.1"),
                    t("targetAudience.audiences.2.points.2"),
                    t("targetAudience.audiences.2.points.3"),
                  ],
                },
              ].map((audience) => (
                <Card
                  key={audience.title}
                  padding="p-10"
                  className="bg-white border-slate-100 hover:border-rose-200 hover:shadow-xl"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-md">
                    <audience.icon
                      className="w-7 h-7 text-white"
                      strokeWidth={2}
                    />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-slate-900">
                    {audience.title}
                  </h3>
                  <ul className="space-y-3">
                    {audience.points.map((point, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-rose-500 mt-1 flex-shrink-0" />
                        <span className="text-slate-600 leading-relaxed">
                          {point.replace(/^[•]\s*/, "")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Overlapping Waitlist Card */}
      <OverlappingSection
        overlapAmount="-mt-12"
        background="bg-gradient-to-br from-white via-rose-50 to-white"
        topRadius="rounded-t-[40px]"
        data-testid="overlapping-section"
      >
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-800 px-4 py-2 rounded-full text-sm font-bold mb-6">
              <Sparkles className="w-4 h-4" />
              {t("hero.comingSoon")}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900">
              {t("waitlist.heading")}
            </h2>
            <p className="text-xl text-slate-600 mb-12 max-w-xl mx-auto">
              {t("waitlist.description")}
            </p>
            <div className="bg-white rounded-3xl shadow-xl border border-rose-100 p-8">
              <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder={t("waitlist.form.placeholder")}
                  className="flex-1 px-6 py-4 border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-lg"
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-rose-500 to-rose-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:from-rose-600 hover:to-rose-700 hover:shadow-lg hover:-translate-y-1"
                >
                  {t("waitlist.form.button")}
                </button>
              </form>
            </div>
          </div>
        </div>
      </OverlappingSection>
    </main>
  );
}
