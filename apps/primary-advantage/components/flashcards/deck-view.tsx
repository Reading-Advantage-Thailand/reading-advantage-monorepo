// components/flashcards/single-deck-view-inline.tsx
"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Play,
  BookOpen,
  AlertCircle,
  Trophy,
  FileText,
  Target,
  Languages,
  TrendingUp,
  RefreshCw,
  Loader2,
  Brain,
  Zap,
  Clock,
  GraduationCap,
  CheckCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "@/i18n/navigation";
import { FlashcardGameInline } from "./flashcard-game";
import { getDeckCards } from "@/actions/flashcard";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

interface SingleDeckViewInlineProps {
  deck: {
    id: string;
    name: string | null;
    type: "VOCABULARY" | "SENTENCE";
    totalCards: number;
    dueCards: number;
    newCards: number;
    learningCards: number;
    reviewCards: number;
    createdAt: string;
    updatedAt: string;
  };
  showHeader?: boolean;
  showStats?: boolean;
  deckType?: "VOCABULARY" | "SENTENCE";
}

export const VOCABULARY_LANGUAGES = {
  en: {
    code: "en",
    name: "English",
    flag: "🇺🇸",
    nativeName: "English",
  },
  th: {
    code: "th",
    name: "Thai",
    flag: "🇹🇭",
    nativeName: "ไทย",
  },
  vi: {
    code: "vi",
    name: "Vietnamese",
    flag: "🇻🇳",
    nativeName: "Tiếng Việt",
  },
  cn: {
    code: "cn",
    name: "Chinese (Simplified)",
    flag: "🇨🇳",
    nativeName: "简体中文",
  },
  tw: {
    code: "tw",
    name: "Chinese (Traditional)",
    flag: "🇹🇼",
    nativeName: "繁體中文",
  },
};

export const SENTENCE_LANGUAGES = {
  th: {
    code: "th",
    name: "Thai",
    flag: "🇹🇭",
    nativeName: "ไทย",
  },
  vi: {
    code: "vi",
    name: "Vietnamese",
    flag: "🇻🇳",
    nativeName: "Tiếng Việt",
  },
  cn: {
    code: "cn",
    name: "Chinese (Simplified)",
    flag: "🇨🇳",
    nativeName: "简体中文",
  },
  tw: {
    code: "tw",
    name: "Chinese (Traditional)",
    flag: "🇹🇼",
    nativeName: "繁體中文",
  },
};

