"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export interface HeroProps {
  title: string | ReactNode;
  description: string | ReactNode;
  ctaButton?: {
    text: string;
    href: string;
    variant?: "primary" | "secondary" | "white" | "outline";
    icon?: ReactNode;
  };
  badge?: {
    text: string;
    icon?: ReactNode;
    variant?: "amber" | "sky" | "green" | "rose" | "yellow" | "custom";
    customColor?: string;
  };
  floatingImage?: {
    src: string;
    alt: string;
  };
  productLogo?: {
    src: string;
    alt: string;
  };
  backgroundImage?: {
    src: string;
    alt: string;
  };
  height?: "tall" | "medium";
  alignment?: "left" | "center";
  customGradient?: string;
  className?: string;
}

const getBadgeVariantStyles = (
  variant?: "amber" | "sky" | "green" | "rose" | "yellow" | "custom",
  customColor?: string,
): string => {
  if (variant === "custom" && customColor) {
    return customColor;
  }

  switch (variant) {
    case "amber":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "sky":
      return "bg-sky-100 text-sky-800 border-sky-200";
    case "green":
      return "bg-green-100 text-green-800 border-green-200";
    case "rose":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "yellow":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-amber-100 text-amber-800 border-amber-200";
  }
};

const getHeightStyles = (height: NonNullable<HeroProps["height"]>): string => {
  return height === "tall" ? "min-h-[85vh]" : "min-h-[70vh]";
};

export default function HeroSection({
  title,
  description,
  ctaButton,
  badge,
  floatingImage,
  productLogo,
  backgroundImage,
  height = "medium",
  alignment = "center",
  customGradient,
  className = "",
}: HeroProps) {
  const gradientStyles = customGradient || "bg-sky-50";
  const heightStyles = getHeightStyles(height);
  const isCenter = alignment === "center";
  const bgRef = useRef<HTMLDivElement>(null);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    if (!backgroundImage) return;
    const handleScroll = () => {
      if (!bgRef.current) return;
      const rect = bgRef.current.getBoundingClientRect();
      const scrollProgress = -rect.top * 0.3;
      setParallaxY(scrollProgress);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [backgroundImage]);

  return (
    <section
      className={`relative overflow-hidden text-black pt-24 ${heightStyles} ${className}`}
    >
      {/* Background image with parallax */}
      {backgroundImage && (
        <div
          ref={bgRef}
          className="absolute inset-0 z-0"
        >
          <Image
            src={backgroundImage.src}
            alt={backgroundImage.alt}
            fill
            sizes="100vw"
            className="object-cover transition-transform will-change-transform"
            style={{ transform: `translateY(${parallaxY}px) scale(1.1)` }}
            priority
          />
        </div>
      )}

      {/* Gradient overlay — solid when no bg image, semi-transparent when bg image present */}
      <div
        className={`absolute inset-0 ${gradientStyles} ${backgroundImage ? "opacity-90" : ""}`}
        style={{ zIndex: backgroundImage ? 10 : 0 }}
      />

      <div className="container relative z-20 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
        {isCenter && !productLogo ? (
          /* Center-aligned layout (original) */
          <div className="relative z-20 max-w-4xl text-center mx-auto">
            {/* Badge */}
            {badge && (
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm mb-6 ${getBadgeVariantStyles(badge.variant || "amber", badge.customColor)}`}
              >
                {badge.icon && <span className="w-5 h-5">{badge.icon}</span>}
                <span className="text-sm font-semibold tracking-widest uppercase">
                  {badge.text}
                </span>
              </div>
            )}

            {/* Title */}
            {typeof title === "string" ? (
              <h1 className="text-5xl md:text-6xl lg:text-8xl font-bold mb-6 leading-tight tracking-tight">
                {title}
              </h1>
            ) : (
              <div className="mb-6">{title}</div>
            )}

            {/* Description */}
            {typeof description === "string" ? (
              <p className="text-xl md:text-2xl lg:text-3xl leading-relaxed mb-8 text-slate-400">
                {description}
              </p>
            ) : (
              <div className="text-xl md:text-2xl lg:text-3xl leading-relaxed mb-8 text-slate-400">
                {description}
              </div>
            )}

            {/* CTA Button */}
            {ctaButton && (
              <Button
                variant={
                  ctaButton.variant === "white"
                    ? "white"
                    : ctaButton.variant === "outline"
                      ? "outline"
                      : "default"
                }
                size="lg"
                asChild
              >
                <Link href={ctaButton.href}>
                  {ctaButton.text}
                  {ctaButton.icon && (
                    <span className="w-5 h-5">{ctaButton.icon}</span>
                  )}
                </Link>
              </Button>
            )}
          </div>
        ) : (
          /* Left-aligned layout with optional logo (asymmetric) */
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[50vh]">
            {/* Text Content */}
            <div className={`lg:col-span-7 ${productLogo ? "xl:col-span-7" : ""} z-20`}>
              {/* Badge */}
              {badge && (
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm mb-6 ${getBadgeVariantStyles(badge.variant || "amber", badge.customColor)}`}
                >
                  {badge.icon && <span className="w-5 h-5">{badge.icon}</span>}
                  <span className="text-sm font-semibold tracking-widest uppercase">
                    {badge.text}
                  </span>
                </div>
              )}

              {/* Title */}
              {typeof title === "string" ? (
                <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight tracking-tight">
                  {title}
                </h1>
              ) : (
                <div className="mb-6">{title}</div>
              )}

              {/* Description */}
              {typeof description === "string" ? (
                <p className="text-lg md:text-xl lg:text-2xl leading-relaxed mb-8 text-white/90 max-w-2xl">
                  {description}
                </p>
              ) : (
                <div className="text-lg md:text-xl lg:text-2xl leading-relaxed mb-8 text-white/90 max-w-2xl">
                  {description}
                </div>
              )}

              {/* CTA Button */}
              {ctaButton && (
                <Button
                  variant={
                    ctaButton.variant === "white"
                      ? "white"
                      : ctaButton.variant === "outline"
                        ? "outline"
                        : "default"
                  }
                  size="lg"
                  asChild
                >
                  <Link href={ctaButton.href}>
                    {ctaButton.text}
                    {ctaButton.icon && (
                      <span className="w-5 h-5">{ctaButton.icon}</span>
                    )}
                  </Link>
                </Button>
              )}
            </div>

            {/* Product Logo */}
            {productLogo && (
              <div className="lg:col-span-5 xl:col-span-5 flex justify-center lg:justify-end z-20">
                <div className="animate-in fade-in slide-in-from-right-8 duration-1000">
                  <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 shadow-2xl">
                    <Image
                      src={productLogo.src}
                      alt={productLogo.alt}
                      width={350}
                      height={350}
                      className="w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 xl:w-80 xl:h-80 object-contain rounded-2xl"
                      priority
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Legacy Floating Image (fallback) */}
            {!productLogo && floatingImage && (
              <div className="hidden xl:block lg:col-span-5 z-10">
                <div className="relative rounded-[32px] overflow-hidden shadow-2xl">
                  <Image
                    src={floatingImage.src}
                    alt={floatingImage.alt}
                    width={500}
                    height={500}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
