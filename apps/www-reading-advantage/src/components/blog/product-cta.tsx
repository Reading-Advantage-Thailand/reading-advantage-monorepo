import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ProductCTAProps {
  product?: string;
  locale: string;
}

function getProductName(path: string): string {
  const segment = path.split("/").pop() || "";
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ProductCTA({ product, locale }: ProductCTAProps) {
  if (!product) return null;

  const isThai = locale === "th";
  const productName = getProductName(product);
  const label = isThai
    ? `เรียนรู้เพิ่มเติมเกี่ยวกับ ${productName}`
    : `Learn more about ${productName}`;

  return (
    <div className="my-8 p-6 bg-gradient-to-br from-sky-50 to-sky-100 rounded-2xl border border-sky-200">
      <h3 className="text-xl font-bold text-slate-900 mb-2">
        {isThai ? "สนใจเรียนรู้เพิ่มเติม?" : "Want to learn more?"}
      </h3>
      <p className="text-slate-700 mb-4">
        {isThai
          ? `สำรวจว่า ${productName} สามารถช่วยเหลือลูกของคุณได้อย่างไร`
          : `Explore how ${productName} can help your child`}
      </p>
      <Link
        href={product}
        className="inline-flex items-center gap-2 font-semibold text-sky-600 hover:text-sky-800 transition-all duration-300"
      >
        <span>{label}</span>
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </div>
  );
}
