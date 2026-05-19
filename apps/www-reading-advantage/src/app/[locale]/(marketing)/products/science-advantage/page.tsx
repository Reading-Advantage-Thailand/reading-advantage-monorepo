import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Target,
  ArrowRight,
  Check,
  Microscope,
  Sparkles,
  Users,
  Zap,
  Brain,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  UserCheck,
} from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import { OverlappingSection } from "@/components/ui/overlapping-section";
import { LargeImageBreak } from "@/components/ui/large-image-break";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Science Advantage - Reading Advantage Thailand",
  description:
    "NGSS-aligned K-12 science education platform with interactive lessons, AI-powered recommendations, and real-time teacher intervention alerts.",
  openGraph: {
    title: "Science Advantage - Reading Advantage Thailand",
    description:
      "Transform K-12 science education with our NGSS-aligned, AI-powered platform with real-time intervention tools.",
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
                <Sparkles className="w-4 h-4" />
                {t("hero.badge")}
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
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 bg-white text-rose-700 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-lg hover:bg-rose-50"
                >
                  {t("hero.cta")}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:bg-white/20 border border-white/20"
                >
                  {t("hero.secondaryCta")}
                </Link>
              </div>
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

      {/* Core Value Proposition */}
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
              {[
                {
                  icon: BookOpen,
                  title: t("coreValue.features.0.title"),
                  description: t("coreValue.features.0.description"),
                },
                {
                  icon: Brain,
                  title: t("coreValue.features.1.title"),
                  description: t("coreValue.features.1.description"),
                },
                {
                  icon: AlertTriangle,
                  title: t("coreValue.features.2.title"),
                  description: t("coreValue.features.2.description"),
                },
              ].map((feature) => (
                <Card
                  key={feature.title}
                  padding="p-12"
                  className="rounded-[40px] bg-white/10 backdrop-blur-sm border-rose-200/30 text-white hover:-translate-y-2 hover:shadow-2xl"
                  data-testid="value-card"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-rose-300 to-rose-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <feature.icon className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-rose-50 leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              ))}
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

      {/* Student Features */}
      <section id="features" className="bg-white py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-rose-600 block mb-4">
              FOR STUDENTS
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              {t("studentFeatures.heading")}
            </h2>
            <p className="text-xl text-slate-600 mb-16 max-w-2xl">
              {t("studentFeatures.subtitle")}
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  icon: Users,
                  title: t("studentFeatures.features.0.title"),
                  description: t("studentFeatures.features.0.description"),
                },
                {
                  icon: Microscope,
                  title: t("studentFeatures.features.1.title"),
                  description: t("studentFeatures.features.1.description"),
                },
                {
                  icon: Zap,
                  title: t("studentFeatures.features.2.title"),
                  description: t("studentFeatures.features.2.description"),
                },
                {
                  icon: Brain,
                  title: t("studentFeatures.features.3.title"),
                  description: t("studentFeatures.features.3.description"),
                },
              ].map((feature) => (
                <Card
                  key={feature.title}
                  padding="p-10"
                  className="border-slate-200 border-l-4 border-l-rose-500 bg-gradient-to-br from-rose-50 to-white hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                  data-testid="student-feature-card"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <feature.icon className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Teacher Features */}
      <section className="bg-slate-50 py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-slate-500 block mb-4">
              FOR TEACHERS
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              {t("teacherFeatures.heading")}
            </h2>
            <p className="text-xl text-slate-600 mb-16 max-w-2xl">
              {t("teacherFeatures.subtitle")}
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  icon: AlertTriangle,
                  title: t("teacherFeatures.features.0.title"),
                  description: t("teacherFeatures.features.0.description"),
                },
                {
                  icon: BarChart3,
                  title: t("teacherFeatures.features.1.title"),
                  description: t("teacherFeatures.features.1.description"),
                },
                {
                  icon: UserCheck,
                  title: t("teacherFeatures.features.2.title"),
                  description: t("teacherFeatures.features.2.description"),
                },
                {
                  icon: ClipboardList,
                  title: t("teacherFeatures.features.3.title"),
                  description: t("teacherFeatures.features.3.description"),
                },
              ].map((feature) => (
                <Card
                  key={feature.title}
                  padding="p-10"
                  className="bg-white border-slate-100 hover:border-rose-200 hover:shadow-xl transition-all duration-300"
                  data-testid="teacher-feature-card"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <feature.icon className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="bg-white py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-rose-600 block mb-4">
              PLATFORM FEATURES
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-16">
              {t("keyFeatures.heading")}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
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
                  icon: Brain,
                  title: t("keyFeatures.features.1.title"),
                  points: [
                    t("keyFeatures.features.1.points.0"),
                    t("keyFeatures.features.1.points.1"),
                    t("keyFeatures.features.1.points.2"),
                    t("keyFeatures.features.1.points.3"),
                  ],
                },
                {
                  icon: Target,
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
                  data-testid="key-feature-card"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
                      <feature.icon className="w-6 h-6 text-white" strokeWidth={2} />
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
      </section>

      {/* Final CTA */}
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
              {t("hero.badge")}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900">
              {t("cta.heading")}
            </h2>
            <p className="text-xl text-slate-600 mb-12 max-w-xl mx-auto">
              {t("cta.description")}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-lg hover:shadow-rose-500/30"
              >
                {t("cta.buttons.requestDemo")}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-white text-rose-700 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-lg border-2 border-rose-200 hover:border-rose-300"
              >
                {t("cta.buttons.contactSales")}
              </Link>
            </div>
          </div>
        </div>
      </OverlappingSection>
    </main>
  );
}