export function SingleDeckViewInline({
  deck,
  showHeader = true,
  showStats = true,
  deckType,
}: SingleDeckViewInlineProps) {
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameCards, setGameCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    deck.type === "VOCABULARY" ? "en" : "th",
  );
  const t = useTranslations("SentencesPage.sentencesCard");
  const tVocabulary = useTranslations("VocabularyPage");
  const handleStartStudying = async () => {
    if (deck.totalCards < 5) return;

    setIsLoading(true);

    try {
      const result = await getDeckCards(deck.id);

      if (result.success && result.cards.length > 0) {
        setGameCards(result.cards);
        setIsPlaying(true);
      } else if (result.cards.length === 0) {
        toast.info("No cards are due for review right now! ⏰");
      } else {
        toast.error(result.error || "Failed to load cards");
      }
    } catch (error) {
      console.error("Error loading cards:", error);
      toast.error("Failed to load cards");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGameComplete = () => {
    setIsPlaying(false);
    setGameCards([]);
    window.location.reload();
  };

  const handleBackToDeck = () => {
    setIsPlaying(false);
    setGameCards([]);
  };

  const canPlay = deck.totalCards >= 5;
  const hasCards = deck.dueCards > 0;
  const progressPercentage =
    deck.totalCards > 0
      ? ((deck.totalCards - deck.dueCards) / deck.totalCards) * 100
      : 0;

  if (isPlaying) {
    return (
      <FlashcardGameInline
        deck={deck}
        cards={gameCards}
        selectedLanguage={selectedLanguage}
        onComplete={handleGameComplete}
        onBack={handleBackToDeck}
      />
    );
  }

  const getLanguageOptions = () => {
    return deck.type === "VOCABULARY"
      ? VOCABULARY_LANGUAGES
      : SENTENCE_LANGUAGES;
  };

  const languageOptions = getLanguageOptions();

  return (
    <div className="container mx-auto max-w-3xl space-y-6">
      {/* Header */}

      {/* Main Deck Card */}
      <Card className="overflow-hidden">
        {/* <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-2xl">
                {deck.type === "VOCABULARY" ? (
                  <GraduationCap className="h-6 w-6 text-blue-500" />
                ) : (
                  <FileText className="h-6 w-6 text-green-500" />
                )}
                {deck.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant={deck.type === "VOCABULARY" ? "default" : "secondary"}
                  className="px-3 py-1"
                >
                  {deck.type === "VOCABULARY" ? "📚" : "📝"} {deck.type}
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  {deck.totalCards} cards
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader> */}

        <CardContent className="space-y-8">
          {/* Status Alert */}
          {!canPlay ? (
            <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                <div className="space-y-1">
                  <p className="font-medium">{t("needMoreCards")}</p>
                  <p className="text-sm">
                    {t("addMoreCards", { count: 5 - deck.totalCards })}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          ) : !hasCards ? (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <Trophy className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <div className="space-y-1">
                  <p className="font-medium">{t("allCaughtUp")}</p>
                  <p className="text-sm">{t("allCardsUpToDate")}</p>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <Play className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <div className="space-y-1">
                  <p className="font-medium">{t("readyToStudy")}</p>
                  <p className="text-sm">
                    {t("cardsReadyForReview", { count: deck.dueCards })}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">{t("learningProgress")}</span>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round(progressPercentage)}%
                </div>
                <p className="text-muted-foreground text-sm">{t("complete")}</p>
              </div>
            </div>

            <Progress value={progressPercentage} className="h-3" />

            <div className="text-muted-foreground flex justify-between text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                {t("mastered", { count: deck.totalCards - deck.dueCards })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-orange-500" />
                {t("toReview", { count: deck.dueCards })}
              </span>
            </div>
          </div>

          <Separator />

          {/* Card Status Grid */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-lg font-semibold">
              <Target className="h-5 w-5 text-purple-500" />
              {t("cardStatusBreakdown.title")}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="p-4 text-center">
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-600">
                      {deck.newCards}
                    </div>
                    <div className="text-muted-foreground text-sm font-medium">
                      {t("cardStatusBreakdown.new")}
                    </div>
                    <p className="text-xs text-blue-600">
                      {t("cardStatusBreakdown.newDescription")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                <CardContent className="p-4 text-center">
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-orange-600">
                      {deck.learningCards}
                    </div>
                    <div className="text-muted-foreground text-sm font-medium">
                      {t("cardStatusBreakdown.learning")}
                    </div>
                    <p className="text-xs text-orange-600">
                      {t("cardStatusBreakdown.learningDescription")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
                <CardContent className="p-4 text-center">
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">
                      {deck.reviewCards}
                    </div>
                    <div className="text-muted-foreground text-sm font-medium">
                      {t("cardStatusBreakdown.review")}
                    </div>
                    <p className="text-xs text-green-600">
                      {t("cardStatusBreakdown.reviewDescription")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Language Selector */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-indigo-500" />
              <Label className="text-base font-semibold">
                {t("translationLanguage")}
              </Label>
            </div>
            <Select
              value={selectedLanguage}
              onValueChange={(value) => {
                setSelectedLanguage(value);
                const language =
                  languageOptions[value as keyof typeof languageOptions];
                toast.success(
                  `Translation language changed to ${language.name}`,
                );
              }}
            >
              <SelectTrigger className="h-12">
                <SelectValue>
                  {selectedLanguage && (
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {
                          languageOptions[
                            selectedLanguage as keyof typeof languageOptions
                          ]?.flag
                        }
                      </span>
                      <div className="flex flex-col text-left">
                        <span className="font-medium">
                          {
                            languageOptions[
                              selectedLanguage as keyof typeof languageOptions
                            ]?.name
                          }
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {
                            languageOptions[
                              selectedLanguage as keyof typeof languageOptions
                            ]?.nativeName
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(languageOptions).map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{language.flag}</span>
                      <div className="flex flex-col">
                        <span className="font-medium">{language.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {language.nativeName}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {deck.type === "VOCABULARY"
                ? tVocabulary("translationLanguageDescription")
                : t("translationLanguageDescription")}
            </p>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-4">
            {canPlay && hasCards ? (
              <Button
                onClick={handleStartStudying}
                disabled={isLoading}
                className="h-14 w-full text-lg font-semibold"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t("loadingCards")}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    {t("startStudying", { count: deck.dueCards })}
                  </>
                )}
              </Button>
            ) : canPlay ? (
              <Button
                disabled
                className="h-14 w-full text-lg font-semibold"
                size="lg"
              >
                <Trophy className="mr-2 h-5 w-5" />
                All Caught Up! 🎉
              </Button>
            ) : (
              <Button
                onClick={() => router.push("/student/read")}
                variant="outline"
                className="h-14 w-full text-lg font-semibold"
                size="lg"
              >
                {deck.type === "VOCABULARY" ? (
                  <BookOpen className="mr-2 h-5 w-5" />
                ) : (
                  <FileText className="mr-2 h-5 w-5" />
                )}
                Read Articles to Add Cards
              </Button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="h-12"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("refreshData")}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/student/read")}
                className="h-12"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                {t("addMoreCardsButton")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
