import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Fragment } from "react";
import {
  BookOpen,
  Bot,
  Calculator,
  Languages,
  BookMarked,
  Beaker,
  type LucideIcon,
} from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import { ArrowRight } from "lucide-react";

type ProductKey =
  | "primaryAdvantage"
  | "readingAdvantage"
  | "stemAdvantage"
  | "scienceAdvantage"
  | "mathAdvantage"
  | "zhongwenAdvantage"
  | "storytimeAdvantage";

interface ProductConfig {
  key: ProductKey;
  href: string;
  bgColor: string;
  logo?: string;
  icon?: LucideIcon;
  layout?: "feature" | "standard";
  badgeType?: "new" | "flagship";
  badgeKey?: `products.${ProductKey}.badge`;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
}

const FEATURE_INDEXES = [0, 1, 2, 3] as const;

const productConfigs = [
  {
    key: "readingAdvantage",
    href: "/products/reading-advantage",
    bgColor: "from-sky-50 to-sky-100",
    logo: "/reading-advantage.jpg",
    icon: BookOpen,
    layout: "feature",
    badgeKey: "products.readingAdvantage.badge",
    gradientFrom: "from-sky-400",
    gradientTo: "to-sky-600",
    accentColor: "text-sky-700",
  },
  {
    key: "primaryAdvantage",
    href: "/products/primary-advantage",
    bgColor: "from-sky-50 to-sky-100",
    logo: "/primary-advantage logo.png",
    layout: "standard",
    badgeType: "new",
    gradientFrom: "from-sky-300",
    gradientTo: "to-sky-500",
    accentColor: "text-sky-700",
  },
  {
    key: "scienceAdvantage",
    href: "/products/science-advantage",
    bgColor: "from-rose-50 to-rose-100",
    logo: "/science-advantage.png",
    icon: Beaker,
    badgeKey: "products.scienceAdvantage.badge",
    gradientFrom: "from-rose-400",
    gradientTo: "to-rose-600",
    accentColor: "text-rose-700",
  },
  {
    key: "mathAdvantage",
    href: "/products/math-advantage",
    bgColor: "from-orange-50 to-orange-100",
    logo: "/math-advantage.png",
    icon: Calculator,
    badgeKey: "products.mathAdvantage.badge",
    gradientFrom: "from-orange-400",
    gradientTo: "to-orange-600",
    accentColor: "text-orange-700",
  },
  {
    key: "zhongwenAdvantage",
    href: "/products/zhongwen-advantage",
    bgColor: "from-fuchsia-50 to-purple-50",
    logo: "/zhongwen-advantage.png",
    icon: Languages,
    badgeKey: "products.zhongwenAdvantage.badge",
    gradientFrom: "from-fuchsia-400",
    gradientTo: "to-purple-500",
    accentColor: "text-purple-700",
  },
  {
    key: "storytimeAdvantage",
    href: "/products/storytime-advantage",
    bgColor: "from-amber-50 to-amber-100",
    logo: "/storytime-advantage.png",
    icon: BookMarked,
    badgeKey: "products.storytimeAdvantage.badge",
    gradientFrom: "from-amber-400",
    gradientTo: "to-amber-600",
    accentColor: "text-amber-700",
  },
  {
    key: "stemAdvantage",
    href: "/products/stem-advantage",
    bgColor: "from-indigo-50 to-indigo-100",
    logo: "/stem-advantage.png",
    icon: Bot,
    badgeKey: "products.stemAdvantage.badge",
    gradientFrom: "from-indigo-400",
    gradientTo: "to-indigo-600",
    accentColor: "text-indigo-700",
  },
] as const satisfies readonly ProductConfig[];

