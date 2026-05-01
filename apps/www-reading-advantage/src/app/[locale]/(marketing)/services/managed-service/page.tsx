import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Users,
  Zap,
  BookOpen,
} from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import HeroSection from "@/components/marketing/hero-section";
import { Button } from "@/components/ui/button";

export default async function ManagedService() {
  const t = await getScopedI18n("pages.managedService");

  const managedFeatures = [
    t("features.items.0"),
    t("features.items.1"),
    t("features.items.2"),
    t("features.items.3"),
    t("features.items.4"),
  ];

  const benefitItems = [
    t("benefits.items.0"),
    t("benefits.items.1"),
    t("benefits.items.2"),
    t("benefits.items.3"),
  ];

  return (
    <main>
      {/* Hero */}
      <HeroSection
        title={
          <div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-slate-900 leading-tight mb-4 tracking-tight">
              {t("hero.title")}
            </h1>
            <h2 className="text-2xl md:text-3xl text-sky-700 font-semibold leading-relaxed">
              {t("hero.subtitle")}
            </h2>
          </div>
        }
        description={
          <p className="text-xl md:text-2xl lg:text-3xl leading-relaxed text-slate-600">
            {t("hero.description")}
          </p>
        }
        ctaButton={{
          text: t("hero.primaryCta"),
          href: "#overview",
          variant: "white",
          icon: <ArrowRight className="w-5 h-5" />,
        }}
        badge={{
          text: t("hero.badge"),
          icon: <Calendar className="w-5 h-5" />,
          variant: "amber",
        }}
        floatingImage={{
          src: "/images/teacher-and-dashboard.png",
          alt: t("images.dashboardAlt"),
        }}
        height="medium"
        alignment="left"
        customGradient="bg-gradient-to-br from-sky-50 via-white to-amber-50"
      />

      {/* Overview — Image left, Features right */}
      <section className="py-24 bg-white" id="overview">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16">
            {/* Left — Image & Overview */}
            <div>
              <Image
                src="/images/teacher-assisting-students.png"
                alt={t("images.teacherAssistAlt")}
                width={560}
                height={420}
                className="rounded-3xl shadow-xl mb-8"
              />

              <span className="uppercase tracking-widest text-xs font-semibold text-sky-600">
                {t("overview.badge")}
              </span>
              <h2 className="text-3xl font-bold text-slate-900 mt-2 mb-4 tracking-tight">
                {t("overview.title")}
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                {t("overview.description")}
              </p>
              <p className="text-slate-600 leading-relaxed mb-6">
                <strong>{t("overview.strong")}</strong>{" "}
                {t("overview.strongText")}
              </p>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{t("overview.items.0")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{t("overview.items.1")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{t("overview.items.2")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{t("overview.items.3")}</span>
                </li>
              </ul>
            </div>

            {/* Right — Features List */}
            <div>
              <span className="uppercase tracking-widest text-xs font-semibold text-amber-600">
                {t("features.badge")}
              </span>
              <h2 className="text-3xl font-bold text-slate-900 mt-2 mb-8 tracking-tight">
                {t("features.title")}
              </h2>

              <div className="flex flex-col gap-4">
                {managedFeatures.map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 bg-white rounded-3xl p-5 border border-sky-100"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">{feature}</h4>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-sky-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <span className="uppercase tracking-widest text-xs font-semibold text-amber-600">
                {t("benefits.badge")}
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-2 mb-8 tracking-tight">
                {t("benefits.title")}
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {t("benefits.description")}
              </p>
              <ul className="space-y-4">
                {benefitItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <Image
                src="/images/small-group.png"
                alt={t("images.smallGroupAlt")}
                width={560}
                height={420}
                className="rounded-3xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <span className="uppercase tracking-widest text-xs font-semibold text-amber-300">
            {t("roadmap.badge")}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-8 tracking-tight">
            {t("roadmap.title")}
          </h2>
          <p className="text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed">
            {t("roadmap.description")}
          </p>

          <div className="inline-flex items-center gap-4 bg-white/10 border border-white/30 rounded-3xl px-8 py-6 mb-12">
            <Calendar className="w-8 h-8 text-amber-400" />
            <div className="text-left">
              <div className="text-sm text-sky-100">{t("roadmap.targetLabel")}</div>
              <div className="text-2xl font-bold">{t("roadmap.targetDate")}</div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <Button variant="white" size="lg" className="text-xl px-14 py-6 rounded-3xl font-bold" asChild>
              <Link href="/services">
                <BookOpen className="w-8 h-8" />
                {t("cta.button1")}
                <ArrowRight className="w-8 h-8" />
              </Link>
            </Button>
            <Button variant="ghost" size="lg" className="text-xl px-14 py-6 rounded-3xl border-2 border-white text-white hover:bg-white hover:text-slate-900 font-bold" asChild>
              <Link href="/contact">
                <Zap className="w-8 h-8" />
                {t("cta.button2")}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
