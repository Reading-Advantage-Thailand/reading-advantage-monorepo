import type { Metadata } from 'next';
import './globals.css';
import { ReactNode } from "react";
import { LocaleProvider } from '@/providers/locale-provider';
import { getMessages } from 'next-intl/server';

export const metadata: Metadata = {
  metadataBase: new URL('https://reading-advantage.com'),
  title: 'Reading Advantage (Thailand) - Innovative EdTech Solutions',
  description: 'Reading Advantage Thailand - Leading provider of AI-enhanced learning solutions for language learning, coding, and education technology.',
  keywords: 'education technology, AI learning, language learning, coding bootcamp, Thailand education',
  authors: [{ name: 'Reading Advantage Thailand' }],
  openGraph: {
    title: 'Reading Advantage Thailand - Innovative EdTech Solutions',
    description: 'Revolutionizing education with AI-enhanced learning solutions',
    images: ['/images/og-image.jpg'],
    url: 'https://reading-advantage.com',
  },
};

export default async function RootLayout({ params, children }: { params: Promise<{ locale: string }>, children: ReactNode }) {
  const { locale } = await params
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning={true}>
      <body className="bg-sky-50 text-sky-900 min-h-screen font-sans">
        <LocaleProvider locale={locale} messages={messages}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
