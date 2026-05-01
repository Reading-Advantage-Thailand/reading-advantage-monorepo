import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Bot, User, Pencil, BarChart3, Smartphone, Globe } from "lucide-react";
import { ComparisonTable } from "@/components/features/comparison-table";
import HeroSection from "@/components/marketing/hero-section";
import { Button } from "@/components/ui/button";
import { getScopedI18n } from "@/locales/server";

export const metadata: Metadata = {
  title: "Features - Reading Advantage Thailand",
  description:
    "Compare Reading Advantage features with other leading reading programs. See how our AI-powered platform stands out.",
  keywords:
    "reading program comparison, reading advantage features, educational technology comparison",
  openGraph: {
    title: "Features - Reading Advantage Thailand",
    description:
      "Compare Reading Advantage features with other leading reading programs",
    images: ["/images/og-image.jpg"],
    url: "https://reading-advantage.com/features",
  },
};

type IndexRange = 0 | 1 | 2 | 3 | 4 | 5;
const featureIcons = [Bot, User, Pencil, BarChart3, Smartphone, Globe];

export default async function FeaturesPage() {
  const t = await getScopedI18n("pages.feature");
  return (
    <main className="overflow-x-hidden">
      <HeroSection
        title={t("hero.title")}
        description={t("hero.description")}
        ctaButton={{
          text: t("cta.button"),
          href: "/contact",
          variant: "primary",
        }}
        height="medium"
        alignment="center"
      />

      {/* Feature Highlight — Asymmetric 7/5 */}
      <section className="relative py-24 bg-gradient-to-br from-sky-600 via-sky-700 to-sky-800 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center max-w-6xl mx-auto">
            <div className="lg:col-span-7">
              <span className="uppercase tracking-widest text-xs font-semibold text-sky-200 mb-4 block">
                AI-Powered Platform
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Personalized Learning at Scale
              </h2>
              <p className="text-lg text-sky-100 leading-relaxed mb-8">
                Our advanced AI engine adapts to every learner in real time,
                generating content matched to their exact reading level,
                interests, and learning goals.
              </p>
              <Button variant="white" size="lg" asChild>
                <Link href="/contact">
                  {t("cta.button")}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-3xl blur-2xl -translate-y-4 translate-x-4" aria-hidden="true" />
                <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6">
                  <Image
                    src="/images/students-with-app.png"
                    alt="Students using Reading Advantage app"
                    width={500}
                    height={400}
                    className="rounded-2xl object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="py-24 bg-sky-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
              Platform Features
            </span>
            <h2 className="text-4xl font-bold text-sky-900 tracking-tight">
              Everything You Need
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 max-w-6xl mx-auto">
            {featureIcons.map((Icon, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-3xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-in fade-in slide-in-from-bottom-8"
              >
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-400 to-amber-400 rounded-2xl mb-6 text-white shadow-lg">
                  <Icon size={32} />
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-900">
                  {t(`features.${index as IndexRange}.title`)}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {t(`features.${index as IndexRange}.description`)}
                </p>
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
                Comparison
              </span>
              <h2 className="text-3xl font-bold text-sky-900 tracking-tight">
                How We Compare
              </h2>
            </div>
            <ComparisonTable />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-sky-800 text-sky-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-xl mb-8">{t("cta.description")}</p>
          <Button variant="white" size="lg" asChild>
            <Link href="/contact">
              {t("cta.button")}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
