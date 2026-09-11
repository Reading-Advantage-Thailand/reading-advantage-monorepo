// components/flashcards/single-deck-view-inline.tsx
"use client";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
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
import { useRouter } from "next/navigation";
import { FlashcardGameInline } from "./flashcard-game";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDeckCards } from "@/actions/flashcard";

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
  onDeckUpdate?: () => void; // Add callback for updating deck data
}

const VOCABULARY_LANGUAGES = {
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

const SENTENCE_LANGUAGES = {
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
  onDeckUpdate,
}: SingleDeckViewInlineProps) {
  const router = useRouter();
  const { toast } = useToast();
  const currentLocale = useCurrentLocale();
  const t = useScopedI18n("components.flashcards.deck");
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameCards, setGameCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Function to detect user's language preference based on current locale
  const detectUserLanguage = (deckType: "VOCABULARY" | "SENTENCE"): string => {
    // Map locale to supported languages
    const languageMap: Record<string, string> = {
      en: "en",
      th: "th",
      vi: "vi",
      zh: "cn",
      "zh-CN": "cn",
      "zh-TW": "tw",
    };

    const detectedLang = languageMap[currentLocale] || currentLocale;

    // For VOCABULARY deck, check if detected language is supported
    if (deckType === "VOCABULARY") {
      const supportedVocabLangs = ["en", "th", "vi", "cn", "tw"];
      return detectedLang && supportedVocabLangs.includes(detectedLang)
        ? detectedLang
        : "en"; // Default to English for vocabulary
    } else {
      // For SENTENCE deck
      const supportedSentenceLangs = ["th", "vi", "cn", "tw"];
      return detectedLang && supportedSentenceLangs.includes(detectedLang)
        ? detectedLang
        : "en"; // Default to Thai for sentences
    }
  };

  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    detectUserLanguage(deck.type)
  );

  const handleStartStudying = async () => {
    if (deck.totalCards < 5) return;

    setIsLoading(true);

    try {
      const result = await getDeckCards(deck.id);

      if (result.success && result.cards.length > 0) {
        setGameCards(result.cards);
        setIsPlaying(true);
      } else if (result.cards.length === 0) {
        toast({
          title: t("noCardsTitle"),
          description: t("noCardsDesc"),
        });
      } else {
        toast({
          variant: "destructive",
          title: t("errorTitle"),
          description: result.error || t("loadCardsError"),
        });
      }
    } catch (error) {
      console.error("Error loading cards:", error);
      toast({
        variant: "destructive",
        title: t("errorTitle"),
        description: t("loadCardsError"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGameComplete = async () => {
    // Add a small delay to ensure XP toast is visible before updating data
    setTimeout(() => {
      setIsPlaying(false);
      setGameCards([]);

      // Use the callback to refresh data instead of full page reload
      if (onDeckUpdate) {
        onDeckUpdate();
      } else {
        // Fallback to router refresh if callback not provided
        router.refresh();
      }
    }, 1000); // Reduced to 1 second since toast now shows properly with better timing
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
        cards={gameCards}
        deckId={deck.id}
        deckName={deck.name || t("defaultDeckName")}
        deckType={deck.type}
        selectedLanguage={selectedLanguage}
        onComplete={handleGameComplete}
        onExit={handleBackToDeck}
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
    <div className="w-full">
      {/* Main Deck Card */}
      <Card className="overflow-hidden mx-2">
        <CardContent className="space-y-8 mt-10">
          {/* Status Alert */}
          {!canPlay ? (
            <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                <div className="space-y-1">
                  <p className="font-medium">
                    {t("needMoreCardsTitle")}
                  </p>
                  <p className="text-sm">
                    {t("needMoreCardsDesc", { count: 5 - deck.totalCards })}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          ) : !hasCards ? (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <Trophy className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <div className="space-y-1">
                  <p className="font-medium">{t("allCaughtUpTitle")}</p>
                  <p className="text-sm">{t("allCaughtUpDesc")}</p>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <Play className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <div className="space-y-1">
                  <p className="font-medium">{t("readyTitle")}</p>
                  <p className="text-sm">
                    {t("readyDesc", { count: deck.dueCards })}
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
                <p className="text-muted-foreground text-sm">{t("completeLabel")}</p>
              </div>
            </div>

            <Progress value={progressPercentage} className="h-3" />

            <div className="text-muted-foreground flex justify-between text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                {t("masteredLabel", { count: deck.totalCards - deck.dueCards })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-orange-500" />
                {t("toReviewLabel", { count: deck.dueCards })}
              </span>
            </div>
          </div>

          <Separator />

          {/* Card Status Grid */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-lg font-semibold">
              <Target className="h-5 w-5 text-purple-500" />
              {t("cardStatusTitle")}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="p-4 text-center">
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-600">
                      {deck.newCards}
                    </div>
                    <div className="text-muted-foreground text-sm font-medium">
                      {t("newLabel")}
                    </div>
                    <p className="text-xs text-blue-600">
                      {t("newDesc")}
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
                      {t("learningLabel")}
                    </div>
                    <p className="text-xs text-orange-600">{t("learningDesc")}</p>
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
                      {t("reviewLabel")}
                    </div>
                    <p className="text-xs text-green-600">{t("reviewDesc")}</p>
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
                toast({
                  title: t("languageChangedTitle"),
                  description: t("languageChangedDesc", { language: language.name }),
                });
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
                ? t("definitionsNote")
                : t("translationsNote")}
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
                {t("allCaughtUpButton")}
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
                {t("readArticlesToAddCards")}
              </Button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (onDeckUpdate) {
                    onDeckUpdate();
                    toast({
                      title: t("refreshSuccessTitle"),
                      description: t("refreshSuccessDesc"),
                    });
                  } else {
                    router.refresh();
                  }
                }}
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
                {t("addMoreCards")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface DeckViewProps {
  decks: {
    id: string;
    name: string;
    description?: string;
    type: "VOCABULARY" | "SENTENCE";
    totalCards: number;
    dueCards: number;
    newCards: number;
    learningCards: number;
    reviewCards: number;
    masteredCards: number;
    createdAt: Date;
    updatedAt: Date;
  }[];
  deckType: "VOCABULARY" | "SENTENCE";
  onDeckUpdate: () => void;
}

export function DeckView({ decks, deckType, onDeckUpdate }: DeckViewProps) {
  return (
    <div>
      {decks.map((deck) => (
        <SingleDeckViewInline
          key={deck.id}
          deck={{
            id: deck.id,
            name: deck.name,
            type: deck.type,
            totalCards: deck.totalCards,
            dueCards: deck.dueCards,
            newCards: deck.newCards,
            learningCards: deck.learningCards,
            reviewCards: deck.reviewCards,
            createdAt: deck.createdAt.toISOString(),
            updatedAt: deck.updatedAt.toISOString(),
          }}
          onDeckUpdate={onDeckUpdate} // Pass the callback down
        />
      ))}
    </div>
  );
}
