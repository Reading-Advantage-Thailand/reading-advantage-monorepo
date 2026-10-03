"use client";

import { Link } from "@/locales/navigation";
import { useScopedI18n } from "@/locales/client";

type Cell = string | boolean | "coming-soon";

interface PricingFeature {
  name: string;
  appOnly: Cell;
  blended: Cell;
  managed: Cell;
  managedIsContact?: boolean;
}

/** Feature rows 2 to 13: whether App-Only and Blended Learning include the row. */
const FEATURE_ROWS: Array<{ appOnly: boolean; blended: boolean }> = [
  { appOnly: true, blended: true },
  { appOnly: true, blended: true },
  { appOnly: true, blended: true },
  { appOnly: true, blended: true },
  { appOnly: true, blended: true },
  { appOnly: true, blended: true },
  { appOnly: true, blended: true },
  { appOnly: true, blended: true },
  { appOnly: true, blended: true },
  { appOnly: false, blended: true },
  { appOnly: false, blended: true },
  { appOnly: false, blended: false },
];

export function PricingTable() {
  const t = useScopedI18n("components.pricingTable");

  const pricingFeatures: PricingFeature[] = [
    {
      name: t("pricingFeatures.0.name"),
      appOnly: t("pricingFeatures.0.appOnly"),
      blended: t("pricingFeatures.0.blended"),
      managed: t("pricingFeatures.0.managed"),
      managedIsContact: true,
    },
    {
      name: t("pricingFeatures.1.name"),
      appOnly: t("pricingFeatures.1.appOnly"),
      blended: t("pricingFeatures.1.blended"),
      managed: t("pricingFeatures.1.managed"),
    },
    ...[
      "pricingFeatures.2.name",
      "pricingFeatures.3.name",
      "pricingFeatures.4.name",
      "pricingFeatures.5.name",
      "pricingFeatures.6.name",
      "pricingFeatures.7.name",
      "pricingFeatures.8.name",
      "pricingFeatures.9.name",
      "pricingFeatures.10.name",
      "pricingFeatures.11.name",
      "pricingFeatures.12.name",
      "pricingFeatures.13.name",
    ].map((key, index): PricingFeature => ({
      name: t(key as "pricingFeatures.2.name"),
      appOnly: FEATURE_ROWS[index].appOnly,
      blended: FEATURE_ROWS[index].blended,
      managed: "coming-soon",
    })),
  ];

  const renderCell = (value: Cell, isContact = false) => {
    if (typeof value === "boolean") {
      return value ? (
        <span className="check" role="img" aria-label="Included"></span>
      ) : (
        ""
      );
    }
    if (value === "coming-soon") {
      return (
        <span className="coming-soon text-amber-800">{t("comingSoon")}</span>
      );
    }
    if (isContact) {
      return (
        <Link href="/contact" className="text-sky-700 underline font-medium">
          {value}
        </Link>
      );
    }
    return value;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <p className="text-right mb-4 text-site-body">{t("table.lastUpdated")}</p>
      <p className="mb-4 text-slate-700">{t("table.unitNote")}</p>

      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label={t("table.title")}
      >
        <table className="w-full border-collapse bg-white shadow-lg rounded-lg">
          <thead>
            <tr className="bg-sky-100">
              <th className="p-4 text-left border-b">{t("table.title")}</th>
              <th className="p-4 text-center border-b">
                {t("table.appOnlyTier")}
              </th>
              <th className="p-4 text-center border-b">
                {t("table.blendedTier")}
              </th>
              <th className="p-4 text-center border-b">
                {t("table.managedTier")}
              </th>
            </tr>
          </thead>
          <tbody>
            {pricingFeatures.map((feature, index) => (
              <tr key={index} className="hover:bg-sky-50">
                <td className="p-4 border-b feature-name">{feature.name}</td>
                <td className="p-4 border-b text-center">
                  {renderCell(feature.appOnly)}
                </td>
                <td className="p-4 border-b text-center">
                  {renderCell(feature.blended)}
                </td>
                <td className="p-4 border-b text-center">
                  {renderCell(feature.managed, feature.managedIsContact)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-slate-700">{t("table.managedNote")}</p>

      <div className="mt-10 bg-sky-50 rounded-3xl p-8 shadow-lg">
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {t("tutorCard.title")}
        </h3>
        <p className="text-slate-700 mb-4">{t("tutorCard.description")}</p>
        <Link
          href="/products/tutor-advantage"
          className="text-sky-700 underline font-medium"
        >
          {t("tutorCard.link")}
        </Link>
      </div>
    </div>
  );
}
