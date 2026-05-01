"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ProductCardProps {
  title: string;
  gradeRange: string;
  description: string;
  href: string;
  ctaLabel: string;
  index: number;
}

export default function ProductCard({ title, gradeRange, description, href, ctaLabel, index }: ProductCardProps) {
  return (
    <div
      className="group h-full animate-in fade-in slide-in-from-bottom-8 duration-500 transition-all duration-300 hover:-translate-y-1"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="h-full p-8 rounded-2xl modern-card border-0 shadow-card hover:shadow-card-hover transition-all duration-300">
        <div className="text-sm font-semibold uppercase tracking-wide text-sky-600 mb-3">
          {gradeRange}
        </div>
        <h3 className="text-2xl font-bold mb-4 text-gray-800 group-hover:text-sky-700 transition-colors">
          {title}
        </h3>
        <p className="text-gray-600 mb-8 leading-relaxed flex-grow">{description}</p>
        <Link
          href={href}
          className="inline-flex items-center gap-2 font-semibold text-sky-600 hover:text-sky-800 group-hover:gap-3 transition-all duration-300"
        >
          <span>{ctaLabel}</span>
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}