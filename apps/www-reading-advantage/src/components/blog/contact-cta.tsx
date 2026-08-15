import { Link } from "@/locales/navigation";
import { getScopedI18n } from "@/locales/server";
import { ArrowRight } from "lucide-react";

interface ContactCTAProps {
  locale: string;
}

/**
 * Renders a localized invitation to contact the team.
 * @param props The CTA locale props.
 * @returns The contact CTA.
 */
export async function ContactCTA({ locale: _locale }: ContactCTAProps) {
  const t = await getScopedI18n("components.blog.contactCta");

  return (
    <div className="my-8 p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border border-amber-200">
      <h3 className="text-xl font-bold text-slate-900 mb-2">{t("title")}</h3>
      <p className="text-slate-700 mb-4">{t("description")}</p>
      <Link
        href="/contact"
        className="inline-flex items-center gap-2 font-semibold text-amber-600 hover:text-amber-800 transition-all duration-300"
      >
        <span>{t("action")}</span>
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </div>
  );
}
