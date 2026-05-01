"use client";

import React, { useState, useEffect } from "react";
import { Article } from "../../models/article-model";
import { useScopedI18n, useCurrentLocale } from "@/locales/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookPlusIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  StarIcon,
} from "lucide-react";
import AudioImg from "../../audio-img";
import { AUDIO_WORDS_URL } from "@/server/constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createEmptyCard, Card as FsrsCard } from "ts-fsrs";
import { filter, includes } from "lodash";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";

interface Phase4VocabularyCollectionProps {
  article: Article;
  articleId: string;
  userId: string;
  onCompleteChange: (complete: boolean) => void;
}

interface WordList {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  index?: number;
  startTime?: number;
  endTime?: number | undefined;
  timeSeconds?: number;
  markName?: string;
  audioUrl?: string;
}

const FormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one item.",
  }),
});

const Phase4VocabularyCollection: React.FC<Phase4VocabularyCollectionProps> = ({
  article,
  articleId,
  userId,
  onCompleteChange,
}) => {
  const t = useScopedI18n("pages.student.lessonPage");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [wordList, setWordList] = useState<WordList[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [savedWords, setSavedWords] = useState<string[]>([]);
  const currentLocale = useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi";

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      items: [],
    },
  });

  useEffect(() => {
    const subscription = form.watch((value) => {
      const currentSelectedCount = value.items?.length || 0;
      setSelectedCount(currentSelectedCount);
      // Only allow completion if user has saved at least 5 words (not just selected)
      onCompleteChange(savedWords.length >= 5);
    });
    return () => subscription.unsubscribe();
  }, [form, onCompleteChange, savedWords.length]);

  // Also check when savedWords changes (on component mount)
  useEffect(() => {
    // Only allow completion if user has saved at least 5 words
    onCompleteChange(savedWords.length >= 5);
  }, [savedWords.length, onCompleteChange]);

  useEffect(() => {
    const fetchWordList = async () => {
      try {
        setLoading(true);

        // Fetch saved words first
        const resSavedWords = await fetch(
          `/api/v1/users/wordlist/${userId}?articleId=${articleId}`
        );
        let savedWordsFromDB: string[] = [];

        if (resSavedWords.ok) {
          const savedWordsData = await resSavedWords.json();
          savedWordsFromDB =
            savedWordsData.word
              ?.map((record: any) => record.word?.vocabulary)
              .filter(Boolean) || [];
          setSavedWords(savedWordsFromDB);
        }

        const resWordlist = await fetch(`/api/v1/assistant/wordlist`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ article, articleId }),
        });

        if (!resWordlist.ok) {
          throw new Error(
            `API request failed with status: ${resWordlist.status}`
          );
        }

        const data = await resWordlist.json();

        let processedWordList = [];

        if (Array.isArray(data)) {
          processedWordList = data.map((word: any, index: number) => {
            const startTime = word.timeSeconds || word.startTime || index * 2;
            const nextWord = data[index + 1];
            const endTime = nextWord
              ? nextWord.timeSeconds || nextWord.startTime || (index + 1) * 2
              : undefined;

            return {
              ...word,
              index,
              startTime,
              endTime,
              audioUrl:
                word.audioUrl ||
                `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${articleId}.mp3`,
            };
          });
        }

        setWordList(processedWordList);
      } catch (error: any) {
        console.error("error: ", error);
        toast({
          title: t("somethingWentWrong"),
          description: `${error?.response?.data?.message || error?.message}`,
          variant: "destructive",
        });
        setWordList([]);
      } finally {
        setLoading(false);
      }
    };

    if (articleId && article) {
      fetchWordList();
    }
  }, [article, articleId, userId]);

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      setSaving(true);
      let card: FsrsCard = createEmptyCard();
      const foundWordsList = filter(wordList, (vocab) =>
        includes(data?.items, vocab?.vocabulary)
      );

      // Check if user will have at least 5 total saved words after this save
      const totalAfterSave = savedWords.length + foundWordsList.length;
      if (totalAfterSave < 5) {
        const needed = 5 - savedWords.length;
        toast({
          title: t("insufficientVocabulary"),
          description: `Please select at least ${needed} more words. You need a total of 5 saved words to proceed.`,
          variant: "destructive",
        });
        return;
      }

      const param = {
        ...card,
        articleId: articleId,
        saveToFlashcard: true,
        foundWordsList: foundWordsList,
      };

      const res = await fetch(`/api/v1/users/wordlist/${userId}`, {
        method: "POST",
        body: JSON.stringify(param),
      });

      if (res.ok) {
        // Update saved words state
        const newSavedWords = foundWordsList.map((word) => word.vocabulary);
        setSavedWords((prev) => [...prev, ...newSavedWords]);

        // Clear form selection
        form.reset({ items: [] });

        toast({
          title: t("success"),
          description: t("wordsAddedToCollection", { count: foundWordsList.length }),
          variant: "default",
        });
        onCompleteChange(true);
      } else {
        throw new Error("Failed to save vocabulary");
      }
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message || t("failedToSaveVocabulary"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-4 bg-gradient-to-br from-purple-300 via-pink-300 to-rose-300 dark:from-purple-950 dark:via-pink-950 dark:to-rose-950 p-8 rounded-2xl border border-purple-200 dark:border-purple-800">
        <div className="inline-flex items-center justify-center p-3 bg-purple-100 dark:bg-purple-900 rounded-full mb-4">
          <BookPlusIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("phase4Title")}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t("selectVocabularyDescription")}
        </p>
      </div>

      {/* Progress Card */}
      <div className="bg-zinc-200 dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {savedWords.length >= 5 ? (
              <CheckCircle2Icon className="h-6 w-6 text-green-500" />
            ) : (
              <AlertCircleIcon className="h-6 w-6 text-amber-500" />
            )}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t("vocabularyCollectionProgress")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedCount > 0 && `${selectedCount} selected, `}
                {savedWords.length} {t("saved")}
                {savedWords.length < 5 &&
                  ` (${t("needSaveAtLeast5Words")})`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {savedWords.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t("savedWords")}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                savedWords.length >= 5
                  ? "bg-gradient-to-r from-green-500 to-emerald-500"
                  : "bg-gradient-to-r from-purple-500 to-pink-500"
              }`}
              style={{
                width: `${Math.min((savedWords.length / 5) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Vocabulary Selection */}
      <div className="bg-zinc-200 dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {loading ? (
                <div className="grid gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-4 p-4 border border-gray-100 dark:border-gray-800 rounded-xl"
                    >
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="items"
                    render={() => (
                      <FormItem>
                        <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2">
                          {wordList.map((word, index) => (
                            <FormField
                              key={index}
                              control={form.control}
                              name="items"
                              render={({ field }) => (
                                <FormItem
                                  className={`group p-4 border-2 rounded-xl transition-all duration-300 hover:shadow-md ${
                                    savedWords.includes(word.vocabulary)
                                      ? "border-green-400 bg-green-100 dark:bg-green-950 dark:border-green-600 opacity-75"
                                      : field.value?.includes(word.vocabulary)
                                        ? "border-purple-400 bg-purple-100 dark:bg-purple-950 dark:border-purple-600 shadow-sm"
                                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                  }`}
                                >
                                  <div className="flex items-center space-x-4">
                                    <FormControl>
                                      <Checkbox
                                        checked={
                                          savedWords.includes(
                                            word.vocabulary
                                          ) ||
                                          field.value?.includes(word.vocabulary)
                                        }
                                        disabled={savedWords.includes(
                                          word.vocabulary
                                        )}
                                        onCheckedChange={(checked) => {
                                          if (
                                            savedWords.includes(word.vocabulary)
                                          )
                                            return;
                                          return checked
                                            ? field.onChange([
                                                ...field.value,
                                                word.vocabulary,
                                              ])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) =>
                                                    value !== word.vocabulary
                                                )
                                              );
                                        }}
                                        className="h-5 w-5"
                                      />
                                    </FormControl>
                                    {/* Word */}
                                    <div className="flex-shrink-0">
                                      <span
                                        className={`inline-flex items-center px-3 py-1 text-sm font-bold rounded-full ${
                                          savedWords.includes(word.vocabulary)
                                            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                                            : field.value?.includes(
                                                  word.vocabulary
                                                )
                                              ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white"
                                              : "bg-gradient-to-r from-gray-500 to-gray-600 text-white"
                                        }`}
                                      >
                                        <StarIcon className="w-3 h-3 mr-1" />
                                        {word.vocabulary}
                                        {savedWords.includes(
                                          word.vocabulary
                                        ) && (
                                          <CheckCircle2Icon className="w-3 h-3 ml-1" />
                                        )}
                                      </span>
                                    </div>{" "}
                                    {/* Audio Button */}
                                    <div className="flex-shrink-0">
                                      {word?.startTime !== undefined && (
                                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                          <AudioImg
                                            key={word.vocabulary}
                                            audioUrl={
                                              word.audioUrl ||
                                              `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${articleId}.mp3`
                                            }
                                            startTimestamp={word?.startTime}
                                            endTimestamp={word?.endTime}
                                          />
                                        </div>
                                      )}
                                    </div>
                                    {/* Definition */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {word.definition?.[currentLocale] ||
                                          word.definition?.en ||
                                          t("definitionNotAvailable")}
                                      </p>
                                    </div>
                                  </div>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    {savedWords.length >= 5 && selectedCount === 0 && (
                      <div className="mb-4 p-4 bg-green-100 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl">
                        <div className="flex items-center gap-2">
                          <CheckCircle2Icon className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <p className="text-sm text-green-700 dark:text-green-300">
                            {t("greatSavedWordsMessage", { count: savedWords.length })}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {savedWords.length < 5 && (
                      <div className="mb-4 p-4 bg-amber-100 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl">
                        <div className="flex items-center gap-2">
                          <AlertCircleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            {t("needAtLeast5WordsMessage", { count: savedWords.length })}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <Button
                      type="submit"
                      disabled={
                        saving ||
                        selectedCount === 0 ||
                        (savedWords.length + selectedCount < 5)
                      }
                      size="lg"
                      className={`w-full ${
                        selectedCount > 0 && (savedWords.length + selectedCount >= 5)
                          ? "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                          : "bg-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {saving ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          {t("saving")}
                        </div>
                      ) : selectedCount === 0 ? (
                        savedWords.length >= 5 ? t("selectMoreWordsOptional") : t("selectWordsToSave")
                      ) : (
                        savedWords.length > 0 
                          ? t("saveWordsCountWithSaved", { count: selectedCount, saved: savedWords.length })
                          : t("saveWordsCount", { count: selectedCount })
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </Form>
        </div>
      </div>

      {/* Collection Tips */}
      <div className="bg-gradient-to-r from-indigo-300 to-purple-300 dark:from-indigo-950 dark:to-purple-950 p-6 rounded-xl border border-indigo-200 dark:border-indigo-800">
        <h3 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-3">
          {t("collectionTips")}
        </h3>
        <ul className="space-y-2 text-sm text-indigo-700 dark:text-indigo-300">
          <li className="flex items-center">
            <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
            {t("chooseNewWords")}
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
            {t("wordsAddedToFlashcards")}
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
            {t("reviewWordsLater")}
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
            {t("greenCheckmarkWords")}
          </li>
        </ul>
      </div>
    </div>
  );
};

Phase4VocabularyCollection.displayName = "Phase4VocabularyCollection";
export default Phase4VocabularyCollection;
