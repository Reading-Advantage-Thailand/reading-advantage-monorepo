// components/flashcards/empty-dashboard.tsx
"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Target,
  FileText,
  ArrowRight,
  CheckCircle,
  GraduationCap,
  Brain,
  Zap,
  Globe,
  Clock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useScopedI18n } from "@/locales/client";

interface EmptyDashboardProps {
  deckType?: "VOCABULARY" | "SENTENCE";
}

export function EmptyDashboard({ deckType }: EmptyDashboardProps) {
  const t = useScopedI18n("components.flashcards.emptyDeck");
  const scope = deckType === "VOCABULARY" || deckType === "SENTENCE" ? deckType.toLowerCase() as "vocabulary" | "sentence" : "all";

  const getContent = () => {
    const variant = {
      icon:
        deckType === "VOCABULARY" ? (
          <GraduationCap className="h-16 w-16" />
        ) : deckType === "SENTENCE" ? (
          <FileText className="h-16 w-16" />
        ) : (
          <Brain className="h-16 w-16" />
        ),
      title: t(`${scope}.title`),
      description: t(`${scope}.description`),
      actionText: t(`${scope}.actionText`),
      gradient:
        deckType === "VOCABULARY"
          ? "from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20"
          : deckType === "SENTENCE"
            ? "from-green-50 to-emerald-100 dark:from-green-950/20 dark:to-emerald-950/20"
            : "from-purple-50 to-pink-100 dark:from-purple-950/20 dark:to-pink-950/20",
      iconColor:
        deckType === "VOCABULARY"
          ? "text-blue-500"
          : deckType === "SENTENCE"
            ? "text-green-500"
            : "text-purple-500",
      badgeColor:
        deckType === "VOCABULARY"
          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          : deckType === "SENTENCE"
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      steps: [
        {
          icon: deckType === "SENTENCE" ? FileText : BookOpen,
          text: t(`${scope}.step1Text`),
          desc: t(`${scope}.step1Desc`),
          color: deckType === "SENTENCE" ? "text-green-500" : "text-blue-500",
          bgColor:
            deckType === "SENTENCE"
              ? "bg-green-50 dark:bg-green-950/20"
              : "bg-blue-50 dark:bg-blue-950/20",
        },
        {
          icon: Target,
          text: t(`${scope}.step2Text`),
          desc: t(`${scope}.step2Desc`),
          color: deckType === "VOCABULARY" ? "text-green-500" : "text-blue-500",
          bgColor:
            deckType === "VOCABULARY"
              ? "bg-green-50 dark:bg-green-950/20"
              : "bg-blue-50 dark:bg-blue-950/20",
        },
        {
          icon: CheckCircle,
          text: t(`${scope}.step3Text`),
          desc: t(`${scope}.step3Desc`),
          color: "text-purple-500",
          bgColor: "bg-purple-50 dark:bg-purple-950/20",
        },
      ],
    };
    return variant;
  };

  const content = getContent();

  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-12">
      {/* Hero Section with Header Component */}
      <div className="space-y-6">
        <Card
          className={`overflow-hidden bg-gradient-to-br ${content.gradient}`}
        >
          <CardContent className="p-12 text-center">
            <div className="space-y-8">
              <div className="relative">
                <div className="animate-pulse">
                  <div
                    className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/80 shadow-lg dark:bg-gray-900/80 ${content.iconColor}`}
                  >
                    {content.icon}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Badge
                  variant="secondary"
                  className={`${content.badgeColor} px-4 py-2 text-sm font-semibold`}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {deckType ? `${deckType} DECK` : t("badgeDefault")}
                </Badge>

                <p className="text-muted-foreground text-lg">
                  {t("readyPrompt")}
                </p>
              </div>

              <Button
                asChild
                size="lg"
                className="mt-8 h-14 px-8 text-lg font-semibold"
              >
                <Link href="/student/read">
                  <BookOpen className="mr-2 h-5 w-5" />
                  {content.actionText}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <div className="space-y-8">
        <div className="space-y-3 text-center">
          <h2 className="text-2xl font-bold">{t("howItWorksTitle")}</h2>
          <p className="text-muted-foreground text-lg">
            {t("howItWorksDescription")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {content.steps.map((step, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg"
            >
              <div className={`absolute inset-0 ${step.bgColor} opacity-50`} />
              <CardHeader className="relative pb-4 text-center">
                <div
                  className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${step.bgColor} shadow-md ${step.color}`}
                >
                  <step.icon className="h-8 w-8" />
                </div>
                <Badge variant="outline" className="mx-auto mb-3 border-2">
                  {t("stepLabel", { step: index + 1 })}
                </Badge>
                <CardTitle className="text-xl font-semibold">
                  {step.text}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative pt-0 text-center">
                <p className="text-muted-foreground">{step.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <Card>
        <CardContent className="p-10">
          <div className="space-y-8 text-center">
            <div className="space-y-3">
              <h3 className="text-2xl font-bold">{t("whyTitle")}</h3>
              <p className="text-muted-foreground">{t("whyDescription")}</p>
            </div>

            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {[
                { icon: Brain, color: "text-purple-500", title: t("feature1Title"), desc: t("feature1Desc") },
                { icon: Target, color: "text-blue-500", title: t("feature2Title"), desc: t("feature2Desc") },
                { icon: Zap, color: "text-green-500", title: t("feature3Title"), desc: t("feature3Desc") },
                { icon: Globe, color: "text-orange-500", title: t("feature4Title"), desc: t("feature4Desc") },
              ].map((feature, index) => (
                <div key={index} className="group space-y-4 text-center">
                  <div
                    className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 ${feature.color} transition-transform duration-200 group-hover:scale-110`}
                  >
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold">{feature.title}</div>
                    <p className="text-muted-foreground text-sm">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final CTA */}
      <div className="space-y-6 text-center">
        <div className="space-y-3">
          <h3 className="text-2xl font-bold">{t("finalTitle")}</h3>
          <p className="text-muted-foreground text-lg">
            {t("finalDescription")}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="h-12 px-8">
            <Link href="/student/read">
              <BookOpen className="mr-2 h-4 w-4" />
              {t("startReadingNow")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-8">
            <Link href="/student/read">
              <Clock className="mr-2 h-4 w-4" />
              {t("browseArticles")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
