"use client";

import { useCallback, useState, useRef, useEffect, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createEmptyCard, Card } from "ts-fsrs";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Book } from "lucide-react";
import { WordListTimestamp } from "@/types";
import { useLocale, useTranslations } from "next-intl";
import AudioButton from "../audio-button";
import { toast } from "sonner";
import { saveFlashcard } from "@/actions/flashcard";

interface WordList {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  startTime: number;
  endTime: number;
  audioUrl: string;
}

export default function WordList({
  articleId,
  words,
  audioUrl,
}: {
  articleId: string;
  words: WordListTimestamp[];
  audioUrl: string;
}) {
  const [loading, setLoading] = useState<boolean>(false);
  const [wordList, setWordList] = useState<WordList[]>([]);
  const locale = useLocale();
  const t = useTranslations("WordList");
  const tc = useTranslations("Components");

  console.log(words);

  useEffect(() => {
    if (words) {
      let wordList = [];

      wordList = words.map((word: WordListTimestamp, index: number) => {
        const startTime = word?.timeSeconds as number;
        const endTime =
          index === words.length - 1
            ? (word?.timeSeconds as number) + 10
            : (words[index + 1].timeSeconds as number);

        return {
          vocabulary: word?.vocabulary,
          definition: word?.definition,
          index,
          startTime,
          endTime,
          audioUrl,
        };
      });
      setWordList(wordList);
    }
  }, [words, articleId]);

  return (
    <div id="onborda-wordbutton" className="flex items-center">
      <Dialog>
        <DialogTrigger asChild>
          <Button className="shadow-md transition-shadow duration-200 hover:shadow-lg">
            <Book className="h-4 w-4" />
            {t("title")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] gap-0 p-0 sm:max-w-[600px]">
          <div className="flex h-full max-h-[80vh] flex-col">
            <DialogHeader className="border-b px-6 py-4">
              <DialogTitle>
                <div className="flex items-center">
                  <div className="mr-3 rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                    <Book className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-lg font-semibold">{t("title")}</div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-hidden">
              <div className="flex h-full flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {loading && words ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center space-x-4 rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-800"
                        >
                          <Skeleton className="h-5 w-5 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-3 w-[300px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {wordList.map((word, index) => (
                          <div
                            key={index}
                            className="group relative rounded-lg border p-4 transition-all duration-200 hover:border-slate-300 hover:shadow-md"
                          >
                            <div className="flex items-start space-x-4">
                              <div className="min-w-0 flex-1">
                                {/* Vocabulary word */}
                                <div className="mb-2 flex items-center space-x-3">
                                  <span className="text-primary text-lg font-bold capitalize">
                                    {word.vocabulary}
                                  </span>

                                  {/* Audio button */}
                                  <div className="flex-shrink-0">
                                    <AudioButton
                                      audioUrl={word.audioUrl}
                                      startTimestamp={word.startTime}
                                      endTimestamp={word.endTime}
                                    />
                                  </div>
                                </div>

                                {/* Definition */}
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                  {
                                    word.definition[
                                      locale as keyof typeof word.definition
                                    ]
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t px-6 py-4">
                  <div className="flex items-center justify-end">
                    <div className="flex space-x-3">
                      <DialogClose asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="px-6"
                        >
                          {tc("closeButton")}
                        </Button>
                      </DialogClose>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
