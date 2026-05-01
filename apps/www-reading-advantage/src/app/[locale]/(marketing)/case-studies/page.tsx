import Link from "next/link";
import Image from "next/image";
import { ArrowRight, TrendingUp, BookOpen, Target, CheckCircle, Users, BarChart3, GraduationCap } from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import HeroSection from "@/components/marketing/hero-section";

export default async function CaseStudies() {
  const t = await getScopedI18n("pages.caseStudies");
  const schoolIndexes = [0, 1] as const;
  const highlightIndexes = [0, 1, 2, 3] as const;
  const methodIndexes = [0, 1, 2, 3] as const;
  const schools = schoolIndexes.map((schoolIndex) => ({
    name: t(`schools.${schoolIndex}.name`),
    type: t(`schools.${schoolIndex}.type`),
    duration: t(`schools.${schoolIndex}.duration`),
    outcomes: {
      heading: t(`schools.${schoolIndex}.outcomes.heading`),
      readingImprovement: {
        title: t(`schools.${schoolIndex}.outcomes.readingImprovement.title`),
        description: t(`schools.${schoolIndex}.outcomes.readingImprovement.description`),
        delta: t(`schools.${schoolIndex}.outcomes.readingImprovement.delta`),
      },
      readingVolume: {
        title: t(`schools.${schoolIndex}.outcomes.readingVolume.title`),
        description: t(`schools.${schoolIndex}.outcomes.readingVolume.description`),
        metric: t(`schools.${schoolIndex}.outcomes.readingVolume.metric`),
      },
      fidelity: {
        title: t(`schools.${schoolIndex}.outcomes.fidelity.title`),
        description: t(`schools.${schoolIndex}.outcomes.fidelity.description`),
        score: t(`schools.${schoolIndex}.outcomes.fidelity.score`),
      },
    },
    testimonial: {
      quote: t(`schools.${schoolIndex}.testimonial.quote`),
      author: t(`schools.${schoolIndex}.testimonial.author`),
      role: t(`schools.${schoolIndex}.testimonial.role`),
      school: t(`schools.${schoolIndex}.testimonial.school`),
    },
    highlights: highlightIndexes.map((highlightIndex) =>
      t(`schools.${schoolIndex}.highlights.${highlightIndex}`)
    ),
  }));
  const methods = methodIndexes.map((methodIndex) => ({
    title: t(`methodology.methods.${methodIndex}.title`),
    description: t(`methodology.methods.${methodIndex}.description`),
  }));

  return (
    <main className="overflow-x-hidden">
      {/* Hero Section */}
      <HeroSection
        title={t("hero.title")}
        description={`${t("hero.subtitle")} ${t("hero.description")}`}
        badge={{
          text: t("hero.badge"),
          icon: <Target className="w-4 h-4" />,
          variant: "sky",
        }}
        ctaButton={{
          text: t("cta.button"),
          href: "/contact",
          variant: "primary",
          icon: <ArrowRight className="w-5 h-5" />,
        }}
        height="medium"
      />

      {/* School Case Studies */}
      {schools.map((school, index) => (
        <section
          key={school.name}
          className={`relative py-24 ${index % 2 === 0 ? "bg-white" : "bg-gradient-to-br from-sky-50 via-white to-amber-50"}`}
        >
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* School Header */}
                <div className="mb-12">
                  <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
                    <GraduationCap className="w-4 h-4" />
                    {school.type}
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
                    {school.name}
                  </h2>
                  <p className="text-lg text-slate-600">
                    {t("implementationPeriod")}{school.duration}
                  </p>
                </div>

                {/* Classroom Images */}
                <div className="grid md:grid-cols-3 gap-4 mb-12">
                  <div className="relative aspect-video rounded-2xl overflow-hidden shadow-xl">
                    <Image
                      src={index === 0 ? "/images/students-engaging-with-app.png" : "/images/students-with-app.png"}
                      alt="Students actively engaged with Reading Advantage app on tablets during classroom activity"
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="relative aspect-video rounded-2xl overflow-hidden shadow-xl">
                    <Image
                      src="/images/teacher-assisting-students.png"
                      alt="Teacher providing personalized assistance to students using Reading Advantage platform"
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="relative aspect-video rounded-2xl overflow-hidden shadow-xl">
                    <Image
                      src={index === 0 ? "/images/small-group.png" : "/images/teacher-at-board.png"}
                      alt="Small collaborative group learning session with students working together"
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                </div>

                {/* Measurable Outcomes */}
                <div className="bg-gradient-to-br from-white to-sky-50 rounded-3xl p-10 border border-sky-100 shadow-xl mb-12">
                  <h3 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-sky-600" />
                    {school.outcomes.heading}
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Reading Improvement */}
                    <div className="bg-white rounded-2xl p-6 border border-sky-100 shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <h4 className="font-bold text-xl text-slate-900">
                          {school.outcomes.readingImprovement.title}
                        </h4>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        {school.outcomes.readingImprovement.description}
                      </p>
                      <div className="text-2xl font-bold text-sky-600">
                        {school.outcomes.readingImprovement.delta}
                      </div>
                    </div>

                    {/* Reading Volume */}
                    <div className="bg-white rounded-2xl p-6 border border-sky-100 shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <h4 className="font-bold text-xl text-slate-900">
                          {school.outcomes.readingVolume.title}
                        </h4>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        {school.outcomes.readingVolume.description}
                      </p>
                      <div className="text-2xl font-bold text-amber-600">
                        {school.outcomes.readingVolume.metric}
                      </div>
                    </div>

                    {/* Fidelity Score */}
                    <div className="bg-white rounded-2xl p-6 border border-sky-100 shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                          <Target className="w-6 h-6 text-white" />
                        </div>
                        <h4 className="font-bold text-xl text-slate-900">
                          {school.outcomes.fidelity.title}
                        </h4>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        {school.outcomes.fidelity.description}
                      </p>
                      <div className="text-2xl font-bold text-green-600">
                        {school.outcomes.fidelity.score}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Highlights */}
                <div className="grid md:grid-cols-2 gap-6 mb-12">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900 mb-4">{t("highlights")}</h4>
                    <ul className="space-y-3">
                      {school.highlights.map((highlight, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-700">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Teacher Testimonial */}
                  <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-8 border border-sky-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-lg text-slate-900">{school.testimonial.author}</div>
                        <div className="text-sm text-slate-600">{school.testimonial.role}</div>
                      </div>
                    </div>
                    <p className="text-slate-700 leading-relaxed italic">
                      &ldquo;{school.testimonial.quote}&rdquo;
                    </p>
                    <div className="mt-4 text-sm text-slate-600">
                      — {school.testimonial.school}
                    </div>
                  </div>
                </div>

                {/* Dashboard and Workbook Images */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="relative aspect-video rounded-2xl overflow-hidden shadow-xl">
                    <Image
                      src="/images/teacher-and-dashboard.png"
                      alt="Teacher analytics dashboard displaying real-time student progress data and performance metrics"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="relative aspect-video rounded-2xl overflow-hidden shadow-xl">
                    <Image
                      src="/images/workbook-cover.png"
                      alt="Physical student workbook with structured reading exercises and guided activities"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Methodology Section */}
      <section className="relative py-24 bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/50 via-amber-900/50 to-slate-900" />
      <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[150px]" aria-hidden="true" />
      <div className="absolute bottom-20 left-20 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px]" aria-hidden="true" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 animate-in fade-in duration-700">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                {t("methodology.title")}
              </h2>
              <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
                {t("methodology.description")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {methods.map((method, index) => (
                <div
                  key={method.title}
                  className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/10 transition-all duration-300 hover:border-white/20 hover:bg-white/15 animate-in fade-in slide-in-from-bottom-8 duration-700"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-amber-400 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{method.title}</h3>
                  <p className="text-slate-300 leading-relaxed">{method.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 bg-gradient-to-br from-sky-500 via-blue-600 to-sky-700 text-white overflow-hidden">
      <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-sky-400/30 rounded-full blur-[150px]" aria-hidden="true" />
      <div className="absolute bottom-20 right-20 w-[400px] h-[400px] bg-blue-400/30 rounded-full blur-[120px]" aria-hidden="true" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight">
              {t("cta.title")}
            </h2>
            <p className="text-2xl md:text-3xl text-sky-100 leading-relaxed mb-12 max-w-3xl mx-auto">
              {t("cta.description")}
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-4 bg-white text-sky-700 px-14 py-6 rounded-3xl hover:bg-sky-50 transition-all duration-300 shadow-2xl hover:shadow-white/30 hover:-translate-y-2 font-bold text-xl animate-in fade-in duration-700 delay-300 hover:scale-105"
            >
              {t("cta.button")}
              <ArrowRight className="w-8 h-8" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
