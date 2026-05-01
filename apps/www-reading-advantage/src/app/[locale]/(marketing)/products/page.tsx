import B2BSolutions from "@/components/products/b2b-solutions";
import B2CSolutions from "@/components/products/b2c-solutions";
import TutorAdvantage from "@/components/products/tutor-advantage";
import HeroSection from "@/components/marketing/hero-section";
import { getScopedI18n } from "@/locales/server";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookMarked, GraduationCap, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Our Products - Reading Advantage Thailand",
  description:
    "Comprehensive curriculum solutions for schools and specialized programs for individual learners, powered by advanced AI technology.",
};

export default async function ProductsPage() {
  const t = await getScopedI18n("pages.products.overview");

  const gradeBands = [
    {
      key: "storytime",
      href: "/products/storytime-advantage",
      icon: BookMarked,
      bgColor: "from-amber-50 to-amber-100",
      badgeColor: "bg-amber-500",
      title: t("gradeBands.storytime.title"),
      gradeRange: t("gradeBands.storytime.gradeRange"),
      description: t("gradeBands.storytime.description"),
      ctaLabel: t("gradeBands.storytime.ctaLabel"),
    },
    {
      key: "primary",
      href: "/products/primary-advantage",
      icon: GraduationCap,
      bgColor: "from-orange-50 to-orange-100",
      badgeColor: "bg-orange-500",
      title: t("gradeBands.primary.title"),
      gradeRange: t("gradeBands.primary.gradeRange"),
      description: t("gradeBands.primary.description"),
      ctaLabel: t("gradeBands.primary.ctaLabel"),
    },
    {
      key: "reading",
      href: "/products/reading-advantage",
      icon: BookOpen,
      bgColor: "from-sky-50 to-sky-100",
      badgeColor: "bg-sky-500",
      title: t("gradeBands.reading.title"),
      gradeRange: t("gradeBands.reading.gradeRange"),
      description: t("gradeBands.reading.description"),
      ctaLabel: t("gradeBands.reading.ctaLabel"),
    },
  ];

  return (
    <main className="flex-1">
      {/* Hero - Warm gradient with floating elements */}
      <HeroSection
        title={t("hero.title")}
        description={t("hero.description")}
        ctaButton={{
          text: t("cta.viewProgram"),
          href: "#products",
          variant: "primary",
          icon: <ArrowRight className="w-5 h-5" />,
        }}
        floatingImage={{
          src: "/images/small-group.png",
          alt: "Group of students using Reading Advantage platform on tablets in collaborative learning session",
        }}
        height="medium"
        alignment="left"
      />

      {/* Grade Bands - Enhanced cards with warm themes */}
      <section
        id="products"
        className="relative py-24 warm-section overflow-hidden"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid gap-8 md:grid-cols-3">
            {gradeBands.map((band, index) => (
              <div
                key={band.key}
                className="group h-full animate-in fade-in slide-in-from-bottom-8 duration-700"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div
                  className={`h-full p-8 rounded-2xl bg-gradient-to-br ${band.bgColor} warm-card border-0`}
                >
                  {/* Icon with glow */}
                  <div
                    className={`w-16 h-16 ${band.badgeColor} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <band.icon className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>

                  {/* Grade range badge */}
                  <div className="text-sm font-semibold uppercase tracking-wide text-slate-600 mb-3">
                    {band.gradeRange}
                  </div>

                  {/* Title */}
                  <h3 className="text-3xl font-bold mb-4 text-slate-900 group-hover:text-sky-700 transition-colors">
                    {band.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-700 mb-8 leading-relaxed flex-grow">
                    {band.description}
                  </p>

                  {/* CTA Link */}
                  <Link
                    href={band.href}
                    className="inline-flex items-center gap-2 font-semibold text-sky-600 hover:text-sky-800 group-hover:gap-3 transition-all duration-300"
                  >
                    <span>{band.ctaLabel}</span>
                    <ArrowRight
                      className="h-5 w-5 group-hover:translate-x-1 transition-transform"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <B2BSolutions />
      <B2CSolutions />
      <TutorAdvantage />
    </main>
  );
}
