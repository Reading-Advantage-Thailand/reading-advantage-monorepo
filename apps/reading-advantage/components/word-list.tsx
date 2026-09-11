"use client";
import { useCallback, useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useScopedI18n, useCurrentLocale } from "@/locales/client";
import { Book } from "lucide-react";
import { DialogClose } from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createEmptyCard, Card } from "ts-fsrs";
import { Article, Chapter } from "@/components/models/article-model";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { toast } from "./ui/use-toast";
import { getGcsWordAudioUrl } from "@/lib/gcs-url";

export type WordListDataSource =
  | { type: "article"; article: Article; articleId: string }
  | {
      type: "stories";
      chapter: Chapter;
      storyId: string;
      chapterNumber: string;
    };

interface WordListItem {
  markName?: string;
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  index: number;
  startTime: number;
  endTime: number;
  audioUrl: string;
}

type Props = {
  dataSource: WordListDataSource;
  userId: string;
  wrapperClassName?: string;
  triggerClassName?: string;
};

type RawWord = {
  markName?: string;
  vocabulary?: string;
  definition?: WordListItem["definition"];
  timeSeconds?: number;
};

/**
 * Maps one array of words with per-word time offsets to dialog items.
 * @param words Raw word array from the article or chapter payload.
 * @param audioUrl The shared audio URL for every item.
 * @returns The normalized word list items.
 */
function normalizeWordList(
  words: RawWord[] | undefined,
  audioUrl: string
): WordListItem[] {
  if (!Array.isArray(words)) return [];
  return words
    .filter((word) => word?.vocabulary && word?.definition)
    .map((word, index) => {
      const nextWord = words[index + 1];
      return {
        vocabulary: word.vocabulary as string,
        definition: word.definition as WordListItem["definition"],
        markName: word.markName,
        index,
        startTime: word.timeSeconds || 0,
        endTime: nextWord
          ? nextWord.timeSeconds || 0
          : (word.timeSeconds || 0) + 10,
        audioUrl,
      };
    });
}

/**
 * Normalizes the three assistant wordlist response shapes: a bare word
 * array, a `{ word_list }` object, and `{ word_list, timepoints }` pairs.
 * @param data The parsed assistant wordlist response.
 * @param audioUrl The shared audio URL for every item.
 * @returns The normalized word list items.
 */
function extractWordList(data: any, audioUrl: string): WordListItem[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return normalizeWordList(data, audioUrl);
  }
  if (Array.isArray(data.timepoints) && data.timepoints.length > 0) {
    return data.timepoints.map(
      (timepoint: { timeSeconds: number }, index: number) => {
        const word = data.word_list?.[index] as RawWord | undefined;
        return {
          vocabulary: word?.vocabulary as string,
          definition: word?.definition as WordListItem["definition"],
          markName: word?.markName,
          index,
          startTime: timepoint.timeSeconds,
          endTime:
            index === data.timepoints.length - 1
              ? timepoint.timeSeconds + 10
              : data.timepoints[index + 1].timeSeconds,
          audioUrl,
        };
      }
    );
  }
  if (Array.isArray(data.word_list)) {
    return normalizeWordList(data.word_list, audioUrl);
  }
  return [];
}

/**
 * Renders the vocabulary word-list dialog for articles and story chapters.
 * One shared audio element plays every word segment in the dialog.
 * @param props The data source plus the user and trigger styling.
 * @returns The trigger button and the word-list dialog.
 */
