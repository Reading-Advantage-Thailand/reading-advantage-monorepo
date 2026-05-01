import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reading Advantage - AI-Powered Language Learning Platform",
  description: "Transform language learning with Reading Advantage's AI-powered extensive reading platform. Personalized content, interactive activities, and proven results.",
  openGraph: {
    title: "Reading Advantage - AI-Powered Language Learning Platform",
    description: "Transform language learning with Reading Advantage's AI-powered extensive reading platform",
    images: ["/images/reading-advantage-demo.png"],
  },
}

export default function ReadingAdvantageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
