import Image from "next/image";
import { Link } from "@/locales/navigation";
import HeroSection from "@/components/marketing/hero-section";
import { OverlappingSection } from "@/components/ui/overlapping-section";
import { FloatingPill } from "@/components/ui/floating-pill";
import { StepFlow } from "@/components/ui/step-flow";
import { getScopedI18n } from "@/locales/server";
import { Mail, BookOpen, Target, Zap } from "lucide-react";
import { MarketingSvg } from "@/components/marketing/marketing-svg";
import { ExperienceDemo } from "@/components/marketing/experience-demo";
import type { Locale } from "@/config/locale-config";
import { buildMarketingMetadata } from "@/lib/seo";
import type { Metadata } from "next";

/**
 * Builds metadata for the public Primary Advantage route.
 * @param props The locale route parameters.
 * @returns The Primary Advantage route metadata.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getScopedI18n("pages.products.primaryAdvantage");
  const title = t("hero.title");
  const description = t("hero.description");

  return buildMarketingMetadata({
    description,
    locale,
    path: "/products/primary-advantage",
    title,
  });
}

/**
 * Renders the public Primary Advantage page.
 * @param props The locale route parameters.
 * @returns The rendered Primary Advantage page.
 */
export default async function PrimaryAdvantage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getScopedI18n("pages.products.primaryAdvantage");

  const features = [
    {
      icon: BookOpen,
      title: t("keyFeatures.features.0.title"),
      items: [
        t("keyFeatures.features.0.items.0"),
        t("keyFeatures.features.0.items.1"),
        t("keyFeatures.features.0.items.2"),
      ],
    },
    {
      icon: Target,
      title: t("keyFeatures.features.1.title"),
      items: [
        t("keyFeatures.features.1.items.0"),
        t("keyFeatures.features.1.items.1"),
        t("keyFeatures.features.1.items.2"),
      ],
    },
    {
      icon: Zap,
      title: t("keyFeatures.features.2.title"),
      items: [
        t("keyFeatures.features.2.items.0"),
        t("keyFeatures.features.2.items.1"),
        t("keyFeatures.features.2.items.2"),
      ],
    },
  ];

  const platformFeatures = [
    {
      image: "/images/reading-advantage/choose-your-article.png",
      title: t("platformFeatures.features.0.title"),
      description: t("platformFeatures.features.0.description"),
    },
    {
      image: "/images/reading-advantage/language-selector-en-th-zh-vn.png",
      title: t("platformFeatures.features.1.title"),
      description: t("platformFeatures.features.1.description"),
    },
    {
      image: "/images/reading-advantage/read-article-and-chat-with-ai.png",
      title: t("platformFeatures.features.2.title"),
      description: t("platformFeatures.features.2.description"),
    },
    {
      image: "/images/reading-advantage/order-sentence-activity.png",
      title: t("platformFeatures.features.3.title"),
      description: t("platformFeatures.features.3.description"),
    },
    {
      image: "/images/reading-advantage/order-words-activity.png",
      title: t("platformFeatures.features.4.title"),
      description: t("platformFeatures.features.4.description"),
    },
    {
      image: "/images/reading-advantage/SRS-flashcard-activity.png",
      title: t("platformFeatures.features.5.title"),
      description: t("platformFeatures.features.5.description"),
    },
  ];

  const cefrSteps = [
    {
      title: "Pre-A1",
      description: t("cefrSection.levels.0.description"),
    },
    {
      title: "A1",
      description: t("cefrSection.levels.1.description"),
    },
    {
      title: "A2",
      description: t("cefrSection.levels.2.description"),
    },
  ];

  return (
    <main className="min-h-screen bg-sky-50">
      {/* Hero Section */}
      <HeroSection
        title={t("hero.title")}
        description={`${t("hero.subtitle")} ${t("hero.description")}`}
        ctaButton={{
          text: t("cta.buttons.signUp"),
          href: "mailto:support@reading-advantage.com?subject=Primary Advantage Inquiry&body=Hi team,%0A%0AI'm interested in learning more about Primary Advantage for my school/organization.%0A%0APlease provide more information about:%0A- Blended Learning and App-Only options%0A- Technical requirements%0A%0AThank you!",
          variant: "primary",
          icon: <Mail className="w-5 h-5" />,
        }}
        height="medium"
        alignment="left"
        floatingImage={{
          src: "/primary-advantage logo.png",
          alt: "Primary Advantage Logo",
        }}
        customGradient="bg-gradient-to-br from-cyan-400 to-cyan-800"
        productLogo={{
          src: "/primary-advantage logo.png",
          alt: "Primary Advantage Logo",
        }}
        backgroundImage={{
          src: "/images/hero-primary-advantage.jpg",
          alt: "Children using English learning apps",
        }}
      />

      {/* Experience Primary Advantage — the embedded game demo */}
      <section className="py-24 bg-sky-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-cyan-800 mb-4 block">
              {t("experience.eyebrow")}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {t("experience.heading")}
            </h2>
            <p className="text-base md:text-lg leading-relaxed text-site-body">
              {t("experience.description")}
            </p>
          </div>
          <ExperienceDemo
            text={{
              play: t("experience.play"),
              fullscreen: t("experience.fullscreen"),
              hint: t("experience.hint"),
              frameTitle: t("experience.frameTitle"),
              posterAlt: t("experience.posterAlt"),
            }}
          />
        </div>
      </section>

      {/* Adaptive Learning Path — SVG Visualization */}
      <section className="py-24 bg-white border-y border-site-border">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-5">
              <span className="uppercase tracking-widest text-xs font-semibold text-cyan-800 mb-4 block">
                {t("adaptiveEngine.eyebrow")}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                {t("adaptiveEngine.heading")}
              </h2>
              <p className="text-base md:text-lg leading-relaxed text-site-body">
                {t("adaptiveEngine.description")}
              </p>
            </div>
            <div className="lg:col-span-7">
              <div className="relative rounded-3xl overflow-hidden border border-site-border bg-white shadow-lg">
                <MarketingSvg
                  baseName="ra-marketing-primary-advantage"
                  locale={locale as Locale}
                  className="w-full h-auto"
                  alt={t("adaptiveEngine.alt")}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CEFR Aligned — Full-Width Color Room */}
      <section className="py-24 bg-gradient-to-r from-cyan-400 via-cyan-600 to-cyan-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className="uppercase tracking-widest text-xs font-semibold text-cyan-100 mb-4 block">
              {t("eyebrows.curriculumAlignment")}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold">
              {t("cefrSection.heading")}
            </h2>
            <p className="text-lg text-cyan-100 mt-4 max-w-2xl mx-auto">
              {t("cefrSection.description")}
            </p>
          </div>
          <div data-testid="cefr-timeline" className="max-w-5xl mx-auto">
            <StepFlow steps={cefrSteps} variant="cyan" />
          </div>
        </div>
      </section>

      {/* Key Features — Asymmetric 5/7 Reversed */}
      <section className="py-24 bg-sky-50">
        <div className="container mx-auto px-4">
          <div
            data-testid="reversed-split"
            className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center max-w-7xl mx-auto"
          >
            {/* Image LEFT (5 cols) */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-4/3 rounded-panel overflow-hidden shadow-xl">
                <Image
                  src="/images/primary-advantage-hero.jpg"
                  alt="Primary Advantage"
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>
              {/* Floating feature badges */}
              <div className="absolute -top-4 -right-4 animate-in fade-in zoom-in duration-700">
                <FloatingPill
                  value="1-9"
                  label={t("cefrLevels.grades")}
                  variant="cyan"
                  size="sm"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 animate-in fade-in zoom-in duration-700 delay-150">
                <FloatingPill
                  value="CEFR"
                  label={t("cefrLevels.aligned")}
                  variant="sky"
                  size="sm"
                />
              </div>
            </div>

            {/* Text RIGHT (7 cols) */}
            <div className="lg:col-span-7">
              <span className="uppercase tracking-widest text-xs font-semibold text-cyan-800 mb-4 block">
                {t("eyebrows.keyFeatures")}
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8">
                {t("keyFeatures.heading")}
              </h2>
              <div className="space-y-8">
                {features.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {feature.title}
                      </h3>
                      <ul className="space-y-1">
                        {feature.items.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2 text-site-body"
                          >
                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform in Action — Overlapping Section */}
      <OverlappingSection
        data-testid="overlapping-section"
        background="bg-white"
        overlapAmount="-mt-20"
        topRadius="rounded-t-[40px]"
        className="py-24"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="uppercase tracking-widest text-xs font-semibold text-cyan-800 mb-4 block">
              {t("eyebrows.platformInAction")}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900">
              {t("platformFeatures.heading")}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {platformFeatures.map((feature, index) => (
              <div
                key={feature.title}
                className={`relative aspect-4/3 rounded-3xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  index % 2 === 0 ? "-rotate-2" : "rotate-2"
                }`}
              >
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white font-bold text-sm md:text-base">
                    {feature.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </OverlappingSection>

      {/* Methodology note */}
      <section className="py-24 bg-gradient-to-br from-cyan-50 to-sky-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="uppercase tracking-widest text-xs font-semibold text-cyan-800 mb-4 block">
              {t("eyebrows.impact")}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900">
              {t("resultsSection.heading")}
            </h2>
          </div>
          <p className="max-w-3xl mx-auto text-center text-lg leading-relaxed text-site-body">
            {t("resultsSection.description")}
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-cyan-600 via-cyan-600 to-cyan-800 text-white relative overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t("cta.heading")}
          </h2>
          <p className="text-xl text-cyan-100 max-w-2xl mx-auto mb-12">
            {t("cta.description")}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <a
              href="mailto:support@reading-advantage.com?subject=Primary Advantage Inquiry&body=Hi team,%0A%0AI'm interested in learning more about Primary Advantage for my school/organization.%0A%0APlease provide more information about:%0A- Blended Learning and App-Only options%0A- Technical requirements%0A%0AThank you!"
              className="bg-white hover:bg-cyan-50 text-cyan-800 px-10 py-4 rounded-2xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-xl inline-flex items-center justify-center gap-3"
            >
              {t("cta.buttons.signUp")}
              <Mail className="w-5 h-5" />
            </a>
            <Link
              href="/contact"
              className="border-2 border-white hover:bg-white hover:text-cyan-800 text-white px-10 py-4 rounded-2xl font-bold transition-all duration-300 hover:-translate-y-1 inline-flex items-center justify-center gap-3"
            >
              {t("cta.buttons.freeTrial")}
              <Zap className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
