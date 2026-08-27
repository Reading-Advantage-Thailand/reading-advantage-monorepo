"use client";

import { useScopedI18n } from "@/locales/client";

type ComparisonMark = "✔" | "✘" | "⚬";

interface ComparisonCell {
  value: string | ComparisonMark;
  title?: string;
  className?: string;
}

interface ComparisonRow {
  feature: string;
  readingAdvantage: ComparisonCell;
}

export function ComparisonTable() {
  const t = useScopedI18n("components.comparisonTable");

  const renderComparisonValue = (cell: ComparisonCell) => {
    const isMark =
      cell.value === "✔" || cell.value === "✘" || cell.value === "⚬";

    if (!isMark) return cell.value;

    const semanticLabel = {
      "✔": t("semanticLabels.included"),
      "✘": t("semanticLabels.unavailable"),
      "⚬": t("semanticLabels.partial"),
    }[cell.value];

    return (
      <>
        <span role="img" aria-label={semanticLabel} />
        <span aria-hidden="true">{cell.value}</span>
      </>
    );
  };

  const comparisonData: ComparisonRow[] = [
    {
      feature: t("features.gradeRange"),
      readingAdvantage: { value: "4-12" },
    },
    {
      feature: t("features.price"),
      readingAdvantage: { value: t("currentPricing") },
    },
    {
      feature: t("features.fiction"),
      readingAdvantage: {
        value: "✔",
        title: t("descriptions.fiction.readingAdvantage"),
        className: "text-green-600",
      },
    },
    {
      feature: t("features.nonfiction"),
      readingAdvantage: {
        value: "✔",
        title: t("descriptions.nonfiction.readingAdvantage"),
        className: "text-green-600",
      },
    },
    {
      feature: t("features.includesReadingMaterial"),
      readingAdvantage: {
        value: "✔",
        title: t("descriptions.includesReadingMaterial.readingAdvantage"),
        className: "text-green-600",
      },
    },
    {
      feature: t("features.deviceCompatibility"),
      readingAdvantage: {
        value: t("descriptions.deviceCompatibility.readingAdvantage"),
      },
    },
    {
      feature: t("features.audioSupport"),
      readingAdvantage: {
        value: "✔",
        title: t("descriptions.audioSupport.readingAdvantage"),
        className: "text-green-600",
      },
    },
    {
      feature: t("features.aiAssistant"),
      readingAdvantage: {
        value: "✔",
        title: t("descriptions.aiAssistant.readingAdvantage"),
        className: "text-green-600",
      },
    },
    {
      feature: t("features.ellSupport"),
      readingAdvantage: {
        value: t("descriptions.ellSupport.readingAdvantage"),
      },
    },
  ];

  return (
    <div className="max-w-full overflow-x-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-4">{t("title")}</h2>
        <p className="text-gray-600">{t("lastUpdated")}</p>
      </div>
      <table className="w-full bg-white shadow-lg rounded-lg overflow-hidden">
        <thead className="bg-sky-100">
          <tr>
            <th className="px-6 py-4 text-left">{t("tableHeaders.feature")}</th>
            <th className="px-6 py-4 text-center">
              {t("tableHeaders.readingAdvantage")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {comparisonData.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4">{row.feature}</td>
              <td
                className={`px-6 py-4 text-center ${row.readingAdvantage.className}`}
                title={row.readingAdvantage.title}
              >
                {renderComparisonValue(row.readingAdvantage)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
