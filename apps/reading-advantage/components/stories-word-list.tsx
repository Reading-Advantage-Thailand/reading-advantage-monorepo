"use client";
import { useCallback, useState, useRef, useEffect } from "react";
import { useScopedI18n } from "@/locales/client";
import { Book } from "lucide-react";
import { DialogClose } from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createEmptyCard, Card } from "ts-fsrs";
import { filter, includes } from "lodash";
import { useCurrentLocale } from "@/locales/client";
import { Chapter } from "@/components/models/article-model";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { AUDIO_WORDS_URL } from "@/server/constants";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { toast } from "./ui/use-toast";
import AudioImg from "./audio-img";

interface WordList {
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

interface Props {
  chapter: Chapter;
  storyId: string;
  chapterNumber: string;
  userId: string;
}

export default function StoriesWordList({
  chapter,
  storyId,
  chapterNumber,
  userId,
}: Props) {
  const t = useScopedI18n("components.wordList");
  const [loading, setLoading] = useState<boolean>(false);
  const [wordList, setWordList] = useState<WordList[]>([]);

  // Get the current locale
  const currentLocale = useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi";

  const FormSchema = z.object({
    items: z.array(z.string()).refine((value) => value.some((item) => item), {
      message: "You have to select at least one item.",
    }),
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  const handleWordList = useCallback(() => {
    try {
      setLoading(true);
      console.log("chapter", chapter);

      let wordList: WordList[] = [];
      if (Array.isArray(chapter.chapter.words)) {
        wordList = chapter.chapter.words
          .filter((word) => word.vocabulary && word.definition)
          .map((word: any, index: number) => {
            const nextWord = chapter.chapter.words[index + 1];
            return {
              vocabulary: word.vocabulary,
              definition: word.definition,
              markName: word.markName,
              index,
              startTime: word.timeSeconds || 0,
              endTime: nextWord
                ? nextWord.timeSeconds
                : (word.timeSeconds || 0) + 10,
              audioUrl: `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${storyId}-${chapterNumber}.mp3`,
            };
          });
      } else {
        console.error("Invalid words format", chapter.chapter.words);
      }

      setWordList(wordList);
      form.reset();
    } catch (error: any) {
      console.error("Error processing words", error);
      toast({
        title: "Something went wrong.",
        description: `${error?.response?.data?.message || error?.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [chapter, storyId, chapterNumber, form]);

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      let card: Card = createEmptyCard();
      const foundWordsList = filter(wordList, (vocab) =>
        includes(data?.items, vocab?.vocabulary)
      );
      if (foundWordsList.length > 0) {
        const param = {
          ...card,
          storyId: storyId,
          chapterNumber: Number(chapterNumber),
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
    } catch (error: any) {
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
    <div id="onborda-wordbutton">
      <Dialog>
        <DialogTrigger asChild>
          <Button onClick={handleWordList} className="mb-4 ml-3">
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
              {loading && wordList ? (
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
                                              {word.vocabulary}:{" "}
                                            </span>

                                            <div className="mr-1">
                                              {word?.startTime && (
                                                <AudioImg
                                                  key={word.vocabulary}
                                                  audioUrl={
                                                    word.audioUrl
                                                      ? word.audioUrl
                                                      : `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${storyId}-${chapterNumber}.mp3`
                                                  }
                                                  startTimestamp={
                                                    word?.startTime
                                                  }
                                                  endTimestamp={word?.endTime}
                                                />
                                              )}
                                            </div>

                                            <span>
                                              {word.definition[currentLocale]}
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
