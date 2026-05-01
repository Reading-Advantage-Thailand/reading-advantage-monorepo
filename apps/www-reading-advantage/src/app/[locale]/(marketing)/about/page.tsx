import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Target, Lightbulb, Heart, Shield } from "lucide-react";
import HeroSection from "@/components/marketing/hero-section";
import { Button } from "@/components/ui/button";
import { getScopedI18n } from "@/locales/server";

export const metadata: Metadata = {
  title: "About Us - Reading Advantage (Thailand)",
  description:
    "Learn about Reading Advantage Thailand's mission to transform education through AI innovation and our commitment to accessible, high-quality learning solutions.",
  keywords:
    "education technology, AI learning, Thailand education, EdTech, Reading Advantage Thailand",
  openGraph: {
    title: "About Us - Reading Advantage Thailand",
    description:
      "Discover how Reading Advantage Thailand is revolutionizing education through AI-powered learning solutions in Southeast Asia.",
    images: ["/images/og-image.jpg"],
    url: "https://reading-advantage.com/about",
  },
};

export default async function AboutPage() {
  const t = await getScopedI18n("pages.about");
  return (
    <main className="overflow-x-hidden">
      <HeroSection
        title={t("hero.title")}
        description={t("hero.description")}
        ctaButton={{
          text: t("sections.cta.button"),
          href: "/contact",
          variant: "primary",
        }}
        floatingImage={{
          src: "/images/teacher-at-board.png",
          alt: "Reading Advantage team collaborating with teachers in Thailand",
        }}
        height="medium"
        alignment="left"
      />

      {/* Introduction Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
              Introduction
            </span>
            <p className="text-lg text-slate-600 leading-relaxed">
              {t("sections.introduction.description")}
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-24 bg-sky-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
              Our Story
            </span>
            <h2 className="text-4xl font-bold mb-6 text-sky-900 tracking-tight">
              {t("sections.story.title")}
            </h2>
            <div className="prose lg:prose-lg text-slate-600">
              <p className="mb-4">{t("sections.story.paragraphs.0")}</p>
              <p className="mb-4">{t("sections.story.paragraphs.1")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision — Asymmetric 7/5 */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-12 gap-12 items-start max-w-6xl mx-auto">
            <div className="lg:col-span-7">
              <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
                Mission & Vision
              </span>
              <h2 className="text-4xl font-bold mb-6 text-sky-900 tracking-tight">
                {t("sections.mission.title")}
              </h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                {t("sections.mission.description")}
              </p>

              <h3 className="text-2xl font-bold mb-4 text-sky-900">
                {t("sections.vision.title")}
              </h3>
              <ul className="space-y-3">
                {([0, 1, 2, 3, 4] as const).map((i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-600">
                    <span className="w-2 h-2 bg-sky-500 rounded-full mt-2 flex-shrink-0" />
                    {t(`sections.vision.list.${i}`)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute inset-0 bg-sky-200/50 rounded-3xl blur-2xl -translate-y-4 translate-x-4" aria-hidden="true" />
                <div className="relative rounded-3xl overflow-hidden shadow-xl">
                  <Image
                    src="/images/about-team.jpg"
                    alt="Reading Advantage team"
                    width={600}
                    height={500}
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology & Impact Section */}
      <section className="py-24 bg-sky-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
                Technology & Impact
              </span>
              <h2 className="text-4xl font-bold text-sky-900 tracking-tight">
                Built for Results
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-3xl p-8 shadow-lg border border-sky-100">
                <h3 className="text-2xl font-bold mb-6 text-sky-900">
                  {t("sections.technology.title")}
                </h3>
                <ul className="space-y-3">
                  {([0, 1, 2, 3, 4] as const).map((i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-600">
                      <span className="w-2 h-2 bg-sky-500 rounded-full mt-2 flex-shrink-0" />
                      {t(`sections.technology.list.${i}`)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-3xl p-8 shadow-lg border border-sky-100">
                <h3 className="text-2xl font-bold mb-6 text-sky-900">
                  {t("sections.impact.title")}
                </h3>
                <ul className="space-y-3">
                  {([0, 1, 2, 3, 4] as const).map((i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-600">
                      <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                      {t(`sections.impact.list.${i}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
                Our Values
              </span>
              <h2 className="text-4xl font-bold text-sky-900 tracking-tight">
                {t("sections.values.title")}
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Target, color: "from-sky-400 to-sky-600" },
                { icon: Heart, color: "from-amber-400 to-orange-500" },
                { icon: Lightbulb, color: "from-emerald-400 to-emerald-600" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-8 bg-sky-50 rounded-3xl border border-sky-100 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg`}>
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-slate-900">
                    {t(`sections.values.list.${i as 0 | 1 | 2}.title`)}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {t(`sections.values.list.${i as 0 | 1 | 2}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Research Foundation Section */}
      <section className="py-24 bg-sky-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
              Research
            </span>
            <h2 className="text-4xl font-bold mb-6 text-sky-900 tracking-tight">
              {t("sections.research.title")}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              {t("sections.research.description")}
            </p>
          </div>
        </div>
      </section>

      {/* Big 4 Quality Protocol Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
                Quality Protocol
              </span>
              <h2 className="text-4xl font-bold mb-6 text-sky-900 tracking-tight">
                {t("sections.bigFour.title")}
              </h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
                {t("sections.bigFour.description")}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {([0, 1, 2, 3] as const).map((i) => (
                <div
                  key={i}
                  className="bg-sky-50 p-8 rounded-3xl border border-sky-100 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center mb-4 text-white shadow-md">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-slate-900">
                    {t(`sections.bigFour.list.${i}.title`)}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {t(`sections.bigFour.list.${i}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Positioning Section */}
      <section className="py-24 bg-sky-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
              Positioning
            </span>
            <h2 className="text-4xl font-bold mb-6 text-sky-900 tracking-tight">
              {t("sections.positioning.title")}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              {t("sections.positioning.description")}
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-sky-800 text-sky-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{t("sections.cta.title")}</h2>
          <p className="text-xl mb-8">{t("sections.cta.description")}</p>
          <Button variant="white" size="lg" asChild>
            <Link href="/contact">
              {t("sections.cta.button")}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