export default function WordList({
  dataSource,
  userId,
  wrapperClassName = "flex items-center",
  triggerClassName = "",
}: Props) {
  const t = useScopedI18n("components.wordList");
  const [loading, setLoading] = useState<boolean>(false);
  const [wordList, setWordList] = useState<WordListItem[]>([]);

  const currentLocale = useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi";
  const { resolvedTheme } = useTheme();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentEndRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (
        segmentEndRef.current !== null &&
        audio.currentTime >= segmentEndRef.current
      ) {
        audio.pause();
        segmentEndRef.current = null;
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.pause();
    };
  }, []);

  const sharedAudioUrl =
    dataSource.type === "article"
      ? getGcsWordAudioUrl(dataSource.articleId)
      : getGcsWordAudioUrl(`${dataSource.storyId}-${dataSource.chapterNumber}`);

  const playSegment = (start: number, end?: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = start;
    segmentEndRef.current = end ?? null;
    audio.play()?.catch?.((error: unknown) => {
      console.error("Audio playback failed:", error);
    });
  };

  const FormSchema = z.object({
    items: z.array(z.string()).refine((value) => value.some((item) => item), {
      message: "You have to select at least one item.",
    }),
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  const handleWordList = useCallback(async () => {
    try {
      setLoading(true);

      let list: WordListItem[] = [];
      if (dataSource.type === "article") {
        const resWordlist = await fetch(`/api/v1/assistant/wordlist`, {
          method: "POST",
          body: JSON.stringify({
            article: dataSource.article,
            articleId: dataSource.articleId,
          }),
        });

        if (!resWordlist.ok) {
          throw new Error(
            `API request failed with status: ${resWordlist.status}`
          );
        }

        const data = await resWordlist.json();
        if (!data) {
          throw new Error("No data received from server");
        }
        list = extractWordList(data, sharedAudioUrl);
      } else {
        const words = (dataSource.chapter as { chapter?: { words?: RawWord[] } })
          ?.chapter?.words;
        if (!Array.isArray(words)) {
          console.error("Invalid words format", words);
        }
        list = normalizeWordList(words, sharedAudioUrl);
      }

      if (list.length === 0) {
        console.warn("No valid word list data found");
        toast({
          title: "No words found",
          description: "No vocabulary words were found for this article.",
          variant: "default",
        });
      }

      setWordList(list);
      form.reset();
    } catch (error: any) {
      console.error("error: ", error);
      toast({
        title: "Something went wrong.",
        description: `${error?.response?.data?.message || error?.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [dataSource, form, sharedAudioUrl]);

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      const card: Card = createEmptyCard();
      const foundWordsList = wordList.filter((vocab) =>
        data?.items.includes(vocab?.vocabulary)
      );
      if (foundWordsList.length > 0) {
        const param = {
          ...card,
          ...(dataSource.type === "article"
            ? { articleId: dataSource.articleId }
            : {
                storyId: dataSource.storyId,
                chapterNumber: Number(dataSource.chapterNumber),
              }),
          saveToFlashcard: true,
          foundWordsList: foundWordsList,
        };

        const res = await fetch(`/api/v1/users/wordlist/${userId}`, {
          method: "POST",
          body: JSON.stringify(param),
        });

        const data = await res.json();

        if (data.status === 200) {
          toast({
            title: "Success",
            description: `You have saved ${foundWordsList.length} words to flashcard`,
          });
        } else if (data.status === 400) {
          toast({
            title: "Word already saved",
            description: `${data?.message}`,
            variant: "destructive",
          });
        }
      }
    } catch {
      toast({
        title: "Something went wrong.",
        description: "Your word was not saved. Please try again.",
        variant: "destructive",
      });
    }
  };

  const calculateHeight = () => {
    const baseHeight = 300;
    const itemHeight = 50;
    const maxDialogHeight = 490;
    const calculatedHeight = baseHeight + wordList.length * itemHeight;
    return Math.min(calculatedHeight, maxDialogHeight);
  };

  return (
    <div id="onborda-wordbutton" className={wrapperClassName}>
      <Dialog>
        <DialogTrigger asChild>
          <Button onClick={handleWordList} className={triggerClassName}>
            {t("title")}
          </Button>
        </DialogTrigger>
        <DialogContent
          style={{ height: `${calculateHeight()}px` }}
          className="sm:max-w-[550px]"
        >
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="overflow-auto h-96"
            >
              <DialogHeader>
                <DialogTitle>
                  <div className="flex items-center">
                    <Book />
                    <div className="ml-2">{t("title")}</div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              {loading ? (
                <div className="flex items-center space-x-4 mt-5">
                  <div className="space-y-5">
                    <Skeleton className="h-4 w-[300px]" />
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-5">
                    <span className="font-bold">{t("detail")}</span>
                  </div>
                  <FormField
                    control={form.control}
                    name="items"
                    render={() => {
                      return (
                        <FormItem>
                          <>
                            {wordList?.map((word, index) => (
                              <FormField
                                key={index}
                                control={form.control}
                                name="items"
                                render={({ field }) => {
                                  return (
                                    <>
                                      <FormItem key={word?.vocabulary}>
                                        <FormControl>
                                          <div
                                            key={index}
                                            className="p-4 border-b-2 flex flex-row"
                                          >
                                            <div>
                                              <Checkbox
                                                checked={field?.value?.includes(
                                                  word?.vocabulary
                                                )}
                                                onCheckedChange={(checked) => {
                                                  if (
                                                    Array.isArray(field.value)
                                                  ) {
                                                    return checked
                                                      ? field.onChange([
                                                          ...field.value,
                                                          word.vocabulary,
                                                        ])
                                                      : field.onChange(
                                                          field.value.filter(
                                                            (value) =>
                                                              value !==
                                                              word.vocabulary
                                                          )
                                                        );
                                                  } else {
                                                    return field.onChange(
                                                      checked
                                                        ? [word.vocabulary]
                                                        : []
                                                    );
                                                  }
                                                }}
                                              />
                                            </div>

                                            <span className="font-bold text-cyan-500 ml-2">
                                              {word.vocabulary}
                                            </span>

                                            <div className="mr-1">
                                              {word?.startTime ? (
                                                <Image
                                                  src={
                                                    resolvedTheme === "dark"
                                                      ? "/sound-play-sound-white.png"
                                                      : "/sound-play-sound-black.png"
                                                  }
                                                  alt="play sound"
                                                  width={20}
                                                  height={20}
                                                  className={
                                                    "mx-3 mt-1 cursor-pointer"
                                                  }
                                                  onClick={() =>
                                                    playSegment(
                                                      word.startTime,
                                                      word.endTime
                                                    )
                                                  }
                                                />
                                              ) : null}
                                            </div>

                                            <span>
                                              {word.definition &&
                                              word.definition[currentLocale]
                                                ? word.definition[currentLocale]
                                                : word.definition?.en ||
                                                  "Definition not available"}
                                            </span>
                                          </div>
                                        </FormControl>
                                      </FormItem>
                                    </>
                                  );
                                }}
                              />
                            ))}
                          </>
                        </FormItem>
                      );
                    }}
                  />
                </>
              )}
              <audio ref={audioRef} src={sharedAudioUrl} />
              <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-[#020817] p-5">
                <div className="flex justify-end">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      {t("closeButton")}
                    </Button>
                  </DialogClose>
                  <Button
                    className="ml-2"
                    type="submit"
                    disabled={
                      form.watch("items")?.length === 0 ||
                      form.watch("items") === undefined
                    }
                  >
                    {t("saveButton")}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
