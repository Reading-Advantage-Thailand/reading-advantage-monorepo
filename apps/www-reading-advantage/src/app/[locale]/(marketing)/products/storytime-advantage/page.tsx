import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Scale,
  Handshake,
  FileText,
  Users,
  BarChart3,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import { OverlappingSection } from "@/components/ui/overlapping-section";
import { FAQAccordion } from "@/components/ui/faq-accordion";

export const metadata: Metadata = {
  title:
    "Storytime Advantage - Complete Early Literacy Curriculum | Reading Advantage Thailand",
  description:
    "Launching in 2025: A comprehensive K-3 early literacy curriculum combining digital innovation with hands-on learning. Join the waitlist for early access.",
  openGraph: {
    title: "Storytime Advantage - The Future of Early Literacy Education",
    description:
      "Transform early literacy education with our comprehensive K-3 curriculum launching in 2025. Combining digital innovation with proven teaching methods.",
  },
};

export default async function StorytimeAdvantage() {
  const t = await getScopedI18n("pages.products.storytimeAdvantage");

  const keyFeatures = [
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
      icon: FileText,
      title: t("keyFeatures.features.1.title"),
      points: [
        t("keyFeatures.features.1.points.0"),
        t("keyFeatures.features.1.points.1"),
        t("keyFeatures.features.1.points.2"),
        t("keyFeatures.features.1.points.3"),
      ],
    },
  ];

  const teacherResources = [
    {
      icon: FileText,
      title: t("teacherTools.tools.0.title"),
      description: t("teacherTools.tools.0.description"),
    },
    {
      icon: Users,
      title: t("teacherTools.tools.1.title"),
      description: t("teacherTools.tools.1.description"),
    },
    {
      icon: BarChart3,
      title: t("teacherTools.tools.2.title"),
      description: t("teacherTools.tools.2.description"),
    },
  ];

  const faqItems = [
    {
      question: t("faq.questions.0.question"),
      answer: t("faq.questions.0.answer"),
    },
    {
      question: t("faq.questions.1.question"),
      answer: t("faq.questions.1.answer"),
    },
    {
      question: t("faq.questions.2.question"),
      answer: t("faq.questions.2.answer"),
    },
    {
      question: t("faq.questions.3.question"),
      answer: t("faq.questions.3.answer"),
    },
    {
      question: t("faq.questions.4.question"),
      answer: t("faq.questions.4.answer"),
    },
  ];

  return (
    <main className="overflow-x-hidden">
      {/* Hero Section - Inline with amber gradient */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">
        <Image
          src="/images/hero-storytime-advantage.jpg"
          alt="Digital storytelling experience"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-300 to-amber-800 opacity-90" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="container relative z-10 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-bold mb-6">
                <Sparkles className="w-4 h-4" />
                {t("hero.comingSoon")}
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                {t("hero.title")}
              </h1>
              <p className="text-xl md:text-2xl leading-relaxed mb-4 text-amber-50">
                {t("hero.subtitle")}
              </p>
              <p className="text-lg md:text-xl leading-relaxed mb-8 text-amber-100">
                {t("hero.description")}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-white text-amber-700 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-lg hover:bg-amber-50"
              >
                {t("cta.buttons.joinWaitlist")}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="lg:col-span-5 flex justify-center">
              <Image
                src="/storytime-advantage.png"
                alt="Storytime Advantage"
                width={400}
                height={400}
                className="w-full max-w-md rounded-2xl shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Full-Width Color Room (Amber) - Key Features */}
      <section className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <p className="uppercase tracking-widest text-xs font-semibold text-amber-100 mb-6 text-center">
              KEY FEATURES
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-white">
              {t("keyFeatures.heading")}
            </h2>
            <div className="grid md:grid-cols-2 gap-0 max-w-5xl mx-auto">
              {keyFeatures.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`bg-white rounded-3xl p-12 shadow-xl ${
                    index === 0 ? "relative z-10" : "-ml-6 relative z-0"
                  }`}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-md">
                    <feature.icon
                      className="w-7 h-7 text-white"
                      strokeWidth={2}
                    />
                  </div>
                  <h3 className="text-2xl font-bold mb-6 text-slate-900">
                    {feature.title}
                  </h3>
                  <ul className="space-y-4">
                    {feature.points.map((point, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-slate-600 leading-relaxed">
                          {point}
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

      {/* Asymmetric 7/5 - K-3 Curriculum */}
      <section className="bg-white py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <p className="uppercase tracking-widest text-xs font-semibold text-amber-600 mb-6">
              K-3 CURRICULUM
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7">
                <h2 className="text-4xl md:text-5xl font-bold mb-8 text-slate-900">
                  {t("coreValue.heading")}
                </h2>
                <div className="space-y-8">
                  {[
                    {
                      icon: BookOpen,
                      title: t("coreValue.features.0.title"),
                      description: t("coreValue.features.0.description"),
                    },
                    {
                      icon: Scale,
                      title: t("coreValue.features.1.title"),
                      description: t("coreValue.features.1.description"),
                    },
                    {
                      icon: Handshake,
                      title: t("coreValue.features.2.title"),
                      description: t("coreValue.features.2.description"),
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                        <item.icon className="w-6 h-6 text-white" strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2 text-slate-900">
                          {item.title}
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-5">
                <div
                  data-testid="dashed-frame"
                  className="border-2 border-dashed border-amber-400 rounded-3xl p-2"
                >
                  <Image
                    src="/images/storytime-advantage-hero.jpg"
                    alt="Storytime Advantage Classroom"
                    width={600}
                    height={400}
                    sizes="(max-width: 768px) 100vw, 40vw"
                    className="rounded-2xl w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Overlapping Section - Teacher Resources */}
      <OverlappingSection
        data-testid="overlapping-section"
        background="bg-amber-50"
        overlapAmount="-mt-20"
        topRadius="rounded-t-[40px]"
      >
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-6xl mx-auto">
            <p className="uppercase tracking-widest text-xs font-semibold text-amber-600 mb-6 text-center">
              TEACHER RESOURCES
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-slate-900">
              {t("teacherTools.heading")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {teacherResources.map((resource, index) => (
                <div
                  key={resource.title}
                  data-testid="staggered-card"
                  className={`bg-white rounded-3xl p-10 shadow-lg border border-amber-100 hover:border-amber-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${
                    index === 1 ? "mt-5" : ""
                  }`}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-md mx-auto">
                    <resource.icon
                      className="w-7 h-7 text-white"
                      strokeWidth={2}
                    />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-center text-slate-900">
                    {resource.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed text-center">
                    {resource.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </OverlappingSection>

      {/* FAQ Accordion */}
      <section className="bg-white py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <p className="uppercase tracking-widest text-xs font-semibold text-amber-600 mb-6 text-center">
            FREQUENTLY ASKED QUESTIONS
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-slate-900">
            {t("faq.heading")}
          </h2>
          <FAQAccordion
            data-testid="faq-accordion"
            variant="amber"
            items={faqItems}
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-amber-600 via-amber-600 to-amber-700 text-white py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              {t("cta.heading")}
            </h2>
            <p className="text-2xl mb-12 text-amber-100 max-w-2xl mx-auto">
              {t("cta.description")}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-white text-amber-700 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-lg"
              >
                {t("cta.buttons.joinWaitlist")}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:bg-white hover:text-amber-700"
              >
                {t("cta.buttons.learnMore")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
