"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Code, GraduationCap, BrainCircuit, Users, ArrowRight } from "lucide-react"
import { useScopedI18n } from "@/locales/client"

const HIGHLIGHT_KEYS = [
  "codecamp.highlights.0",
  "codecamp.highlights.1",
  "codecamp.highlights.2",
  "codecamp.highlights.3",
] as const

const OUTCOME_KEYS = [
  "codecamp.outcomes.0",
  "codecamp.outcomes.1",
  "codecamp.outcomes.2",
  "codecamp.outcomes.3",
] as const

export default function B2CSolutions() {
  const t = useScopedI18n("components.products.b2cSolutions")
  const features = [
    {
      icon: Code,
      title: t("features.0.title"),
      description: t("features.0.description")
    },
    {
      icon: GraduationCap,
      title: t("features.1.title"),
      description: t("features.1.description")
    },
    {
      icon: BrainCircuit,
      title: t("features.2.title"),
      description: t("features.2.description")
    },
    {
      icon: Users,
      title: t("features.3.title"),
      description: t("features.3.description")
    }
  ]

  return (
    <section className="bg-sky-50 py-16 md:py-24 overflow-hidden">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900">
            <span className="bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">
              {t("title")}
            </span>
          </h2>
          <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
            {t("description")}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`
                bg-white rounded-2xl p-8 shadow-modern
                hover:shadow-modern-lg hover:-translate-y-1 transition-all duration-300
                animate-in fade-in slide-in-from-left-4 duration-500
              `}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-sky-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <feature.icon className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-900">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Codecamp Highlight Card */}
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <div className="relative bg-white rounded-3xl p-10 shadow-modern-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            {/* Gradient background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sky-400/10 to-cyan-500/10 rounded-full blur-3xl -translate-y-32 translate-x-32 pointer-events-none" />

            {/* Header */}
            <div className="flex items-start gap-6 mb-8 relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl">
                <Code className="w-10 h-10 text-white" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h3 className="text-3xl font-bold mb-2 text-slate-900">{t("codecamp.title")}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {t("description")}
                </p>
              </div>
            </div>

            {/* Two-column grid for highlights and outcomes */}
            <div className="grid md:grid-cols-2 gap-8 mb-8 relative z-10">
              {/* Highlights */}
              <div>
                <h4 className="text-xl font-bold mb-4 text-sky-700 flex items-center gap-2">
                  <ArrowRight className="w-5 h-5" strokeWidth={2} />
                  {t("codecamp.highlightsTitle")}
                </h4>
                <ul className="space-y-3">
                  {HIGHLIGHT_KEYS.map((key, index) => (
                    <li
                      key={key}
                      className="flex items-start text-slate-700 animate-in fade-in slide-in-from-left-4 duration-300"
                      style={{ animationDelay: `${300 + index * 50}ms` }}
                    >
                      <span className="w-2 h-2 bg-sky-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                      <span className="leading-relaxed">{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Outcomes */}
              <div>
                <h4 className="text-xl font-bold mb-4 text-cyan-700 flex items-center gap-2">
                  <ArrowRight className="w-5 h-5" strokeWidth={2} />
                  {t("codecamp.outcomesTitle")}
                </h4>
                <ul className="space-y-3">
                  {OUTCOME_KEYS.map((key, index) => (
                    <li
                      key={key}
                      className="flex items-start text-slate-700 animate-in fade-in slide-in-from-left-4 duration-300"
                      style={{ animationDelay: `${500 + index * 50}ms` }}
                    >
                      <span className="w-2 h-2 bg-cyan-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                      <span className="leading-relaxed">{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 relative z-10">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white px-8 py-4 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 font-semibold"
              >
                <Link href="/products/codecamp-advantage" className="inline-flex items-center gap-2">
                  {t("codecamp.applyNow")}
                  <ArrowRight className="w-5 h-5" strokeWidth={2} />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-8 py-4 rounded-xl hover:bg-sky-50 border-2 border-sky-200 hover:border-sky-300 transition-all duration-300 font-semibold"
              >
                <Link href="/products/codecamp-advantage#curriculum">
                  {t("codecamp.viewCurriculum")}
                </Link>
              </Button>
            </div>

            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-3xl pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  )
}
