"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { FileTextIcon } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import AudioButton from "../audio-button";
import { useTranslations } from "next-intl";

export interface Sentence {
  sentence: string;
  translation: {
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  timeSeconds?: number;
  audioUrl: string;
  startTime: number;
  endTime: number;
}

export default function Sentence({
  sentences,
  audioUrl,
}: {
  sentences: Sentence[];
  audioUrl: string;
}) {
  const [loading, setLoading] = useState(false);
  const [sentenceList, setSentenceList] = useState<Sentence[]>([]);
  const t = useTranslations("Components");

  useEffect(() => {
    if (sentences) {
      let sentencesList = [];

      sentencesList = sentences.map((sentence: Sentence, index: number) => {
        const startTime = sentence?.timeSeconds as number;
        const endTime =
          index === sentences.length - 1
            ? (sentence?.timeSeconds as number) + 10
            : (sentences[index + 1].timeSeconds as number);

        return {
          sentence: sentence?.sentence,
          translation: sentence?.translation,
          index,
          startTime,
          endTime,
          audioUrl,
        };
      });
      setSentenceList(sentencesList);
    }
  }, [sentences, audioUrl]);

  return (
    <div id="onborda-wordbutton" className="flex items-center">
      <Dialog>
        <DialogTrigger asChild>
          <Button className="shadow-md transition-shadow duration-200 hover:shadow-lg">
            <FileTextIcon className="h-4 w-4" />
            {t("sentences")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] gap-0 p-0 sm:max-w-[600px]">
          <div className="flex h-full max-h-[80vh] flex-col">
            <DialogHeader className="border-b px-6 py-4">
              <DialogTitle>
                <div className="flex items-center">
                  <div className="mr-3 rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                    <FileTextIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-lg font-semibold">{t("sentences")}</div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-hidden">
              <div className="flex h-full flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {loading && sentences ? (
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
                        {sentenceList.map((list, index) => (
                          <div
                            key={index}
                            className="group relative rounded-lg border p-4 transition-all duration-200 hover:border-slate-300 hover:shadow-md"
                          >
                            <div className="flex items-start space-x-4">
                              <div className="min-w-0 flex-1">
                                {/* Vocabulary word */}
                                <div className="mb-2 flex items-center space-x-3">
                                  <span className="text-primary text-lg font-bold capitalize">
                                    {list.sentence}
                                  </span>

                                  {/* Audio button */}
                                  <div className="flex-shrink-0">
                                    <AudioButton
                                      audioUrl={list.audioUrl}
                                      startTimestamp={list.startTime}
                                      endTimestamp={list.endTime}
                                    />
                                  </div>
                                </div>

                                {/* Definition */}
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                  {list.translation.th}
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
                          {t("closeButton")}
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
