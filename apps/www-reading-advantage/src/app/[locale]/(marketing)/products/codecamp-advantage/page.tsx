import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Code2,
  Terminal,
  Cpu,
  Braces,
  ArrowRight,
  Sparkles,
  GitBranch,
  Container,
  Rocket,
  MessageSquare,
  Github,
  BarChart3,
  Lock,
  Globe,
  Zap,
  Database,
} from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import { OverlappingSection } from "@/components/ui/overlapping-section";
import { HorizontalStrip } from "@/components/ui/horizontal-strip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "CodeCamp Advantage - Reading Advantage Thailand",
  description:
    "Full-stack web development internship with 18-module curriculum, AI chat tutor, GitHub integration, and automated code review.",
  openGraph: {
    title: "CodeCamp Advantage - Reading Advantage Thailand",
    description:
      "Join our active full-stack web development bootcamp with AI-powered learning and real-world projects.",
  },
};

export default async function CodeCampAdvantage() {
  const t = await getScopedI18n("pages.products.codecampAdvantage");

  const phases = [
    {
      key: "A",
      icon: Terminal,
      color: "from-green-500 to-emerald-600",
      borderColor: "border-l-green-500",
    },
    {
      key: "B",
      icon: Code2,
      color: "from-blue-500 to-indigo-600",
      borderColor: "border-l-blue-500",
    },
    {
      key: "C",
      icon: Database,
      color: "from-purple-500 to-violet-600",
      borderColor: "border-l-purple-500",
    },
    {
      key: "D",
      icon: Rocket,
      color: "from-orange-500 to-amber-600",
      borderColor: "border-l-orange-500",
    },
  ];

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
                {t("hero.badge")}
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
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-lg hover:shadow-amber-500/30"
                >
                  {t("cta.buttons.applyNow")}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="#curriculum"
                  className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:bg-white/20 border border-white/20"
                >
                  {t("cta.buttons.viewCurriculum")}
                </Link>
              </div>
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

      {/* Curriculum Showcase */}
      <section id="curriculum" className="relative py-24 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white overflow-hidden">
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
              [ CURRICULUM ]
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
              {t("curriculum.heading")}
            </h2>
            <p className="text-xl text-slate-400 text-center mb-16 max-w-2xl mx-auto">
              {t("curriculum.subtitle")}
            </p>

            {/* Phase Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {phases.map((phase) => (
                <div
                  key={phase.key}
                  data-testid="phase-card"
                  className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-3 shadow-xl"
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${phase.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                    <phase.icon className="w-7 h-7 text-white" strokeWidth={2} />
                  </div>
                  <span className="font-mono text-xs text-amber-400 uppercase tracking-wider mb-2 block">
                    {t(`curriculum.phases.${phase.key}.name`)}
                  </span>
                  <h3 className="text-xl font-bold mb-3 text-white">
                    {t(`curriculum.phases.${phase.key}.title`)}
                  </h3>
                  <p className="text-slate-400 text-sm mb-6">
                    {t(`curriculum.phases.${phase.key}.description`)}
                  </p>
                  <ul className="space-y-2">
                    {[0, 1, 2, 3, 4, 5].map((moduleIndex) => {
                      const moduleTitle = t(`curriculum.phases.${phase.key}.modules.${moduleIndex}`);
                      if (!moduleTitle || moduleTitle === `curriculum.phases.${phase.key}.modules.${moduleIndex}`) return null;
                      return (
                        <li key={moduleIndex} className="flex items-start gap-2 text-sm text-slate-300">
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                          {moduleTitle}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {/* Portfolio Projects */}
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-10 border border-white/10">
              <h3 className="text-2xl font-bold text-center mb-8 text-white">
                {t("curriculum.projects.heading")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { phase: "A", icon: Globe },
                  { phase: "B", icon: BarChart3 },
                  { phase: "C", icon: Lock },
                  { phase: "D", icon: Rocket },
                ].map((project) => (
                  <div
                    key={project.phase}
                    data-testid="project-card"
                    className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center"
                  >
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-500/20 rounded-xl mb-4">
                      <project.icon className="w-6 h-6 text-amber-400" />
                    </div>
                    <span className="font-mono text-xs text-amber-400 uppercase tracking-wider mb-2 block">
                      {t(`curriculum.phases.${project.phase}.name`)}
                    </span>
                    <p className="text-white font-semibold">
                      {t(`curriculum.projects.items.${project.phase === "A" ? "0" : project.phase === "B" ? "1" : project.phase === "C" ? "2" : "3"}.title`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <OverlappingSection
        background="bg-white"
        data-testid="features-section"
      >
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-5xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-semibold text-amber-600 mb-4 block">
              PLATFORM FEATURES
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-16">
              {t("features.heading")}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {/* AI Tutor */}
              <Card
                data-testid="feature-card"
                padding="p-10"
                className="border-slate-200 border-l-4 border-l-amber-500 bg-gradient-to-br from-slate-50 to-white"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div className="font-mono text-xs text-slate-400 mb-4">
                  [ FEATURE_01 ]
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900">
                  {t("features.aiTutor.title")}
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  {t("features.aiTutor.description")}
                </p>
                <ul className="space-y-3">
                  {[0, 1, 2, 3].map((index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-slate-600 leading-relaxed">
                        {t(`features.aiTutor.points.${index}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* GitHub Integration */}
              <Card
                data-testid="feature-card"
                padding="p-10"
                className="border-slate-200 border-l-4 border-l-amber-500 bg-gradient-to-br from-slate-50 to-white"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Github className="w-6 h-6 text-white" />
                </div>
                <div className="font-mono text-xs text-slate-400 mb-4">
                  [ FEATURE_02 ]
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900">
                  {t("features.githubIntegration.title")}
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  {t("features.githubIntegration.description")}
                </p>
                <ul className="space-y-3">
                  {[0, 1, 2, 3].map((index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-slate-600 leading-relaxed">
                        {t(`features.githubIntegration.points.${index}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Progress Tracking */}
              <Card
                data-testid="feature-card"
                padding="p-10"
                className="border-slate-200 border-l-4 border-l-amber-500 bg-gradient-to-br from-slate-50 to-white"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div className="font-mono text-xs text-slate-400 mb-4">
                  [ FEATURE_03 ]
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900">
                  {t("features.progressTracking.title")}
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  {t("features.progressTracking.description")}
                </p>
                <ul className="space-y-3">
                  {[0, 1, 2, 3].map((index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-slate-600 leading-relaxed">
                        {t(`features.progressTracking.points.${index}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </OverlappingSection>

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
            Technologies You Will Master
          </h2>
        </div>
        {[
          { name: "Next.js", icon: <Code2 className="w-8 h-8" /> },
          { name: "React", icon: <Braces className="w-8 h-8" /> },
          { name: "TypeScript", icon: <Terminal className="w-8 h-8" /> },
          { name: "Node.js", icon: <Cpu className="w-8 h-8" /> },
          { name: "GitHub", icon: <GitBranch className="w-8 h-8" /> },
          { name: "Docker", icon: <Container className="w-8 h-8" /> },
          { name: "tRPC", icon: <Zap className="w-8 h-8" /> },
          { name: "AI SDK", icon: <Sparkles className="w-8 h-8" /> },
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
                  {t("cta.buttons.applyNow")}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="px-10 py-5 rounded-2xl font-bold text-lg border-2 border-slate-500 text-white hover:bg-slate-700 hover:border-slate-400"
              >
                <Link href="/contact">
                  {t("cta.buttons.contactSales")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
