import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Target,
  Dumbbell,
  Clock,
  ArrowRight,
  Check,
} from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import { OverlappingSection } from "@/components/ui/overlapping-section";
import { FloatingPill } from "@/components/ui/floating-pill";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Math Advantage - Reading Advantage Thailand",
  description:
    "Revolutionary AI-enhanced math tutoring platform with personalized learning paths and advanced adaptive technology.",
  openGraph: {
    title: "Math Advantage - Reading Advantage Thailand",
    description:
      "Transform your math learning journey with our AI-enhanced tutoring platform launching in 2025.",
  },
};

export default async function MathAdvantage() {
  const t = await getScopedI18n("pages.products.mathAdvantage");

  const subjects = [
    t("subjectCoverage.subjects.0"),
    t("subjectCoverage.subjects.1"),
    t("subjectCoverage.subjects.2"),
    t("subjectCoverage.subjects.3"),
    t("subjectCoverage.subjects.4"),
    t("subjectCoverage.subjects.5"),
  ];

  const benefits = [
    {
      icon: Dumbbell,
      title: t("benefits.reasons.0.title"),
      description: t("benefits.reasons.0.description"),
    },
    {
      icon: Clock,
      title: t("benefits.reasons.1.title"),
      description: t("benefits.reasons.1.description"),
    },
    {
      icon: Target,
      title: t("benefits.reasons.2.title"),
      description: t("benefits.reasons.2.description"),
    },
    {
      icon: BarChart3,
      title: t("benefits.reasons.3.title"),
      description: t("benefits.reasons.3.description"),
    },
  ];

  const smartPoints = [
    t("keyFeatures.smartProblemGeneration.points.0"),
    t("keyFeatures.smartProblemGeneration.points.1"),
    t("keyFeatures.smartProblemGeneration.points.2"),
  ];

  return (
    <main className="overflow-x-hidden">
      {/* Hero Section — Already done, keep as-is */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">
        <Image
          src="/images/hero-math-advantage.jpg"
          alt="Interactive digital math learning environment"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-300 to-orange-800 opacity-90" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="container relative z-10 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl py-24">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-bold mb-6">
                {t("hero.comingSoon")}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
                {t("hero.title")}
              </h1>
              <p className="text-xl md:text-2xl lg:text-3xl leading-relaxed mb-8 text-orange-50">
                {t("hero.subtitle")} {t("hero.description")}
              </p>
              <Link
                href="mailto:support@reading-advantage.com?subject=Math Advantage Inquiry&body=Hi team,%0A%0AI'm interested in learning more about Math Advantage for my school/organization.%0A%0APlease provide more information about:%0A- Pricing options%0A- Implementation timeline%0A- Technical requirements%0A%0AThank you!"
                className="inline-flex items-center gap-2 bg-white text-orange-700 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-lg hover:bg-orange-50"
              >
                {t("cta.button")}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="lg:col-span-5 flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-8 duration-1000">
              <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 shadow-2xl">
                <Image
                  src="/math-advantage.png"
                  alt="Math Advantage Logo"
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

      {/* Subject Coverage — Full-Width Color Room (Orange) */}
      <section className="py-24 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className="uppercase tracking-widest text-xs font-semibold text-orange-100 mb-4 block">
              Subjects Covered
            </span>
            <h2 className="text-4xl md:text-5xl font-bold">
              {t("subjectCoverage.heading")}
            </h2>
          </div>
          <div
            data-testid="bubble-cluster"
            className="flex flex-wrap justify-center items-center gap-4 max-w-4xl mx-auto"
          >
            {subjects.map((subject, index) => {
              const sizes = ["px-8 py-5 text-lg", "px-10 py-6 text-xl", "px-6 py-4 text-base"];
              const offsets = ["-translate-y-2", "translate-y-2", "-translate-y-1", "translate-y-1", "-translate-y-3", "translate-y-0"];
              return (
                <div
                  key={subject}
                  className={`${sizes[index % sizes.length]} ${offsets[index % offsets.length]} bg-white/20 backdrop-blur-sm rounded-full font-bold border border-white/30 shadow-lg hover:bg-white/30 transition-all duration-300 hover:-translate-y-1`}
                >
                  {subject}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Smart Problem Generation — Asymmetric 7/5 */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div data-testid="deep-dive" className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center max-w-7xl mx-auto">
            {/* Text LEFT (7 cols) */}
            <div className="lg:col-span-7">
              <span className="uppercase tracking-widest text-xs font-semibold text-orange-600 mb-4 block">
                Smart Problem Generation
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                {t("keyFeatures.smartProblemGeneration.title")}
              </h2>
              <ul className="space-y-4">
                {smartPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg text-slate-600">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Illustration RIGHT (5 cols) */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-square rounded-[40px] overflow-hidden shadow-xl">
                <Image
                  src="/images/math-advantage-hero.jpg"
                  alt="Math Advantage platform showing AI-powered problem generation"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute -top-4 -right-4">
                <FloatingPill value="AI" label="Powered" variant="orange" size="sm" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits — Overlapping Section */}
      <OverlappingSection
        data-testid="overlapping-section"
        background="bg-slate-900"
        overlapAmount="-mt-20"
        topRadius="rounded-t-[40px]"
        className="py-24"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="uppercase tracking-widest text-xs font-semibold text-orange-400 mb-4 block">
              Benefits
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              {t("benefits.heading")}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <Card
                key={benefit.title}
                borderStyle={index % 2 === 0 ? "solid" : "dashed"}
                className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1"
                padding="p-8"
              >
                <CardContent className="p-0 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-7 h-7 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </OverlappingSection>

      {/* Stats — Large central stat with floating pills */}
      <section className="py-24 bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="uppercase tracking-widest text-xs font-semibold text-orange-600 mb-4 block">
              Results
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900">
              Proven Impact
            </h2>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 max-w-4xl mx-auto">
            <div data-testid="stat-pill" className="md:-translate-y-6">
              <FloatingPill
                value="3×"
                label="Faster Learning"
                variant="orange"
                size="md"
              />
            </div>
            <div className="z-10">
              <FloatingPill
                value="95%"
                label="Confidence Boost"
                variant="amber"
                size="lg"
              />
            </div>
            <div data-testid="stat-pill" className="md:translate-y-6">
              <FloatingPill
                value="24/7"
                label="AI Support"
                variant="orange"
                size="md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA — Full-width orange gradient */}
      <section className="py-24 bg-gradient-to-br from-orange-600 via-orange-700 to-amber-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t("cta.heading")}
          </h2>
          <p className="text-xl text-orange-100 max-w-2xl mx-auto mb-12">
            {t("cta.description")}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="mailto:support@reading-advantage.com?subject=Math Advantage Inquiry&body=Hi team,%0A%0AI'm interested in learning more about Math Advantage for my school/organization.%0A%0APlease provide more information about:%0A- Pricing options%0A- Implementation timeline%0A- Technical requirements%0A%0AThank you!"
              className="inline-flex items-center justify-center gap-2 bg-white text-orange-700 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-lg"
            >
              {t("cta.button")}
              <ArrowRight className="w-5 h-5" />
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:bg-white hover:text-orange-700"
            >
              <Check className="w-5 h-5" />
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