export default async function B2BSolutions() {
  const t = await getScopedI18n("components.products.b2bSolutions");

  const products = (productConfigs as readonly ProductConfig[]).map(
    (config) => {
      const title = t(`products.${config.key}.title` as never);
      const features = FEATURE_INDEXES.map((featureIndex) =>
        t(`products.${config.key}.features.${featureIndex}` as never),
      );
      const gradeRange = t(`products.${config.key}.gradeRange` as never);

      const badgeLabel = config.badgeKey
        ? t(config.badgeKey)
        : config.badgeType === "flagship"
          ? t("mostPopular")
          : config.badgeType === "new"
            ? t(`products.${config.key}.badge` as never)
            : undefined;

      return {
        ...config,
        title,
        features,
        gradeRange,
        badgeLabel,
      };
    },
  );

  return (
    <section className="bg-white py-16 md:py-24 overflow-hidden">
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

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {products.map((product, index) => {
            const baseDelay = index * 100;
            return (
              <Fragment key={product.key}>
                <div
                  className={`${
                    product.layout === "feature"
                      ? "col-span-full lg:col-span-2"
                      : ""
                  } animate-in fade-in zoom-in-95 duration-500`}
                  style={{ animationDelay: `${baseDelay}ms` }}
                >
                  <div
                    className={`
                      relative flex h-full flex-col overflow-hidden p-8 rounded-2xl
                      bg-gradient-to-br ${product.bgColor}
                      backdrop-blur-sm border border-white/20 shadow-modern
                      hover:shadow-modern-lg hover:-translate-y-2 transition-all duration-300
                    `}
                  >
                    {/* Gradient overlay */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${product.gradientFrom}/10 ${product.gradientTo}/10 rounded-2xl -z-10`}
                    />

                    {/* Header */}
                    <div className="mb-4 flex items-center justify-between gap-4">
                      {product.logo ? (
                        <div className="relative z-10 w-24 h-24">
                          <Image
                            src={product.logo}
                            alt={product.title}
                            fill
                            sizes="6rem"
                            className="object-contain drop-shadow-lg"
                          />
                        </div>
                      ) : (
                        <div className="relative z-10">
                          <div
                            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${product.gradientFrom} ${product.gradientTo} flex items-center justify-center shadow-lg`}
                          >
                            {product.icon && (
                              <product.icon
                                className="w-8 h-8 text-white"
                                strokeWidth={1.5}
                              />
                            )}
                          </div>
                        </div>
                      )}
                      {product.badgeLabel && (
                        <span
                          className={`
                            relative z-10 bg-white/80 backdrop-blur-sm text-sm font-semibold px-4 py-1.5 rounded-full
                            border border-white/40 shadow-sm ${product.accentColor}
                          `}
                        >
                          {product.badgeLabel}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="mb-4 relative z-10">
                      <h3
                        className={`text-2xl md:text-3xl font-bold mb-2 ${product.accentColor}`}
                      >
                        {product.title}
                      </h3>
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                        {product.gradeRange}
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="mb-6 flex-1 space-y-2 text-slate-700 relative z-10">
                      {product.features.map((feature, featureIndex) => (
                        <li
                          key={`${product.key}-${featureIndex}`}
                          className="flex items-start animate-in fade-in slide-in-from-left-4 duration-300"
                          style={{
                            animationDelay: `${baseDelay + featureIndex * 50}ms`,
                          }}
                        >
                          <ArrowRight
                            className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5 text-slate-500"
                            strokeWidth={2}
                          />
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div className="mt-auto flex justify-end relative z-10">
                      <Button
                        asChild
                        className={`
                          group bg-gradient-to-r ${product.gradientFrom} ${product.gradientTo}
                          text-white px-8 py-3 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300
                        `}
                      >
                        <Link
                          href={product.href}
                          className="inline-flex items-center gap-2"
                        >
                          {t("cta.learnMore")}
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </div>

                    {/* Glassmorphism overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl pointer-events-none" />
                  </div>
                </div>

                {product.key === "readingAdvantage" && (
                  <div
                    className="animate-in fade-in zoom-in-95 duration-500"
                    style={{ animationDelay: `${baseDelay + 50}ms` }}
                  >
                    <div className="relative h-full flex flex-col items-center justify-center overflow-hidden p-8 rounded-2xl bg-white border border-sky-200 shadow-modern hover:shadow-modern-lg hover:-translate-y-2 transition-all duration-300">
                      <div className="absolute inset-0 z-0">
                        <Image
                          src="/images/blended-learning.png"
                          alt="Blended learning approach"
                          fill
                          sizes="(min-width: 1024px) 25vw, 100vw"
                          className="object-cover opacity-75 blur-sm"
                        />
                      </div>
                      <div className="absolute inset-0 z-10 bg-gradient-to-br from-white/40 to-white/20" />
                      <div className="relative z-20 text-center space-y-3 bg-white/80 backdrop-blur-xs rounded-2xl px-6 py-4 shadow-modern border border-white/50">
                        <p className="text-lg font-semibold text-slate-800">
                          {t("seeSuccessStories")}
                        </p>
                        <p className="text-slate-600">{t("description")}</p>
                      </div>
                    </div>
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
