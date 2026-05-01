"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { StoryChapter } from "./models/article-model";
import { cn, splitTextIntoSentences } from "@/lib/utils";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { toast } from "./ui/use-toast";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "@radix-ui/react-icons";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { createEmptyCard, Card } from "ts-fsrs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  PlayIcon,
  PauseIcon,
  TrackNextIcon,
  TrackPreviousIcon,
} from "@radix-ui/react-icons";
import useAudio from "@/hooks/stories-chapter/useAudio";

type Sentence = {
  sentence: string;
  index: number;
  startTime: number;
  endTime: number;
  audioUrl: string;
};

async function getTranslateSentence(
  storyId: string,
  targetLanguage: string,
  chapterNumber: string
): Promise<{
  message: string;
  translated_sentences: string[];
}> {
  try {
    const res = await fetch(
      `/api/v1/assistant/stories-translate/${storyId}/${chapterNumber}`,
      {
        method: "POST",
        body: JSON.stringify({ type: "content", targetLanguage }),
      }
    );
    const data = await res.json();
    return data;
  } catch (error) {
    return { message: "error", translated_sentences: [] };
  }
}

export default function ChapterContent({
  story,
  chapterNumber,
  userId,
  className = "",
}: {
  story: StoryChapter;
  chapterNumber: string;
  className?: string;
  userId: string;
}) {
  const t = useScopedI18n("components.storyChapterContent");
  const locale = useCurrentLocale();
  const [loading, setLoading] = useState(false);
  const [translate, setTranslate] = useState<string[]>([]);
  const [isTranslate, setIsTranslate] = useState(false);
  const [isTranslateOpen, setIsTranslateOpen] = useState(false);
  const sentences = splitTextIntoSentences(story.chapter.passage, true);
  const router = useRouter();
  const chapter = Number(chapterNumber);
  const [isTranslateClicked, setIsTranslateClicked] = useState(false);
  const sentenceList = useMemo<Sentence[]>(() => {
    return story.timepoints.map((timepoint, index) => {
      const startTime = timepoint.timeSeconds;
      const endTime =
        index === story.timepoints.length - 1
          ? timepoint.timeSeconds + 10
          : story.timepoints[index + 1].timeSeconds - 0.3;
      const sentence =
        sentences.length <= story.timepoints.length
          ? story.timepoints[index].sentences
          : sentences[index];
      return {
        sentence: sentence ?? sentences[index],
        index: timepoint.index,
        startTime,
        endTime,
        audioUrl: timepoint.file
          ? `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/tts/${timepoint.file}`
          : `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/tts/${story.storyId}-${chapterNumber}.mp3`,
      };
    });
  }, [story.timepoints, story.storyId, chapterNumber, sentences]);

  useEffect(() => {
    // Log chapter read explicitly as a client mutation outside the rendering flow
    const logRead = async () => {
      try {
        await fetch(`/api/v1/stories/${story.storyId}/${chapterNumber}`, {
          method: "POST",
        });
      } catch (error) {
        console.error("Failed to log chapter read", error);
      }
    };
    logRead();
  }, [story.storyId, chapterNumber]);

  const {
    audioRef,
    currentAudioIndex,
    togglePlayer,
    isPlaying,
    selectedIndex,
    selectedSentence,
    setSelectedIndex,
    setSelectedSentence,
    handleAudioEnded,
    handleNextTrack,
    handlePlayPause,
    handlePreviousTrack,
    handleSentenceClick,
    handleSpeedTime,
    handleTimeUpdate,
    handleTogglePlayer,
  } = useAudio(sentenceList);

  const getHighlightedClass = (index: number) =>
    cn(
      "cursor-pointer text-muted-foreground hover:bg-blue-200 hover:dark:bg-blue-900 hover:text-primary rounded-md",
      currentAudioIndex === index &&
      isPlaying &&
      "bg-red-200 dark:bg-red-900 text-primary"
    );

  const renderSentence = (sentence: string, i: number) => {
    return sentence.split("~~").map((line, index, array) => (
      <span key={index}>
        {line}
        {(index !== array.length - 1 || /[.!?]$/.test(line)) && " "}
        {index !== array.length - 1 && <div className="mt-3" />}
      </span>
    ));
  };

  const saveToFlashcard = async () => {
    //translate before save
    if (!isTranslate) {
      await handleTranslate();
    } else {
      try {
        if (selectedSentence === -1) {
          toast({
            title: "Please select a sentence",
            description:
              "You need to select a sentence before saving to flashcard.",
            variant: "destructive",
          });
          return;
        }

        const selectedSentenceData = sentenceList[selectedSentence as number];
        if (!selectedSentenceData) {
          toast({
            title: "Invalid sentence",
            description: "The selected sentence is not valid.",
            variant: "destructive",
          });
          return;
        }

        let card: Card = createEmptyCard();
        let endTimepoint = selectedSentenceData.endTime;

        const resSaveSentences = await fetch(
          `/api/v1/users/sentences/${userId}`,
          {
            method: "POST",
            body: JSON.stringify({
              sentence: selectedSentenceData.sentence.replace("~~", ""),
              sn: selectedSentence,
              storyId: story.storyId,
              chapterNumber,
              translation: {
                th: translate[selectedSentence as number],
              },
              audioUrl: selectedSentenceData.audioUrl,
              timepoint: selectedSentenceData.startTime,
              endTimepoint: endTimepoint,
              difficulty: card.difficulty,
              due: card.due,
              elapsed_days: card.elapsed_days,
              lapses: card.lapses,
              reps: card.reps,
              scheduled_days: card.scheduled_days,
              stability: card.stability,
              state: card.state,
            }),
          }
        );

        if (resSaveSentences.status === 200) {
          toast({
            title: "Success",
            description: `You have saved "${selectedSentenceData.sentence.replace(
              "~~",
              ""
            )}" to flashcard`,
          });
        } else if (resSaveSentences.status === 400) {
          toast({
            title: "Sentence already saved",
            description: "You have already saved this sentence.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Something went wrong.",
          description: "Your sentence was not saved. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  async function handleTranslateSentence() {
    setLoading(true);
    type ExtendedLocale = "th" | "cn" | "tw" | "vi" | "zh-CN" | "zh-TW";
    let targetLanguage: ExtendedLocale = locale as ExtendedLocale;
    switch (locale) {
      case "cn":
        targetLanguage = "zh-CN";
        break;
      case "tw":
        targetLanguage = "zh-TW";
        break;
    }
    const response = await getTranslateSentence(
      story.storyId,
      targetLanguage,
      chapterNumber
    );
    if (response.message === "error") {
      setIsTranslate(false);
      setIsTranslateOpen(false);
      setLoading(false);
      toast({
        title: "Something went wrong.",
        description: "Your sentence was not translated. Please try again.",
        variant: "destructive",
      });
      return;
    } else {
      setTranslate(response.translated_sentences);
      setIsTranslateOpen(!isTranslateOpen);
      setIsTranslate(true);
      setLoading(false);
    }
  }

  const handleTranslate = async () => {
    if (isTranslate === false) {
      await handleTranslateSentence();
      setIsTranslateClicked(!isTranslateClicked);
    } else {
      setIsTranslateClicked(!isTranslateClicked);
    }
  };

  return (
    <div>
      <div className="flex justify-center items-center my-2 gap-4">
        <div id="onborda-audio" className="flex flex-grow items-center">
          <Button
            variant="default"
            className="w-full"
            onClick={handleTogglePlayer}
          >
            {t("openvoicebutton")}
          </Button>
        </div>
        <div id="onborda-translate">
          <Button
            variant="default"
            onClick={handleTranslateSentence}
            disabled={loading}
          >
            {loading
              ? "Loading"
              : isTranslate && isTranslateOpen
                ? t("translateButton.close")
                : t("translateButton.open")}
          </Button>
        </div>
      </div>

      {togglePlayer && (
        <div
          id="audioPlayer"
          className="p-4 rounded my-2 bg-primary text-primary-foreground"
        >
          <div className="flex justify-between items-center gap-2">
            <Button
              variant="secondary"
              className="rounded-full w-10 h-10 p-0"
              onClick={handlePreviousTrack}
            >
              <TrackPreviousIcon />
            </Button>
            <Button
              id="playPauseButton"
              variant="secondary"
              className="rounded-full w-10 h-10 p-0"
              onClick={handlePlayPause}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </Button>
            <Button
              variant="secondary"
              className="rounded-full w-10 h-10 p-0"
              onClick={handleNextTrack}
            >
              <TrackNextIcon />
            </Button>
            <div>
              <Select defaultValue="1" onValueChange={handleSpeedTime}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="0.75">0.75x</SelectItem>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="1.25">1.25x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {isTranslate && isTranslateOpen && (
        <div className="h-32 md:h-24 flex flex-col justify-between items-center sticky">
          <Separator />
          {/* กรณีกดเล่นเสียง และกดแปล */}
          {isPlaying === true ? (
            <p className="text-center text-green-500">
              {translate[currentAudioIndex]}
            </p>
          ) : (
            <p className="text-center text-green-500">
              {translate[selectedIndex]}
            </p>
          )}
          <Separator />
        </div>
      )}

      <ContextMenu>
        <ContextMenuTrigger className="no-select">
          {sentenceList.map((sentence, index) => (
            <span
              id="onborda-savesentences"
              key={sentence.index}
              className={cn(
                selectedIndex === index && "bg-blue-200 dark:bg-blue-900",
                `${getHighlightedClass(index)}`
              )}
              onClick={() => {
                handleSentenceClick(sentence.startTime, index);
                setSelectedSentence(index);
                setSelectedIndex(index);
                //console.log("Selected sentence:", index);
              }}
            >
              {renderSentence(sentence.sentence, index)}
            </span>
          ))}
          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleAudioEnded}
          >
            <source src={sentenceList[currentAudioIndex].audioUrl} />
          </audio>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          {loading ? (
            <ContextMenuItem inset disabled>
              Loading
            </ContextMenuItem>
          ) : (
            <>
              <ContextMenuItem
                inset
                onClick={() => {
                  saveToFlashcard();
                }}
                disabled={loading}
              >
                Save to flashcard
              </ContextMenuItem>
              <ContextMenuItem
                inset
                onClick={handleTranslate}
                disabled={loading}
              >
                Translate
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={isTranslateClicked}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Translate</AlertDialogTitle>
            <AlertDialogDescription>
              <p>{sentences[selectedIndex]}</p>
              <p className="text-green-500 mt-3">{translate[selectedIndex]}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsTranslateClicked(false)}>
              Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-row items-center justify-between mt-5">
        {chapter > 1 && (
          <Button
            variant="default"
            onClick={() =>
              router.push(
                `/${locale}/student/stories/${story.storyId}/${chapter - 1}`
              )
            }
          >
            <ArrowLeftIcon className="mr-2" /> {t("previousChapter")}
          </Button>
        )}
        {chapter < story.totalChapters && (
          <Button
            variant="default"
            onClick={() =>
              router.push(
                `/${locale}/student/stories/${story.storyId}/${chapter + 1}`
              )
            }
          >
            {t("nextChapter")} <ArrowRightIcon className="ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
