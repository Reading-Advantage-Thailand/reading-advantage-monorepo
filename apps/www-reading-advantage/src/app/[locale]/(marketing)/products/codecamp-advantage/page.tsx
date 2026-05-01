import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Code2,
  Terminal,
  Cpu,
  Braces,
  ArrowRight,
  Check,
  Sparkles,
  GitBranch,
  Container,
  Rocket,
} from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import { OverlappingSection } from "@/components/ui/overlapping-section";
import { HorizontalStrip } from "@/components/ui/horizontal-strip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "CodeCamp Advantage - Reading Advantage Thailand",
  description:
    "AI-powered full-stack development learning platform with personalized instruction and project-based curriculum.",
  openGraph: {
    title: "CodeCamp Advantage - Reading Advantage Thailand",
    description:
      "Transform your development journey with our AI-powered learning platform launching in 2025.",
  },
};

export default async function CodeCampAdvantage() {
  const t = await getScopedI18n("pages.products.codecampAdvantage");

  return (
    <main className="overflow-x-hidden">
      {/* Hero Section - Inline with dark slate gradient */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">
        <Image
          src="/images/hero-codecamp-advantage.jpg"
          alt="Abstract digital coding creation landscape"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 opacity-90" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="container relative z-10 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl py-24">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-bold mb-6">
                <Sparkles className="w-4 h-4" />
                {t("hero.comingSoon")}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
                {t("hero.title")}
              </h1>
              <p className="text-xl md:text-2xl lg:text-3xl leading-relaxed mb-4 text-slate-300">
                {t("hero.subtitle")}
              </p>
              <p className="text-lg md:text-xl leading-relaxed mb-8 text-slate-400 max-w-2xl">
                {t("hero.description")}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-lg hover:shadow-amber-500/30"
              >
                {t("cta.buttons.joinWaitlist")}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md aspect-square">
                <Image
                  src="/images/codecamp-advantage-hero.jpg"
                  alt="CodeCamp Advantage coding workspace"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover rounded-3xl shadow-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Tracks — Full-Width Dark Room (Slate) */}
      <section className="relative py-24 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div
          className="absolute top-20 left-20 w-[500px] h-[500px] bg-slate-700/20 rounded-full blur-[150px]"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-20 right-20 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px]"
          aria-hidden="true"
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-amber-400 mb-4 block text-center font-mono">
              [ TRACKS ]
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
              {t("technologyTracks.heading")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Code2,
                  title: t("technologyTracks.tracks.0.title"),
                  description: t("technologyTracks.tracks.0.description"),
                  bracket: "[ NEXT ]",
                },
                {
                  icon: Terminal,
                  title: t("technologyTracks.tracks.1.title"),
                  description: t("technologyTracks.tracks.1.description"),
                  bracket: "[ MERN ]",
                },
                {
                  icon: Cpu,
                  title: t("technologyTracks.tracks.2.title"),
                  description: t("technologyTracks.tracks.2.description"),
                  bracket: "[ DJANGO ]",
                },
              ].map((track) => (
                <div
                  key={track.title}
                  data-testid="track-card"
                  className="bg-white/5 backdrop-blur-sm rounded-3xl p-10 border border-white/10 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-3 shadow-xl"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <track.icon className="w-7 h-7 text-white" strokeWidth={2} />
                  </div>
                  <span className="font-mono text-xs text-amber-400 uppercase tracking-wider mb-3 block">
                    {track.bracket}
                  </span>
                  <h3 className="text-xl font-bold mb-4 text-white">
                    {track.title}
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    {track.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Project-Based Learning — Asymmetric 7/5 */}
      <section className="bg-white py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-12 gap-12 items-center max-w-6xl mx-auto">
            <div className="lg:col-span-7">
              <span className="uppercase tracking-widest text-xs font-semibold text-amber-600 mb-4 block">
                PROJECT-BASED LEARNING
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight">
                {t("keyFeatures.projectBasedLearning.title")}
              </h2>
              <ul className="space-y-4 mb-8">
                {[
                  t("keyFeatures.projectBasedLearning.points.0"),
                  t("keyFeatures.projectBasedLearning.points.1"),
                  t("keyFeatures.projectBasedLearning.points.2"),
                ].map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                    <span className="text-slate-600 leading-relaxed">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="inline-flex items-center gap-2 font-mono text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
                <Code2 className="w-4 h-4" />
                <span>code → build → deploy</span>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="space-y-4">
                <Card
                  padding="p-6"
                  className="border-slate-200 bg-gradient-to-br from-slate-50 to-white"
                >
                  <div className="font-mono text-xs text-slate-400 mb-2">
                    $ git commit -m &quot;init&quot;
                  </div>
                  <div className="font-mono text-sm text-slate-700">
                    <span className="text-amber-600">const</span> project ={" "}
                    <span className="text-green-600">&quot;Portfolio Site&quot;</span>;
                  </div>
                  <div className="mt-3 text-slate-600 text-sm">
                    Start with real-world projects from day one.
                  </div>
                </Card>
                <Card
                  padding="p-6"
                  className="border-slate-200 bg-gradient-to-br from-slate-50 to-white"
                >
                  <div className="font-mono text-xs text-slate-400 mb-2">
                    $ npm run deploy
                  </div>
                  <div className="font-mono text-sm text-slate-700">
                    <span className="text-amber-600">export</span>{" "}
                    <span className="text-blue-600">default</span>{" "}
                    <span className="text-slate-900">ProductionApp</span>;
                  </div>
                  <div className="mt-3 text-slate-600 text-sm">
                    Ship to production with CI/CD pipelines.
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack Strip */}
      <HorizontalStrip
        background="bg-slate-900"
        padding="py-16"
        data-testid="tech-strip"
      >
        <div className="container mx-auto px-4 mb-8 w-full">
          <span className="uppercase tracking-widest text-xs font-semibold text-amber-400 mb-2 block font-mono">
            [ TECH STACK ]
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            {t("professionalTools.heading")}
          </h2>
        </div>
        {[
          { name: "Next.js", icon: <Code2 className="w-8 h-8" /> },
          { name: "React", icon: <Braces className="w-8 h-8" /> },
          { name: "Node.js", icon: <Terminal className="w-8 h-8" /> },
          { name: "GitHub", icon: <GitBranch className="w-8 h-8" /> },
          { name: "Docker", icon: <Container className="w-8 h-8" /> },
          { name: "Vercel", icon: <Rocket className="w-8 h-8" /> },
        ].map((tech) => (
          <div
            key={tech.name}
            className="snap-start flex-shrink-0 w-[200px] bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 border border-slate-700 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-2 text-center"
          >
            <div className="text-amber-400 mb-3 flex justify-center">
              {tech.icon}
            </div>
            <span className="font-mono text-sm text-slate-200 font-semibold">
              {tech.name}
            </span>
          </div>
        ))}
      </HorizontalStrip>

      {/* Key Features — Overlapping Section */}
      <OverlappingSection
        background="bg-white"
        data-testid="overlapping-section"
      >
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-5xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-amber-600 mb-4 block">
              KEY FEATURES
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-16">
              {t("keyFeatures.heading")}
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Card
                data-testid="feature-card"
                padding="p-10"
                className="border-slate-200 border-l-4 border-l-amber-500 bg-gradient-to-br from-slate-50 to-white"
              >
                <div className="font-mono text-xs text-slate-400 mb-4">
                  [ FEATURE_01 ]
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900">
                  {t("keyFeatures.personalizedAI.title")}
                </h3>
                <ul className="space-y-3">
                  {[
                    t("keyFeatures.personalizedAI.points.0"),
                    t("keyFeatures.personalizedAI.points.1"),
                    t("keyFeatures.personalizedAI.points.2"),
                  ].map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-slate-600 leading-relaxed">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 font-mono text-xs text-slate-400 bg-slate-100 p-3 rounded-xl">
                  <span className="text-amber-600">AI</span>.review(code) →{" "}
                  <span className="text-green-600">feedback</span>
                </div>
              </Card>
              <Card
                data-testid="feature-card"
                padding="p-10"
                className="border-slate-200 border-l-4 border-l-amber-500 bg-gradient-to-br from-slate-50 to-white"
              >
                <div className="font-mono text-xs text-slate-400 mb-4">
                  [ FEATURE_02 ]
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900">
                  {t("keyFeatures.projectBasedLearning.title")}
                </h3>
                <ul className="space-y-3">
                  {[
                    t("keyFeatures.projectBasedLearning.points.0"),
                    t("keyFeatures.projectBasedLearning.points.1"),
                    t("keyFeatures.projectBasedLearning.points.2"),
                  ].map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-slate-600 leading-relaxed">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 font-mono text-xs text-slate-400 bg-slate-100 p-3 rounded-xl">
                  <span className="text-amber-600">git</span> push origin main
                </div>
              </Card>
            </div>
          </div>
        </div>
      </OverlappingSection>

      {/* Final CTA — Dark slate with amber accent */}
      <section className="relative py-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
        <div
          className="absolute top-20 left-20 w-[500px] h-[500px] bg-slate-700/20 rounded-full blur-[150px]"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-20 right-20 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px]"
          aria-hidden="true"
        />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t("cta.heading")}
            </h2>
            <p className="text-xl md:text-2xl mb-12 text-slate-400 max-w-2xl mx-auto">
              {t("cta.description")}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                asChild
                className="px-10 py-5 rounded-2xl font-bold text-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-1"
              >
                <Link href="/contact" className="inline-flex items-center gap-2">
                  {t("cta.buttons.joinWaitlist")}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="px-10 py-5 rounded-2xl font-bold text-lg border-2 border-slate-500 text-white hover:bg-slate-700 hover:border-slate-400"
              >
                <Link href="/contact">
                  {t("cta.buttons.learnMore")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
