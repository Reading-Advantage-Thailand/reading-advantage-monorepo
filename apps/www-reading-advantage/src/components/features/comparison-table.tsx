'use client';

import { useScopedI18n } from "@/locales/client";

type ComparisonMark = '✔' | '✘' | '⚬';

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
  const t = useScopedI18n('components.comparisonTable');

  const comparisonData: ComparisonRow[] = [
    {
      feature: t('features.gradeRange'),
      readingAdvantage: { value: '4-12' },
      razKids: { value: 'K-5' },
      lexiaCore5: { value: 'K-5' },
      acceleratedReader: { value: 'K-12' },
      achieve3000: { value: '2-12' },
    },
    {
      feature: t('features.price'),
      readingAdvantage: { value: '$36-120' },
      razKids: { value: '$4.30 - $10' },
      lexiaCore5: { value: '$40 - $60' },
      acceleratedReader: { value: '$5 - $10' },
      achieve3000: { value: '$45 - $60' },
    },
    {
      feature: t('features.fiction'),
      readingAdvantage: { value: '✔', title: t('descriptions.fiction.readingAdvantage'), className: 'text-green-600' },
      razKids: { value: '✔', title: t('descriptions.fiction.razKids'), className: 'text-green-600' },
      lexiaCore5: { value: '⚬', title: t('descriptions.fiction.lexiaCore5'), className: 'text-orange-500' },
      acceleratedReader: { value: '✔', title: t('descriptions.fiction.acceleratedReader'), className: 'text-green-600' },
      achieve3000: { value: '⚬', title: t('descriptions.fiction.achieve3000'), className: 'text-orange-500' },
    },
    {
      feature: t('features.nonfiction'),
      readingAdvantage: { value: '✔', title: t('descriptions.nonfiction.readingAdvantage'), className: 'text-green-600' },
      razKids: { value: '✔', title: t('descriptions.nonfiction.razKids'), className: 'text-green-600' },
      lexiaCore5: { value: '⚬', title: t('descriptions.nonfiction.lexiaCore5'), className: 'text-orange-500' },
      acceleratedReader: { value: '✔', title: t('descriptions.nonfiction.acceleratedReader'), className: 'text-green-600' },
      achieve3000: { value: '✔', title: t('descriptions.nonfiction.achieve3000'), className: 'text-green-600' },
    },
    {
      feature: t('features.includesReadingMaterial'),
      readingAdvantage: { value: '✔', title: t('descriptions.includesReadingMaterial.readingAdvantage'), className: 'text-green-600' },
      razKids: { value: '✔', title: t('descriptions.includesReadingMaterial.razKids'), className: 'text-green-600' },
      lexiaCore5: { value: '✔', title: t('descriptions.includesReadingMaterial.lexiaCore5'), className: 'text-green-600' },
      acceleratedReader: { value: '✘', title: t('descriptions.includesReadingMaterial.acceleratedReader'), className: 'text-red-600' },
      achieve3000: { value: '✔', title: t('descriptions.includesReadingMaterial.achieve3000'), className: 'text-green-600' },
    },
    {
      feature: t('features.deviceCompatibility'),
      readingAdvantage: { value: t('descriptions.deviceCompatibility.readingAdvantage') },
      razKids: { value: t('descriptions.deviceCompatibility.razKids') },
      lexiaCore5: { value: t('descriptions.deviceCompatibility.lexiaCore5') },
      acceleratedReader: { value: t('descriptions.deviceCompatibility.acceleratedReader') },
      achieve3000: { value: t('descriptions.deviceCompatibility.achieve3000') },
    },
    {
      feature: t('features.audioSupport'),
      readingAdvantage: { value: '✔', title: t('descriptions.audioSupport.readingAdvantage'), className: 'text-green-600' },
      razKids: { value: '✔', title: t('descriptions.audioSupport.razKids'), className: 'text-green-600' },
      lexiaCore5: { value: '⚬', title: t('descriptions.audioSupport.lexiaCore5'), className: 'text-orange-500' },
      acceleratedReader: { value: '✘', title: t('descriptions.audioSupport.acceleratedReader'), className: 'text-red-600' },
      achieve3000: { value: '✔', title: t('descriptions.audioSupport.achieve3000'), className: 'text-green-600' },
    },
    {
      feature: t('features.aiAssistant'),
      readingAdvantage: { value: '✔', title: t('descriptions.aiAssistant.readingAdvantage'), className: 'text-green-600' },
      razKids: { value: '✘', className: 'text-red-600' },
      lexiaCore5: { value: '✘', className: 'text-red-600' },
      acceleratedReader: { value: '✘', className: 'text-red-600' },
      achieve3000: { value: '✘', className: 'text-red-600' },
    },
    {
      feature: t('features.ellSupport'),
      readingAdvantage: { value: t('descriptions.ellSupport.readingAdvantage') },
      razKids: { value: t('descriptions.ellSupport.razKids') },
      lexiaCore5: { value: t('descriptions.ellSupport.lexiaCore5') },
      acceleratedReader: { value: t('descriptions.ellSupport.acceleratedReader') },
      achieve3000: { value: t('descriptions.ellSupport.achieve3000') },
    },
  ];

  return (
    <div className="max-w-full overflow-x-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-4">{t('title')}</h2>
        <p className="text-gray-600">{t('lastUpdated')}</p>
      </div>
      <table className="w-full bg-white shadow-lg rounded-lg overflow-hidden">
        <thead className="bg-sky-100">
          <tr>
            <th className="px-6 py-4 text-left">{t('tableHeaders.feature')}</th>
            <th className="px-6 py-4 text-center">{t('tableHeaders.readingAdvantage')}</th>
            <th className="px-6 py-4 text-center">{t('tableHeaders.razKids')}</th>
            <th className="px-6 py-4 text-center">{t('tableHeaders.lexiaCore5')}</th>
            <th className="px-6 py-4 text-center">{t('tableHeaders.acceleratedReader')}</th>
            <th className="px-6 py-4 text-center">{t('tableHeaders.achieve3000')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {comparisonData.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4">{row.feature}</td>
              <td className={`px-6 py-4 text-center ${row.readingAdvantage.className}`} title={row.readingAdvantage.title}>
                {row.readingAdvantage.value}
              </td>
              <td className={`px-6 py-4 text-center ${row.razKids.className}`} title={row.razKids.title}>
                {row.razKids.value}
              </td>
              <td className={`px-6 py-4 text-center ${row.lexiaCore5.className}`} title={row.lexiaCore5.title}>
                {row.lexiaCore5.value}
              </td>
              <td className={`px-6 py-4 text-center ${row.acceleratedReader.className}`} title={row.acceleratedReader.title}>
                {row.acceleratedReader.value}
              </td>
              <td className={`px-6 py-4 text-center ${row.achieve3000.className}`} title={row.achieve3000.title}>
                {row.achieve3000.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
