import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Bot,
  Microscope,
  Handshake,
  Gem,
  ArrowRight,
  Sparkles,
  ClipboardCheck,
  UserCog,
  TrendingUp,
} from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import { StepFlow } from "@/components/ui/step-flow";
import { OverlappingSection } from "@/components/ui/overlapping-section";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Tutor Advantage - Reading Advantage Thailand",
  description:
    "Revolutionary AI-powered English tutoring platform launching in Thailand in 2025. Combining advanced technology with personalized instruction.",
  openGraph: {
    title: "Tutor Advantage - Reading Advantage Thailand",
    description:
      "Revolutionary AI-powered English tutoring platform launching in Thailand in 2025",
  },
};

export default async function TutorAdvantage() {
  const t = await getScopedI18n("pages.products.tutorAdvantage");

  return (
    <main className="overflow-x-hidden">
      {/* Hero Section - Inline with emerald gradient */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">
        <Image
          src="/images/hero-tutor-advantage.jpg"
          alt="AI-powered digital tutoring dashboard"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-300 to-emerald-800 opacity-90" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="container relative z-10 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl py-24">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-bold mb-6">
                <Sparkles className="w-4 h-4" />
                {t("hero.comingSoon")}
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                {t("hero.title")}
              </h1>
              <p className="text-xl md:text-2xl leading-relaxed mb-4 text-emerald-50">
                {t("hero.subtitle")}
              </p>
              <p className="text-lg md:text-xl leading-relaxed mb-8 text-emerald-100">
                {t("hero.description")}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-white text-emerald-700 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-lg hover:bg-emerald-50"
              >
                {t("cta.buttons.register")}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 shadow-2xl">
                <Image
                  src="/tutor-advantage.png"
                  alt="Tutor Advantage Logo"
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

      {/* How It Works — Full-Width Color Room (Emerald) */}
      <section className="relative py-24 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div
          className="absolute top-20 left-20 w-[500px] h-[500px] bg-emerald-400/20 rounded-full blur-[150px]"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-20 right-20 w-[400px] h-[400px] bg-emerald-300/20 rounded-full blur-[120px]"
          aria-hidden="true"
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-emerald-200 mb-4 block text-center">
              THE PROCESS
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
              How It Works
            </h2>
            <StepFlow
              data-testid="process-flow"
              variant="emerald"
              steps={[
                {
                  title: "Assess",
                  description: t("valuePropositions.features.0.points.0"),
                  icon: <ClipboardCheck className="w-6 h-6" />,
                },
                {
                  title: "Personalize",
                  description: t("valuePropositions.features.1.points.0"),
                  icon: <UserCog className="w-6 h-6" />,
                },
                {
                  title: "Progress",
                  description: t("valuePropositions.features.2.points.0"),
                  icon: <TrendingUp className="w-6 h-6" />,
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* AI-Powered Personalization — Asymmetric 5/7 Reversed */}
      <section className="bg-white py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-12 gap-12 items-center max-w-6xl mx-auto">
            <div className="lg:col-span-5 order-2 lg:order-1">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl blur-3xl -translate-y-4" />
                <div className="relative bg-white rounded-3xl shadow-2xl border border-emerald-100 p-4 rotate-[-2deg]">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                    <Image
                      src="/images/tutor-advantage-hero.jpg"
                      alt="Tutor Advantage Platform"
                      fill
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 order-1 lg:order-2">
              <span className="uppercase tracking-widest text-xs font-semibold text-emerald-600 mb-4 block">
                AI-POWERED PERSONALIZATION
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight">
                {t("valuePropositions.features.0.title")}
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                {t("valuePropositions.features.0.points.0")}
              </p>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                {t("valuePropositions.features.0.points.1")}
              </p>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                {t("valuePropositions.features.0.points.2")}
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    {t("valuePropositions.features.1.title")}
                  </h4>
                  <p className="text-sm text-slate-500">
                    {t("valuePropositions.features.1.points.0")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features — Overlapping Section */}
      <OverlappingSection
        background="bg-white"
        data-testid="overlapping-section"
      >
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-6xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-emerald-600 mb-4 block text-center">
              PLATFORM FEATURES
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-center text-slate-900 mb-16">
              {t("platformFeatures.heading")}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: t("platformFeatures.features.0.title"),
                  description: t("platformFeatures.features.0.description"),
                  padding: "p-10",
                },
                {
                  title: t("platformFeatures.features.1.title"),
                  description: t("platformFeatures.features.1.description"),
                  padding: "p-8",
                },
                {
                  title: t("platformFeatures.features.2.title"),
                  description: t("platformFeatures.features.2.description"),
                  padding: "p-12",
                },
                {
                  title: t("platformFeatures.features.3.title"),
                  description: t("platformFeatures.features.3.description"),
                  padding: "p-8",
                },
                {
                  title: t("platformFeatures.features.4.title"),
                  description: t("platformFeatures.features.4.description"),
                  padding: "p-10",
                },
                {
                  title: t("platformFeatures.features.5.title"),
                  description: t("platformFeatures.features.5.description"),
                  padding: "p-12",
                },
              ].map((feature) => (
                <Card
                  key={feature.title}
                  padding={feature.padding}
                  className="border-emerald-100 hover:border-emerald-200 hover:shadow-2xl hover:-translate-y-2 bg-gradient-to-br from-emerald-50 to-white"
                >
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
      </OverlappingSection>

      {/* Trust Signals — Floating testimonial cards */}
      <section className="relative py-24 bg-gradient-to-br from-emerald-700 via-emerald-700 to-emerald-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div
          className="absolute top-20 left-20 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[150px]"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-20 right-20 w-[400px] h-[400px] bg-emerald-400/20 rounded-full blur-[120px]"
          aria-hidden="true"
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-emerald-200 mb-4 block text-center">
              TRUSTED BY EDUCATORS
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
              {t("trustSignals.heading")}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Microscope,
                  title: t("trustSignals.items.0.title"),
                  description: t("trustSignals.items.0.description"),
                  offset: "md:-translate-y-4",
                },
                {
                  icon: Handshake,
                  title: t("trustSignals.items.1.title"),
                  description: t("trustSignals.items.1.description"),
                  offset: "md:translate-y-6",
                },
                {
                  icon: Gem,
                  title: t("trustSignals.items.2.title"),
                  description: t("trustSignals.items.2.description"),
                  offset: "md:-translate-y-2",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  data-testid="testimonial-card"
                  className={`bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 hover:border-white/30 transition-all duration-300 hover:-translate-y-2 shadow-xl ${item.offset}`}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <item.icon className="w-7 h-7 text-white" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">
                    {item.title}
                  </h3>
                  <p className="text-emerald-100 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats + CTA Combined */}
      <section
        className="relative py-24 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white overflow-hidden"
        data-testid="combined-stats-cta"
      >
        <div
          className="absolute top-20 left-20 w-[500px] h-[500px] bg-emerald-400/30 rounded-full blur-[150px]"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-20 right-20 w-[400px] h-[400px] bg-emerald-300/30 rounded-full blur-[120px]"
          aria-hidden="true"
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <span className="uppercase tracking-widest text-xs font-semibold text-emerald-200 mb-4 block">
              READY TO START?
            </span>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 mb-16">
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-bold text-white mb-2">
                  A1–B2
                </div>
                <div className="text-emerald-200 font-medium">
                  CEFR Coverage
                </div>
              </div>
              <div className="hidden md:block w-px h-20 bg-emerald-400/40" />
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-bold text-white mb-2">
                  2025
                </div>
                <div className="text-emerald-200 font-medium">
                  Launching Soon
                </div>
              </div>
              <div className="hidden md:block w-px h-20 bg-emerald-400/40" />
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-bold text-white mb-2">
                  AI
                </div>
                <div className="text-emerald-200 font-medium">
                  Powered Learning
                </div>
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t("cta.heading")}
            </h2>
            <p className="text-xl md:text-2xl mb-12 text-emerald-100 max-w-2xl mx-auto">
              {t("cta.description")}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                asChild
                variant="white"
                className="px-10 py-5 rounded-2xl font-bold text-lg"
              >
                <Link href="/contact" className="inline-flex items-center gap-2">
                  {t("cta.buttons.register")}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="px-10 py-5 rounded-2xl font-bold text-lg border-2 border-white text-white hover:bg-white hover:text-emerald-700"
              >
                <Link href="/contact">
                  {t("cta.buttons.apply")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
