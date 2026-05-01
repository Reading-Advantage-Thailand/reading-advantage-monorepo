import Image from "next/image";
import Link from "next/link";
import HeroSection from "@/components/marketing/hero-section";
import { OverlappingSection } from "@/components/ui/overlapping-section";
import { FloatingPill } from "@/components/ui/floating-pill";
import { StepFlow } from "@/components/ui/step-flow";
import { Card, CardContent } from "@/components/ui/card";
import { getScopedI18n } from "@/locales/server";
import { Mail, BookOpen, Target, Zap } from "lucide-react";

export default async function PrimaryAdvantage() {
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
    {
      title: "B1",
      description: t("cefrSection.levels.3.description"),
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
          href: "mailto:support@reading-advantage.com?subject=Primary Advantage Inquiry&body=Hi team,%0A%0AI'm interested in learning more about Primary Advantage for my school/organization.%0A%0APlease provide more information about:%0A- Pricing options (100 baht per student per month)%0A- Free pilot term%0A- Technical requirements%0A%0AThank you!",
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

      {/* CEFR Aligned — Full-Width Color Room */}
      <section className="py-24 bg-gradient-to-r from-cyan-500 via-cyan-600 to-cyan-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className="uppercase tracking-widest text-xs font-semibold text-cyan-100 mb-4 block">
              Curriculum Alignment
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
          <div data-testid="reversed-split" className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center max-w-7xl mx-auto">
            {/* Image LEFT (5 cols) */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[4/3] rounded-[40px] overflow-hidden shadow-xl">
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
                <FloatingPill value="3-6" label="Grades" variant="cyan" size="sm" />
              </div>
              <div className="absolute -bottom-4 -left-4 animate-in fade-in zoom-in duration-700 delay-150">
                <FloatingPill value="CEFR" label="Aligned" variant="sky" size="sm" />
              </div>
            </div>

            {/* Text RIGHT (7 cols) */}
            <div className="lg:col-span-7">
              <span className="uppercase tracking-widest text-xs font-semibold text-cyan-600 mb-4 block">
                Key Features
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8">
                {t("keyFeatures.heading")}
              </h2>
              <div className="space-y-8">
                {features.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {feature.title}
                      </h3>
                      <ul className="space-y-1">
                        {feature.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-slate-600">
                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-2 flex-shrink-0" />
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
            <span className="uppercase tracking-widest text-xs font-semibold text-cyan-600 mb-4 block">
              Platform in Action
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900">
              {t("platformFeatures.heading")}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {platformFeatures.map((feature, index) => (
              <div
                key={feature.title}
                className={`relative aspect-[4/3] rounded-3xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
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

      {/* Stats — Single large + 2 smaller staggered */}
      <section className="py-24 bg-gradient-to-br from-cyan-50 to-sky-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="uppercase tracking-widest text-xs font-semibold text-cyan-600 mb-4 block">
              Impact
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900">
              {t("resultsSection.heading")}
            </h2>
          </div>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Small supporting card (left, staggered up) */}
            <div data-testid="stat-card" className="md:-translate-y-8">
              <Card className="text-center p-8 border-cyan-100">
                <CardContent className="p-0">
                  <div className="text-4xl md:text-5xl font-bold text-cyan-700 mb-2">
                    {t("resultsSection.stats.0.value")}
                  </div>
                  <p className="text-slate-600 font-medium">
                    {t("resultsSection.stats.0.label")}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Large central card */}
            <div data-testid="stat-card" className="md:scale-110 z-10">
              <Card className="text-center p-10 border-cyan-200 shadow-xl bg-gradient-to-br from-white to-cyan-50">
                <CardContent className="p-0">
                  <div className="text-5xl md:text-6xl font-bold text-cyan-700 mb-2">
                    {t("resultsSection.stats.1.value")}
                  </div>
                  <p className="text-slate-600 font-medium text-lg">
                    {t("resultsSection.stats.1.label")}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Small supporting card (right, staggered down) */}
            <div data-testid="stat-card" className="md:translate-y-8">
              <Card className="text-center p-8 border-cyan-100">
                <CardContent className="p-0">
                  <div className="text-4xl md:text-5xl font-bold text-cyan-700 mb-2">
                    {t("resultsSection.stats.2.value")}
                  </div>
                  <p className="text-slate-600 font-medium">
                    {t("resultsSection.stats.2.label")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-cyan-600 via-cyan-700 to-cyan-800 text-white relative overflow-hidden">
        <div className="absolute top-10 left-10 animate-bounce duration-[3000ms]">
          <FloatingPill value="AI" label="Powered" variant="sky" size="sm" />
        </div>
        <div className="absolute bottom-10 right-10 animate-bounce duration-[4000ms]">
          <FloatingPill value="24/7" label="Support" variant="cyan" size="sm" />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t("cta.heading")}
          </h2>
          <p className="text-xl text-cyan-100 max-w-2xl mx-auto mb-12">
            {t("cta.description")}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <a
              href="mailto:support@reading-advantage.com?subject=Primary Advantage Inquiry&body=Hi team,%0A%0AI'm interested in learning more about Primary Advantage for my school/organization.%0A%0APlease provide more information about:%0A- Pricing options (100 baht per student per month)%0A- Free pilot term%0A- Technical requirements%0A%0AThank you!"
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
