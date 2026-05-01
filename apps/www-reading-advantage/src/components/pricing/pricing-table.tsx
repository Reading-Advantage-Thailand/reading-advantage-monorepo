'use client';

import { useScopedI18n } from "@/locales/client";

interface PricingFeature {
  name: string;
  basic: string | boolean | 'coming-soon';
  aiEnhanced: string | boolean | 'coming-soon';
  aiTutor: string | boolean | 'coming-soon';
}

export function PricingTable() {
  const t = useScopedI18n('components.pricingTable');

  const pricingFeatures: PricingFeature[] = [
    {
      name: t('pricingFeatures.0.name'),
      basic: t('pricingFeatures.0.basic'),
      aiEnhanced: t('pricingFeatures.0.aiEnhanced'),
      aiTutor: t('pricingFeatures.0.aiTutor'),
    },
    {
      name: t('pricingFeatures.1.name'),
      basic: true,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.2.name'),
      basic: true,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.3.name'),
      basic: true,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.4.name'),
      basic: true,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.5.name'),
      basic: true,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.6.name'),
      basic: true,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.7.name'),
      basic: true,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.8.name'),
      basic: true,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.9.name'),
      basic: true,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.10.name'),
      basic: true,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.11.name'),
      basic: true,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.12.name'),
      basic: true,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.13.name'),
      basic: true,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.14.name'),
      basic: true,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.15.name'),
      basic: false,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.16.name'),
      basic: false,
      aiEnhanced: true,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.17.name'),
      basic: false,
      aiEnhanced: false,
      aiTutor: true,
    },
    {
      name: t('pricingFeatures.18.name'),
      basic: 'coming-soon',
      aiEnhanced: 'coming-soon',
      aiTutor: 'coming-soon',
    },
    {
      name: t('pricingFeatures.19.name'),
      basic: 'coming-soon',
      aiEnhanced: 'coming-soon',
      aiTutor: 'coming-soon',
    },
    {
      name: t('pricingFeatures.20.name'),
      basic: false,
      aiEnhanced: 'coming-soon',
      aiTutor: 'coming-soon',
    },
    {
      name: t('pricingFeatures.21.name'),
      basic: false,
      aiEnhanced: false,
      aiTutor: 'coming-soon',
    },
    {
      name: t('pricingFeatures.22.name'),
      basic: false,
      aiEnhanced: false,
      aiTutor: 'coming-soon',
    },
    {
      name: t('pricingFeatures.23.name'),
      basic: false,
      aiEnhanced: false,
      aiTutor: 'coming-soon',
    },
    {
      name: t('pricingFeatures.24.name'),
      basic: false,
      aiEnhanced: false,
      aiTutor: 'coming-soon',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <p className="text-right mb-4 text-gray-600">{t('table.lastUpdated')}</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white shadow-lg rounded-lg">
          <thead>
            <tr className="bg-sky-100">
              <th className="p-4 text-left border-b">{t('table.title')}</th>
              <th className="p-4 text-center border-b">{t('table.basicTier')}</th>
              <th className="p-4 text-center border-b">{t('table.aiEnhancedTier')}</th>
              <th className="p-4 text-center border-b">{t('table.aiTutorTier')}</th>
            </tr>
          </thead>
          <tbody>
            {pricingFeatures.map((feature, index) => (
              <tr key={index} className="hover:bg-sky-50">
                <td className="p-4 border-b feature-name">{feature.name}</td>
                <td className="p-4 border-b text-center">
                  {typeof feature.basic === 'boolean'
                    ? feature.basic
                      ? <span className="check"></span>
                      : ''
                    : feature.basic === 'coming-soon'
                      ? <span className="coming-soon">{t('comingSoon')}</span>
                      : feature.basic}
                </td>
                <td className="p-4 border-b text-center">
                  {typeof feature.aiEnhanced === 'boolean'
                    ? feature.aiEnhanced
                      ? <span className="check"></span>
                      : ''
                    : feature.aiEnhanced === 'coming-soon'
                      ? <span className="coming-soon">{t('comingSoon')}</span>
                      : feature.aiEnhanced}
                </td>
                <td className="p-4 border-b text-center">
                  {typeof feature.aiTutor === 'boolean'
                    ? feature.aiTutor
                      ? <span className="check"></span>
                      : ''
                    : feature.aiTutor === 'coming-soon'
                      ? <span className="coming-soon">{t('comingSoon')}</span>
                      : feature.aiTutor}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
