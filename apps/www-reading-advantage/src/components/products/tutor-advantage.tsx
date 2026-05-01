import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Network, Brain, GraduationCap, Clock, ArrowRight } from "lucide-react";
import { getScopedI18n } from "@/locales/server";

export default async function TutorAdvantage() {
  const t = await getScopedI18n("components.products.tutorAdvantage");

  const features = [
    {
      title: t("features.0.title"),
      description: t("features.0.description"),
      icon: Network,
    },
    {
      title: t("features.1.title"),
      description: t("features.1.description"),
      icon: Brain,
    },
    {
      title: t("features.2.title"),
      description: t("features.2.description"),
      icon: GraduationCap,
    },
    {
      title: t("features.3.title"),
      description: t("features.3.description"),
      icon: Clock,
    },
  ];

  return (
    <section className="relative py-16 md:py-24 bg-gradient-to-br from-emerald-400 via-teal-400 to-emerald-500 overflow-hidden">
      {/* Floating decorative elements */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-[80px] animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-emerald-300/20 rounded-full blur-[100px] animate-float pointer-events-none" />

      <div className="container px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
        {/* Main glass card */}
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="relative bg-white/20 backdrop-blur-lg rounded-3xl p-10 border border-white/30 shadow-2xl">
            {/* Logo section */}
            <div className="flex justify-center mb-8 relative z-10 animate-in fade-in zoom-in-95 duration-500 delay-100">
              <div className="relative w-40 h-40">
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-3xl blur-2xl" />
                <Image
                  src="/tutor-advantage.png"
                  alt="Tutor Advantage"
                  fill
                  sizes="10rem"
                  className="relative z-10 object-contain"
                />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8 relative z-10 animate-in fade-in duration-700 delay-200">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-emerald-900">
              {t("heading")}
            </h2>
            <p className="text-xl text-emerald-800 leading-relaxed max-w-3xl mx-auto">
              {t("description")}
            </p>
          </div>

          {/* Features grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`
                  bg-white/30 backdrop-blur-sm p-6 rounded-2xl border border-white/20
                  hover:bg-white/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300
                  animate-in fade-in slide-in-from-bottom-4 duration-500
                `}
                style={{ animationDelay: `${300 + index * 100}ms` }}
              >
                <div
                  className={`
                    w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl
                    flex items-center justify-center mb-4 shadow-lg
                    group-hover:scale-110 transition-transform duration-300
                  `}
                >
                  <feature.icon
                    className="w-7 h-7 text-white"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-lg font-bold mb-2 text-emerald-900">
                  {feature.title}
                </h3>
                <p className="text-emerald-800/90 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="space-y-4 text-center relative z-10 animate-in fade-in duration-700 delay-700">
            <Button
              variant="secondary"
              size="lg"
              asChild
              className={`
                font-semibold px-10 py-4 rounded-xl
                bg-white text-emerald-700 hover:bg-emerald-50
                border-2 border-emerald-300 hover:border-emerald-400
                hover:-translate-y-0.5 hover:shadow-lg
                transition-all duration-300 inline-flex items-center gap-2
              `}
            >
              <Link href="/products/tutor-advantage">
                {t("joinButton")}
                <ArrowRight className="w-5 h-5" strokeWidth={2} />
              </Link>
            </Button>
            <p className="text-emerald-800/90 text-sm font-medium">
              {t("joinCaption")}
            </p>
          </div>

          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-3xl pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
