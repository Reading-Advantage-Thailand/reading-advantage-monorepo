import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  GraduationCap,
  Code2,
  BookOpen,
  Cpu,
  Zap,
  Check,
  ArrowRight,
} from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import { OverlappingSection } from "@/components/ui/overlapping-section";
import { StepFlow } from "@/components/ui/step-flow";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "STEM Advantage - Reading Advantage Thailand",
  description:
    "Transform your STEM curriculum with our innovative 75% coding + 25% STEM integration platform, designed for modern classroom.",
  openGraph: {
    title: "STEM Advantage - Reading Advantage Thailand",
    description:
      "Comprehensive K-12 coding education platform launching in 2025.",
  },
};

export default async function StemAdvantage() {
  const t = await getScopedI18n("pages.products.stemAdvantage");
  return (
    <main className="overflow-x-hidden">
      {/* Hero Section - Inline with indigo gradient */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">
        <Image
          src="/images/hero-stem-advantage.jpg"
          alt="Digital STEM workspace"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-300 to-indigo-800 opacity-90" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="container relative z-10 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full text-sm font-bold mb-6">
                {t("hero.comingSoon")}
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                {t("hero.title")}
              </h1>
              <p className="text-xl md:text-2xl leading-relaxed mb-4 text-indigo-50">
                {t("hero.subtitle")}
              </p>
              <p className="text-lg md:text-xl leading-relaxed mb-8 text-indigo-100">
                {t("hero.description")}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-white text-indigo-700 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-lg hover:bg-indigo-50"
              >
                {t("cta.buttons.earlyAccess")}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="lg:col-span-5 flex justify-center">
              <Image
                src="/stem-advantage.png"
                alt="STEM Advantage"
                width={400}
                height={400}
                className="rounded-2xl shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Grade Level Breakdown — Full-Width Color Room (Indigo) */}
      <section className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-indigo-100 block mb-4">
              GRADE LEVELS
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-16">
              {t("gradeBreakdown.heading")}
            </h2>
            <StepFlow
              variant="indigo"
              data-testid="grade-timeline"
              steps={[
                {
                  title: t("gradeBreakdown.grades.0.grade"),
                  description: t("gradeBreakdown.grades.0.description"),
                  icon: <GraduationCap className="w-7 h-7" />,
                },
                {
                  title: t("gradeBreakdown.grades.1.grade"),
                  description: t("gradeBreakdown.grades.1.description"),
                  icon: <Code2 className="w-7 h-7" />,
                },
                {
                  title: t("gradeBreakdown.grades.2.grade"),
                  description: t("gradeBreakdown.grades.2.description"),
                  icon: <Cpu className="w-7 h-7" />,
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* 75% Coding, 25% STEM — Asymmetric 5/7 (Reversed) */}
      <section className="bg-white py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-indigo-600 block mb-4">
              75% CODING, 25% STEM
            </span>
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-full max-w-md aspect-square">
                  <Image
                    src="/images/stem-advantage-hero.jpg"
                    alt="STEM Advantage students coding and building"
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover rounded-3xl"
                  />
                </div>
              </div>
              <div className="lg:col-span-7">
                <div className="mb-8">
                  <span
                    className="text-[80px] md:text-[96px] font-bold leading-none text-indigo-600 block"
                    data-testid="oversized-stat"
                  >
                    75%
                  </span>
                  <span className="text-2xl md:text-3xl font-bold text-slate-900">
                    {t("coreFeatures.heading")}
                  </span>
                </div>
                <p className="text-lg text-slate-600 leading-relaxed mb-8">
                  {t("hero.description")}
                </p>
                <div className="space-y-6">
                  {[
                    {
                      icon: Code2,
                      title: t("coreFeatures.features.0.title"),
                      points: [
                        t("coreFeatures.features.0.points.0"),
                        t("coreFeatures.features.0.points.1"),
                        t("coreFeatures.features.0.points.2"),
                      ],
                    },
                    {
                      icon: Cpu,
                      title: t("coreFeatures.features.1.title"),
                      points: [
                        t("coreFeatures.features.1.points.0"),
                        t("coreFeatures.features.1.points.1"),
                        t("coreFeatures.features.1.points.2"),
                      ],
                    },
                    {
                      icon: BookOpen,
                      title: t("coreFeatures.features.2.title"),
                      points: [
                        t("coreFeatures.features.2.points.0"),
                        t("coreFeatures.features.2.points.1"),
                        t("coreFeatures.features.2.points.2"),
                      ],
                    },
                  ].map((feature) => (
                    <div
                      key={feature.title}
                      className="flex items-start gap-4"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                        <feature.icon
                          className="w-6 h-6 text-white"
                          strokeWidth={2}
                        />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 mb-1">
                          {feature.title}
                        </h4>
                        <p className="text-slate-600 leading-relaxed">
                          {feature.points.join(" • ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits — Overlapping Section */}
      <OverlappingSection
        overlapAmount="-mt-20"
        background="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800"
        topRadius="rounded-t-[40px]"
        data-testid="overlapping-section"
      >
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-6xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-indigo-100 block mb-4">
              BENEFITS
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-16">
              {t("benefits.heading")}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Zap,
                  title: t("benefits.groups.0.title"),
                  points: [
                    t("benefits.groups.0.points.0"),
                    t("benefits.groups.0.points.1"),
                    t("benefits.groups.0.points.2"),
                  ],
                  borderStyle: "solid" as const,
                },
                {
                  icon: BookOpen,
                  title: t("benefits.groups.1.title"),
                  points: [
                    t("benefits.groups.1.points.0"),
                    t("benefits.groups.1.points.1"),
                    t("benefits.groups.1.points.2"),
                  ],
                  borderStyle: "dashed" as const,
                },
                {
                  icon: Cpu,
                  title: t("benefits.groups.2.title"),
                  points: [
                    t("benefits.groups.2.points.0"),
                    t("benefits.groups.2.points.1"),
                    t("benefits.groups.2.points.2"),
                  ],
                  borderStyle: "solid" as const,
                },
              ].map((group) => (
                <Card
                  key={group.title}
                  borderStyle={group.borderStyle}
                  padding="p-10"
                  className="bg-white/10 backdrop-blur-sm border-indigo-200/30 text-white hover:-translate-y-1 hover:shadow-xl"
                  data-testid="benefit-card"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <group.icon
                      className="w-7 h-7 text-white"
                      strokeWidth={2}
                    />
                  </div>
                  <h3 className="text-xl font-bold mb-4">{group.title}</h3>
                  <ul className="space-y-3">
                    {group.points.map((point, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-indigo-300 mt-1 flex-shrink-0" />
                        <span className="text-indigo-50 leading-relaxed">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </OverlappingSection>

      {/* Technical Requirements */}
      <section className="bg-white py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-slate-500 block mb-4">
              TECHNICAL REQUIREMENTS
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-12">
              {t("technicalRequirements.heading")}
            </h2>
            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl p-10 border border-indigo-100">
              <ul className="space-y-6">
                {[
                  t("technicalRequirements.points.0"),
                  t("technicalRequirements.points.1"),
                  t("technicalRequirements.points.2"),
                  t("technicalRequirements.points.3"),
                ].map((requirement, i) => (
                  <li key={i} className="flex items-center gap-4 text-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                      <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    </div>
                    <span className="text-slate-700">{requirement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 text-white py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              {t("cta.heading")}
            </h2>
            <p className="text-xl md:text-2xl mb-12 text-indigo-100 max-w-2xl mx-auto">
              {t("cta.description")}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-lg"
              >
                {t("cta.buttons.earlyAccess")}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:bg-white hover:text-indigo-700"
              >
                {t("cta.buttons.partnerships")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
