import { Link } from "@/locales/navigation";
import { getScopedI18n } from "@/locales/server";
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

/**
 * Renders a localized CTA for a product page.
 * @param props The product and locale props.
 * @returns The product CTA or no content.
 */
export async function ProductCTA({
  product,
  locale: _locale,
}: ProductCTAProps) {
  if (!product) return null;

  const t = await getScopedI18n("components.blog.productCta");
  const productName = getProductName(product);

  return (
    <div className="my-8 p-6 bg-gradient-to-br from-sky-50 to-sky-100 rounded-2xl border border-sky-200">
      <h3 className="text-xl font-bold text-slate-900 mb-2">{t("title")}</h3>
      <p className="text-slate-700 mb-4">
        {t("description", { product: productName })}
      </p>
      <Link
        href={product}
        className="inline-flex items-center gap-2 font-semibold text-sky-600 hover:text-sky-800 transition-all duration-300"
      >
        <span>{t("action", { product: productName })}</span>
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </div>
  );
}
