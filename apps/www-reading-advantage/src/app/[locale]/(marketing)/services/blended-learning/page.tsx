import { type JSX } from "react";
import { Link } from "@/locales/navigation";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle,
  BookOpen,
  Calendar,
  Zap,
  Target,
  TrendingUp,
  GraduationCap,
} from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import HeroSection from "@/components/marketing/hero-section";
import { Button } from "@/components/ui/button";

export default async function BlendedLearning() {
  const t = await getScopedI18n("pages.blendedLearning");
  const featureIndexes = [0, 1, 2, 3, 4, 5] as const;
  const features = featureIndexes.map((featureIndex) =>
    t(`features.items.${featureIndex}`),
  );
  const challengeIndexes = [0, 1, 2] as const;
  const challenges = challengeIndexes.map((challengeIndex) =>
    t(`forTeachers.challenges.${challengeIndex}`),
  );
  const levelIndexes = [0, 1, 2, 3, 4] as const;
  const levels = levelIndexes.map((levelIndex) =>
    t(`levels.levels.${levelIndex}`),
  );
  const onboardingIndexes = [0, 1, 2] as const;
  const onboardingItems = onboardingIndexes.map((itemIndex) => ({
    icon: t(`onboarding.items.${itemIndex}.icon`),
    title: t(`onboarding.items.${itemIndex}.title`),
    description: t(`onboarding.items.${itemIndex}.description`),
  }));
  const onboardingIcons: Record<string, JSX.Element> = {
    Target: <Target className="w-8 h-8" />,
    GraduationCap: <GraduationCap className="w-8 h-8" />,
    BookOpen: <BookOpen className="w-8 h-8" />,
  };

  return (
    <main className="overflow-x-hidden">
      {/* Hero Section */}
      <HeroSection
        title={t("hero.title")}
        description={
          <>
            <h2 className="text-2xl md:text-3xl text-slate-900 mb-4 font-semibold leading-relaxed">
              {t("hero.subtitle")}
            </h2>
            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl leading-relaxed">
              {t("hero.description")}
            </p>
          </>
        }
        ctaButton={{
          text: t("hero.primaryCta"),
          href: "#overview",
          variant: "white",
          icon: <ArrowRight className="w-6 h-6" />,
        }}
        badge={{
          text: t("hero.badge"),
          icon: <Calendar className="w-4 h-4" />,
          variant: "sky",
        }}
        floatingImage={{
          src: "/images/blended-learning.png",
          alt: "Blended Learning Model",
        }}
        height="medium"
        alignment="left"
        customGradient="bg-gradient-to-br from-sky-50 via-sky-100 to-blue-100"
      />

      {/* Overview Section */}
      <section className="relative py-24 bg-white" id="overview">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div>
                <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
                  {t("overview.title")}
                </span>
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight tracking-tight">
                  {t("overview.heading")}
                </h2>
                <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                  {t("overview.description")}
                </p>
                <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                  <strong>{t("overview.strong")}</strong>{" "}
                  {t("overview.strongText")}
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-100 to-blue-100 rounded-3xl blur-3xl -translate-y-4 -translate-x-4" />
                <div className="relative bg-gradient-to-br from-sky-50 to-blue-50 rounded-3xl p-8">
                  <Image
                    src="/images/workbook-cover.png"
                    alt="Student Workbook"
                    width={400}
                    height={300}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="rounded-3xl shadow-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 bg-gradient-to-br from-sky-50 via-white to-amber-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 animate-in fade-in duration-700">
              <span className="uppercase tracking-widest text-xs font-semibold text-amber-600 mb-4 block">
                {t("features.badge")}
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                {t("features.title")}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white rounded-3xl p-8 border border-sky-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 duration-700"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CheckCircle className="w-12 h-12 text-sky-500 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {feature}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For Teachers Section */}
      <section className="relative py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div>
                <span className="uppercase tracking-widest text-xs font-semibold text-amber-600 mb-4 block">
                  {t("forTeachers.badge")}
                </span>
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight tracking-tight">
                  {t("forTeachers.title")}
                </h2>
                <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                  {t("forTeachers.description")}
                </p>
                <ul className="space-y-4 mb-8">
                  {challenges.map((challenge, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{challenge}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <Image
                  src="/images/teacher-at-board.png"
                  alt="Teacher leading classroom"
                  width={600}
                  height={400}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="rounded-3xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Levels Section */}
      <section className="relative py-24 bg-gradient-to-br from-slate-900 via-sky-900 to-blue-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
        <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-20 left-20 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-in fade-in duration-700">
            <span className="uppercase tracking-widest text-xs font-semibold text-amber-300 mb-4 block">
              {t("levels.badge")}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
              {t("levels.title")}
            </h2>
            <p className="text-xl text-sky-100 mb-12 max-w-3xl mx-auto leading-relaxed">
              {t("levels.description")}
            </p>

            {/* Level progression */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4 max-w-4xl mx-auto mb-12">
              {levels.map((level, index) => (
                <div
                  key={level}
                  className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300 hover:bg-white/20 animate-in fade-in slide-in-from-bottom-8 duration-700"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="text-3xl font-bold text-white mb-2">
                    {level}
                  </div>
                  <div className="w-12 h-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full mx-auto" />
                </div>
              ))}
            </div>

            <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-full px-6 py-4 mb-8">
              <Calendar className="w-6 h-6 text-amber-400" />
              <div className="text-left">
                <div className="text-sm text-sky-100">
                  {t("levels.availabilityBadge")}
                </div>
                <div className="text-lg font-bold text-white">
                  {t("levels.availabilityDate")}
                </div>
              </div>
            </div>

            <Button
              variant="white"
              size="lg"
              className="text-xl px-14 py-6 rounded-3xl shadow-2xl hover:shadow-white/30 hover:-translate-y-2 font-bold animate-in fade-in duration-700 delay-300"
              asChild
            >
              <Link href="/contact">
                <TrendingUp className="w-8 h-8" />
                {t("levels.ctaButton")}
                <ArrowRight className="w-8 h-8" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Onboarding Section */}
      <section className="relative py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 animate-in fade-in duration-700">
              <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
                {t("onboarding.title")}
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                {t("onboarding.subtitle")}
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                {t("onboarding.description")}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {onboardingItems.map((item, index) => (
                <div
                  key={item.title}
                  className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-3xl p-8 border border-sky-100 hover:border-sky-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-700"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    {onboardingIcons[item.icon] ?? onboardingIcons.Target}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 bg-gradient-to-br from-sky-500 via-blue-600 to-sky-700 text-white overflow-hidden">
        <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-sky-400/30 rounded-full blur-[150px]" />
        <div className="absolute bottom-20 right-20 w-[400px] h-[400px] bg-blue-400/30 rounded-full blur-[120px]" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight tracking-tight">
              {t("cta.title")}
            </h2>
            <p className="text-2xl md:text-3xl text-sky-100 leading-relaxed mb-16 max-w-3xl mx-auto">
              {t("cta.description")}
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Button
                variant="white"
                size="lg"
                className="text-xl px-14 py-6 rounded-3xl shadow-2xl hover:shadow-white/30 hover:-translate-y-2 font-bold animate-in fade-in duration-700 delay-300"
                asChild
              >
                <Link href="/contact">
                  <Zap className="w-8 h-8" />
                  {t("cta.button1")}
                  <ArrowRight className="w-8 h-8" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-xl px-14 py-6 rounded-3xl border-2 border-white text-white hover:bg-white hover:text-sky-700 font-bold"
                asChild
              >
                <Link href="/case-studies">
                  <Target className="w-8 h-8" />
                  {t("cta.button2")}
                  <ArrowRight className="w-8 h-8" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
