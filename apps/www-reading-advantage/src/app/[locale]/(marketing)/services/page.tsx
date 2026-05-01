import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, CheckCircle, Zap } from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import HeroSection from "@/components/marketing/hero-section";
import { Button } from "@/components/ui/button";

export default async function Services() {
  const t = await getScopedI18n("pages.services");
  const serviceConfigs = [
    { featureIndexes: [0, 1, 2, 3, 4, 5] },
    { featureIndexes: [0, 1, 2, 3, 4, 5] },
    { featureIndexes: [0, 1, 2, 3, 4, 5] },
    { featureIndexes: [0, 1, 2, 3] },
  ] as const;
  const services = serviceConfigs.map((serviceConfig, serviceIndex) => ({
    name: t(`services.${serviceIndex}.name` as never),
    status: t(`services.${serviceIndex}.status` as never),
    statusBadge: t(`services.${serviceIndex}.statusBadge` as never),
    description: t(`services.${serviceIndex}.description` as never),
    features: serviceConfig.featureIndexes.map((featureIndex) =>
      t(`services.${serviceIndex}.features.${featureIndex}` as never),
    ),
    cta: t(`services.${serviceIndex}.cta` as never),
    href: t(`services.${serviceIndex}.href` as never),
    image: t(`services.${serviceIndex}.image` as never),
  }));

  return (
    <main className="overflow-x-hidden">
      {/* Hero Section */}
      <HeroSection
        title={t("hero.title")}
        badge={{
          text: t("hero.subtitle"),
          variant: "sky",
        }}
        description={t("hero.description")}
        ctaButton={{
          text: t("cta.button"),
          href: "/contact",
          variant: "primary",
          icon: <ArrowRight className="w-5 h-5" />,
        }}
        height="medium"
      />

      {/* Services Grid */}
      <section className="relative py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
                Our Services
              </span>
              <h2 className="text-4xl font-bold text-sky-900 tracking-tight">
                Solutions for Every School
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <div
                  key={service.name}
                  className="group relative bg-gradient-to-br from-white to-sky-50 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 animate-in fade-in slide-in-from-bottom-8"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        service.statusBadge === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : service.statusBadge === "COMING SOON"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {service.statusBadge}
                    </div>
                  </div>

                  {/* Image */}
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={service.image}
                      alt={service.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="p-8">
                    <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-800 px-3 py-1 rounded-full text-sm font-bold mb-4">
                      <Calendar className="w-4 h-4" />
                      {service.status}
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 mb-4 whitespace-pre-line">
                      {service.name}
                    </h3>

                    <p className="text-slate-600 mb-6 leading-relaxed">
                      {service.description}
                    </p>

                    {/* Features */}
                    <ul className="space-y-3 mb-6">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-700 text-sm leading-relaxed">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button className="w-full group/btn" asChild>
                      <Link href={service.href}>
                        {service.cta}
                        <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 bg-gradient-to-br from-sky-500 via-blue-600 to-sky-700 text-white overflow-hidden">
        <div
          className="absolute top-20 left-20 w-[500px] h-[500px] bg-sky-400/30 rounded-full blur-[150px]"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-20 right-20 w-[400px] h-[400px] bg-blue-400/30 rounded-full blur-[120px]"
          aria-hidden="true"
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight">
              {t("cta.title")}
            </h2>
            <p className="text-2xl md:text-3xl text-sky-100 leading-relaxed mb-12 max-w-3xl mx-auto">
              {t("cta.description")}
            </p>
            <Button
              variant="white"
              size="lg"
              className="text-xl px-14 py-6 rounded-3xl shadow-2xl hover:shadow-white/30 hover:-translate-y-2 font-bold animate-in fade-in delay-300"
              asChild
            >
              <Link href="/contact">
                <Zap className="w-8 h-8" />
                {t("cta.button")}
                <ArrowRight className="w-8 h-8" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
