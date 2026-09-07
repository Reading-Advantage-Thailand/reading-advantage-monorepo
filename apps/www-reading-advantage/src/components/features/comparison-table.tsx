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
  razKids: ComparisonCell;
  lexiaCore5: ComparisonCell;
  acceleratedReader: ComparisonCell;
  achieve3000: ComparisonCell;
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

  const unsupportedCompetitor: ComparisonCell = { value: "" };
  const competitorCells = {
    razKids: unsupportedCompetitor,
    lexiaCore5: unsupportedCompetitor,
    acceleratedReader: unsupportedCompetitor,
    achieve3000: unsupportedCompetitor,
  };
  const comparisonData: ComparisonRow[] = [
    {
      feature: t("features.gradeRange"),
      readingAdvantage: { value: "4-12" },
      ...competitorCells,
    },
    {
      feature: t("features.price"),
      readingAdvantage: { value: t("currentPricing") },
      ...competitorCells,
    },
    {
      feature: t("features.fiction"),
      readingAdvantage: {
        value: "✔",
        title: t("descriptions.fiction.readingAdvantage"),
        className: "text-green-600",
      },
      ...competitorCells,
    },
    {
      feature: t("features.nonfiction"),
      readingAdvantage: {
        value: "✔",
        title: t("descriptions.nonfiction.readingAdvantage"),
        className: "text-green-600",
      },
      ...competitorCells,
    },
    {
      feature: t("features.includesReadingMaterial"),
      readingAdvantage: {
        value: "✔",
        title: t("descriptions.includesReadingMaterial.readingAdvantage"),
        className: "text-green-600",
      },
      ...competitorCells,
    },
    {
      feature: t("features.deviceCompatibility"),
      readingAdvantage: {
        value: t("descriptions.deviceCompatibility.readingAdvantage"),
      },
      ...competitorCells,
    },
    {
      feature: t("features.audioSupport"),
      readingAdvantage: {
        value: "✔",
        title: t("descriptions.audioSupport.readingAdvantage"),
        className: "text-green-600",
      },
      ...competitorCells,
    },
    {
      feature: t("features.aiAssistant"),
      readingAdvantage: {
        value: "✔",
        title: t("descriptions.aiAssistant.readingAdvantage"),
        className: "text-green-600",
      },
      ...competitorCells,
    },
    {
      feature: t("features.ellSupport"),
      readingAdvantage: {
        value: t("descriptions.ellSupport.readingAdvantage"),
      },
      ...competitorCells,
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
            <th className="px-6 py-4 text-center">
              {t("tableHeaders.razKids")}
            </th>
            <th className="px-6 py-4 text-center">
              {t("tableHeaders.lexiaCore5")}
            </th>
            <th className="px-6 py-4 text-center">
              {t("tableHeaders.acceleratedReader")}
            </th>
            <th className="px-6 py-4 text-center">
              {t("tableHeaders.achieve3000")}
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
              <td
                className={`px-6 py-4 text-center ${row.razKids.className}`}
                title={row.razKids.title}
                aria-label={
                  row.razKids.value === ""
                    ? t("semanticLabels.notVerified")
                    : undefined
                }
              >
                {renderComparisonValue(row.razKids)}
              </td>
              <td
                className={`px-6 py-4 text-center ${row.lexiaCore5.className}`}
                title={row.lexiaCore5.title}
                aria-label={
                  row.lexiaCore5.value === ""
                    ? t("semanticLabels.notVerified")
                    : undefined
                }
              >
                {renderComparisonValue(row.lexiaCore5)}
              </td>
              <td
                className={`px-6 py-4 text-center ${row.acceleratedReader.className}`}
                title={row.acceleratedReader.title}
                aria-label={
                  row.acceleratedReader.value === ""
                    ? t("semanticLabels.notVerified")
                    : undefined
                }
              >
                {renderComparisonValue(row.acceleratedReader)}
              </td>
              <td
                className={`px-6 py-4 text-center ${row.achieve3000.className}`}
                title={row.achieve3000.title}
                aria-label={
                  row.achieve3000.value === ""
                    ? t("semanticLabels.notVerified")
                    : undefined
                }
              >
                {renderComparisonValue(row.achieve3000)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
