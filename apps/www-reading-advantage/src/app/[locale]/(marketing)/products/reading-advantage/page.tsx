"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Zap,
  Mail,
  ArrowRight,
  Check,
  Monitor,
  Tablet,
  Smartphone,
  Users,
  GraduationCap,
  FileText,
} from "lucide-react";
import { useScopedI18n } from "@/locales/client";
import HeroSection from "@/components/marketing/hero-section";
import { OverlappingSection } from "@/components/ui/overlapping-section";
import { FloatingPill } from "@/components/ui/floating-pill";
import { HorizontalStrip } from "@/components/ui/horizontal-strip";

export default function ReadingAdvantage() {
  const t = useScopedI18n("pages.products.readingAdvantage");

  const games = [
    {
      title: t("games.games.0.title"),
      description: t("games.games.0.description"),
      image: t("games.games.0.image"),
    },
    {
      title: t("games.games.1.title"),
      description: t("games.games.1.description"),
      image: t("games.games.1.image"),
    },
    {
      title: t("games.games.2.title"),
      description: t("games.games.2.description"),
      image: t("games.games.2.image"),
    },
    {
      title: t("games.games.3.title"),
      description: t("games.games.3.description"),
      image: t("games.games.3.image"),
    },
  ];

  return (
    <main className="overflow-x-hidden">
      {/* Hero Section */}
      <HeroSection
        height="medium"
        alignment="left"
        title={t("hero.title")}
        description={`${t("hero.subtitle")} ${t("hero.description")}`}
        ctaButton={{
          text: t("platformFeatures.heading"),
          href: "#platform",
          variant: "white",
          icon: <ArrowRight className="w-6 h-6" />,
        }}
        floatingImage={{
          src: "/images/students-at-board.png",
          alt: "Students at interactive display board using Reading Advantage platform",
        }}
        customGradient="bg-gradient-to-br from-sky-400 to-sky-900"
        productLogo={{
          src: "/reading-advantage.jpg",
          alt: "Reading Advantage Logo",
        }}
        backgroundImage={{
          src: "/images/hero-reading-advantage.jpg",
          alt: "Student engaging with digital reading platform",
        }}
      />

      {/* Platform Features — Full-Width Color Room (Sky) */}
      <section
        className="relative py-24 bg-gradient-to-br from-sky-600 via-sky-700 to-sky-800 text-white overflow-hidden"
        id="platform"
      >
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div
          className="absolute top-20 left-20 w-[500px] h-[500px] bg-sky-400/20 rounded-full blur-[150px]"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-20 right-20 w-[400px] h-[400px] bg-blue-400/20 rounded-full blur-[120px]"
          aria-hidden="true"
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-sky-200 mb-4 block">
              PLATFORM
            </span>
            <h2 className="text-4xl md:text-5xl font-semibold text-white mb-16">
              {t("platformFeatures.heading")}
            </h2>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* Screenshots — 8 cols */}
              <div className="lg:col-span-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/10 rounded-3xl blur-3xl -translate-y-4" />
                  <div className="relative bg-white/5 backdrop-blur-sm border border-white/20 rounded-3xl p-6 md:p-8">
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Monitor className="w-6 h-6 text-sky-300" />
                        <h3 className="text-xl font-bold text-white">Desktop</h3>
                      </div>
                      <div className="relative aspect-video rounded-xl overflow-hidden">
                        <Image
                          src="/images/app-on-desktop.png"
                          alt="Reading Advantage app displayed on desktop computer screen showing student dashboard"
                          fill
                          sizes="(max-width: 1024px) 100vw, 60vw"
                          className="object-cover"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <Tablet className="w-5 h-5 text-sky-300" />
                          <h3 className="text-lg font-bold text-white">Tablet</h3>
                        </div>
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
                          <Image
                            src="/images/reading-advantage-demo.png"
                            alt="Reading Advantage app displayed on tablet device with reading exercises interface"
                            fill
                            sizes="(max-width: 768px) 50vw, 30vw"
                            className="object-contain"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <Smartphone className="w-5 h-5 text-sky-300" />
                          <h3 className="text-lg font-bold text-white">Mobile</h3>
                        </div>
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
                          <Image
                            src="/images/app-on-phone.png"
                            alt="Reading Advantage app displayed on mobile phone with personalized learning interface"
                            fill
                            sizes="(max-width: 768px) 50vw, 30vw"
                            className="object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature List — 4 cols */}
              <div className="lg:col-span-4 space-y-4">
                {[
                  {
                    title: t("platformFeatures.features.0.title"),
                    desc: t("platformFeatures.features.0.description"),
                  },
                  {
                    title: t("platformFeatures.features.1.title"),
                    desc: t("platformFeatures.features.1.description"),
                  },
                  {
                    title: t("platformFeatures.features.2.title"),
                    desc: t("platformFeatures.features.2.description"),
                  },
                  {
                    title: t("platformFeatures.features.3.title"),
                    desc: t("platformFeatures.features.3.description"),
                  },
                  {
                    title: t("platformFeatures.features.4.title"),
                    desc: t("platformFeatures.features.4.description"),
                  },
                  {
                    title: t("platformFeatures.features.5.title"),
                    desc: t("platformFeatures.features.5.description"),
                  },
                ].map((feat, index) => (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all duration-300"
                  >
                    <h4 className="font-bold text-sky-100 mb-1">
                      {feat.title}
                    </h4>
                    <p className="text-sm text-sky-200">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Overlapping Section — Blended Learning */}
      <OverlappingSection
        background="bg-sky-50"
        data-testid="overlapping-section"
      >
        <div className="container mx-auto px-4 py-24">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-7">
              <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
                BLENDED LEARNING
              </span>
              <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 mb-8 leading-tight">
                {t("blendedLearning.heading")}
              </h2>

              <div className="space-y-6 mb-12">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-sky-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {t("teacherTools.tools.0.title")}
                    </h3>
                    <p className="text-slate-600">
                      {t("teacherTools.tools.0.items.0")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-sky-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {t("blendedLearning.studentWorkbooks.title")}
                    </h3>
                    <p className="text-slate-600">
                      {t("blendedLearning.studentWorkbooks.description")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-sky-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {t("technicalHighlights.features.0.title")}
                    </h3>
                    <p className="text-slate-600">
                      {t("technicalHighlights.features.0.description")}
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href="/contact"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-10 py-5 rounded-2xl hover:from-sky-600 hover:to-blue-600 transition-all duration-300 shadow-xl hover:shadow-sky-500/30 hover:-translate-y-1 font-bold text-lg"
              >
                {t("cta.buttons.signUp")}
                <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-100 to-blue-100 rounded-3xl blur-3xl -translate-y-4 translate-x-4" />
                <div className="relative bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 rounded-3xl p-6">
                  <div className="space-y-6">
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg">
                      <Image
                        src="/images/blended-learning.png"
                        alt="Teacher demonstrating blended learning approach with Reading Advantage materials"
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg">
                      <Image
                        src="/images/workbook-cover.png"
                        alt="Reading Advantage student workbook with guided reading exercises and activities"
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Tools — Dashed border container */}
          <div className="mt-16 border-dashed border-2 border-sky-200 rounded-[40px] p-8 md:p-12 bg-white/50">
            <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
              <GraduationCap className="w-7 h-7 text-sky-600" />
              {t("teacherTools.heading")}
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-6 border border-sky-100">
                <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Check className="w-5 h-5 text-sky-600" />
                  {t("teacherTools.tools.0.title")}
                </h4>
                <ul className="space-y-2">
                  {[
                    t("teacherTools.tools.0.items.0"),
                    t("teacherTools.tools.0.items.1"),
                    t("teacherTools.tools.0.items.2"),
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-slate-600">
                      <div className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-6 border border-sky-100">
                <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Check className="w-5 h-5 text-sky-600" />
                  {t("teacherTools.tools.1.title")}
                </h4>
                <ul className="space-y-2">
                  {[
                    t("teacherTools.tools.1.items.0"),
                    t("teacherTools.tools.1.items.1"),
                    t("teacherTools.tools.1.items.2"),
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-slate-600">
                      <div className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </OverlappingSection>

      {/* Horizontal Strip — Educational Games */}
      <HorizontalStrip background="bg-white" padding="py-16" data-testid="games-strip">
        <div className="container mx-auto px-4 mb-8 w-full">
          <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-2 block">
            EDUCATIONAL GAMES
          </span>
          <h2 className="text-4xl md:text-5xl font-semibold text-slate-900">
            {t("games.heading")}
          </h2>
        </div>
        {games.map((game, index) => (
          <div
            key={game.title}
            className="snap-start flex-shrink-0 w-[300px] group relative bg-white rounded-3xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-3 hover:shadow-2xl border border-sky-100"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <div className="relative aspect-square overflow-hidden">
              <Image
                src={game.image}
                alt={game.title}
                fill
                sizes="300px"
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {game.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {game.description}
              </p>
            </div>
          </div>
        ))}
      </HorizontalStrip>

      {/* Stats as Floating Pills — Results */}
      <section className="relative py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block text-center">
              RESULTS
            </span>
            <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 mb-16 text-center">
              {t("resultsSection.heading")}
            </h2>

            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
              <FloatingPill
                value={t("resultsSection.stats.0.value")}
                label={t("resultsSection.stats.0.label")}
                variant="sky"
                size="lg"
                data-testid="stat-pill"
                className="md:-translate-y-4"
              />
              <FloatingPill
                value={t("resultsSection.stats.1.value")}
                label={t("resultsSection.stats.1.label")}
                variant="sky"
                size="md"
                data-testid="stat-pill"
                className="md:translate-y-6"
              />
              <FloatingPill
                value={t("resultsSection.stats.2.value")}
                label={t("resultsSection.stats.2.label")}
                variant="sky"
                size="lg"
                data-testid="stat-pill"
                className="md:-translate-y-2"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24 bg-gradient-to-br from-sky-500 via-blue-600 to-sky-700 text-white overflow-hidden">
        <div
          className="absolute top-20 left-20 w-[500px] h-[500px] bg-sky-400/30 rounded-full blur-[150px]"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-20 right-20 w-[400px] h-[400px] bg-blue-400/30 rounded-full blur-[120px]"
          aria-hidden="true"
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <span className="uppercase tracking-widest text-xs font-semibold text-sky-200 mb-4 block">
                GET STARTED
              </span>
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight">
                {t("cta.heading")}
              </h2>
              <p className="text-2xl text-sky-100 leading-relaxed mb-12 max-w-2xl">
                {t("cta.description")}
              </p>

              <div className="flex flex-wrap gap-4">
                <a
                  href="mailto:support@reading-advantage.com?subject=Reading Advantage Inquiry&body=Hi team,%0A%0AI'm interested in learning more about Reading Advantage for my school/organization.%0A%0APlease provide more information about:%0A- Pricing options%0A- Implementation timeline%0A- Technical requirements%0A%0AThank you!"
                  className="inline-flex items-center gap-4 bg-white text-sky-700 px-10 py-5 rounded-3xl hover:bg-sky-50 transition-all duration-300 shadow-2xl hover:shadow-white/30 hover:-translate-y-2 font-bold text-lg"
                >
                  <Mail className="w-6 h-6" />
                  {t("cta.buttons.signUp")}
                </a>

                <Link
                  href="/contact"
                  className="inline-flex items-center gap-3 border-2 border-white text-white px-10 py-5 rounded-3xl hover:bg-white hover:text-sky-700 transition-all duration-300 font-bold text-lg hover:scale-105"
                >
                  <ArrowRight className="w-6 h-6" />
                  {t("cta.buttons.freeTrial")}
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute inset-0 bg-white/10 rounded-3xl blur-3xl -translate-y-4" />
                <div className="relative bg-white/5 backdrop-blur-sm border border-white/20 rounded-3xl p-6">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                    <Image
                      src="/images/students-at-board.png"
                      alt="Students using Reading Advantage platform"
                      fill
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
