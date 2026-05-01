import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, Zap, Users } from "lucide-react";
import { PricingTable } from "@/components/pricing/pricing-table";
import HeroSection from "@/components/marketing/hero-section";
import { Button } from "@/components/ui/button";
import { getScopedI18n } from "@/locales/server";

export const metadata: Metadata = {
  title: "Reading Advantage Feature Matrix",
  description:
    "Compare Reading Advantage pricing tiers and features across different packages",
  keywords:
    "reading advantage pricing, reading program features, AI learning, language learning pricing",
  openGraph: {
    title: "Reading Advantage Price Tier Comparison",
    description:
      "Compare features and pricing across Reading Advantage subscription tiers",
    images: ["/images/og-image.jpg"],
    url: "https://reading-advantage.com/pricing",
  },
};

export default async function PricingPage() {
  const t = await getScopedI18n("pages.pricing");
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
        floatingImage={{
          src: "/images/app-on-desktop.png",
          alt: "Reading Advantage pricing dashboard on desktop showing subscription tiers",
        }}
        height="medium"
        alignment="left"
      />

      {/* Trust Signals Strip */}
      <section className="py-16 bg-sky-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white rounded-3xl p-8 shadow-lg text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Hidden Fees</h3>
              <p className="text-slate-600 text-sm">Transparent pricing with everything included</p>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-lg text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Instant Setup</h3>
              <p className="text-slate-600 text-sm">Get started in minutes, not days</p>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-lg text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Dedicated Support</h3>
              <p className="text-slate-600 text-sm">Expert help whenever you need it</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Table Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
              Pricing Plans
            </span>
            <h2 className="text-4xl font-bold text-sky-900 tracking-tight">
              Choose Your Plan
            </h2>
          </div>
          <PricingTable />
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
