"use client";
import React, { useState, useEffect, useRef, useTransition } from "react";
import { cn } from "@/lib/utils";
// import { createEmptyCard, Card } from "ts-fsrs";
import { Article, SentenceTimepoint, WordTimestamp } from "@/types";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../ui/context-menu";
import {
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Languages,
  Loader2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { saveFlashcard } from "@/actions/flashcard";
import { toast } from "sonner";
import { fetchArticleActivity } from "@/actions/article";
import Image from "next/image";
import { getArticleImageUrl, getAudioUrl } from "@/lib/storage-config";

type Props = {
  article: Article;
};

const SUPPORTED_LANGUAGES = {
  th: "🇹🇭 Thai",
  vi: "🇻🇳 Vietnamese",
  cn: "🇨🇳 Chinese (Simplified)",
  tw: "🇹🇼 Chinese (Traditional)",
};

export default function ArticleContent({ article }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSentenceRef = useRef<HTMLSpanElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [togglePlayer, setTogglePlayer] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState<string>("1");
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  const [translate, setTranslate] = useState<string>("");
  const [isTranslateOpen, setIsTranslateOpen] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("th");
  const [isPanding, startTransition] = useTransition();
  const t = useTranslations("Components");
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState<boolean>(false);

  useEffect(() => {
    if (article.id) {
      fetchArticleActivity(article.id).catch(console.error);
    }
  }, [article.id]);

  useEffect(() => {
    if (
      isPlaying &&
      currentSentenceIndex !== -1 &&
      currentSentenceRef.current &&
      !isAutoScrollPaused
    ) {
      const timeoutId = setTimeout(() => {
        currentSentenceRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [currentSentenceIndex, currentWordIndex, isPlaying, isAutoScrollPaused]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsControlsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: "-10px 0px -10px 0px",
      },
    );

    if (controlsRef.current) {
      observer.observe(controlsRef.current);
    }

    return () => {
      if (controlsRef.current) {
        observer.unobserve(controlsRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isScrolling = false;

    const handleScroll = () => {
      if (!isScrolling && isPlaying) {
        isScrolling = true;
        setIsAutoScrollPaused(true);

        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
          setIsAutoScrollPaused(false);
          isScrolling = false;
        }, 3000);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setIsAutoScrollPaused(false);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    }
  }, [isPlaying]);

  const shouldShowFixedControls =
    togglePlayer && isPlaying && !isControlsVisible;

  const handlePlayPause = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        try {
          await audioRef.current.play();
        } catch (error) {
          console.log("Error playing audio: ", error);
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTogglePlayer = () => {
    if (togglePlayer) {
      setTogglePlayer(false);
      setIsPlaying(false);
      setCurrentWordIndex(-1);
      setCurrentSentenceIndex(-1);
      setSpeed("1");
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } else {
      setTogglePlayer(true);
    }
  };

  const handleSpeedTime = (value: string) => {
    setSpeed(value);
    if (audioRef.current) {
      audioRef.current.playbackRate = Number(value);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !article) return;

    const handleLoadedMetadata = () => {
      audio.playbackRate = Number(speed);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [article, speed]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const newCurrentTime = audio.currentTime;
    setCurrentTime(newCurrentTime);

    const sentences = article.sentences as SentenceTimepoint[];

    let foundSentenceIndex = -1;
    let foundWordIndex = -1;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];

      if (
        newCurrentTime >= sentence.startTime &&
        newCurrentTime <= sentence.endTime
      ) {
        foundSentenceIndex = i;

        const isNewSentence = foundSentenceIndex !== currentSentenceIndex;

        if (isNewSentence) {
          foundWordIndex = 0;
        } else {
          for (let j = 0; j < sentence.words.length; j++) {
            const word = sentence.words[j];

            if (newCurrentTime >= word.start && newCurrentTime < word.end) {
              foundWordIndex = j;
              break;
            }
          }
        }
        break;
      }
    }

    if (foundSentenceIndex !== -1) {
      setCurrentSentenceIndex(foundSentenceIndex);
    }

    if (
      newCurrentTime === 0 ||
      (audioRef.current && newCurrentTime >= audioRef.current.duration)
    ) {
      foundWordIndex = -1;
    }

    if (foundWordIndex !== -1 && foundWordIndex !== currentWordIndex) {
      const wordDifference = foundWordIndex - currentWordIndex;

      if (wordDifference > 1 && currentWordIndex >= 0) {
        let intermediateIndex = currentWordIndex + 1;

        const highlightIntermediateWords = () => {
          if (intermediateIndex < foundWordIndex) {
            setCurrentWordIndex(intermediateIndex);
            intermediateIndex++;

            setTimeout(highlightIntermediateWords, 100);
          } else {
            setCurrentWordIndex(foundWordIndex);
          }
        };

        highlightIntermediateWords();
      } else {
        setCurrentWordIndex(foundWordIndex);
      }
    }
  };

  const handleTranslate = (sentenceIndex: number) => {
    if (selectedLanguage) {
      setTranslate(
        article.translatedPassage?.[
          selectedLanguage as "th" | "cn" | "tw" | "vi"
        ]?.[sentenceIndex] || "",
      );
    } else {
      if (currentSentenceIndex !== -1) {
        setTranslate(article.sentences?.[sentenceIndex]?.sentence || "");
      } else {
        setTranslate("");
      }
    }
  };

  const handleTranslateClick = (sentenceIndex: number) => {
    setCurrentSentenceIndex(sentenceIndex);
    setIsTranslateOpen(true);
    handleTranslate(sentenceIndex);
  };

  useEffect(() => {
    handleTranslate(currentSentenceIndex);
  }, [currentSentenceIndex, selectedLanguage]);

  const handleWordClick = async (
    sentenceIndex: number,
    wordIndex: number,
    sentence: SentenceTimepoint,
  ) => {
    if (wordIndex !== -1 && audioRef.current && sentence.words[wordIndex]) {
      // Set the audio time
      const startTime = sentence.words[wordIndex].start - 0.1;
      audioRef.current.currentTime = startTime;

      setCurrentSentenceIndex(sentenceIndex);
      setCurrentWordIndex(wordIndex);
      setCurrentTime(startTime);

      // Start playing the audio to give user feedback
      if (togglePlayer) {
        setTimeout(async () => {
          try {
            await audioRef.current?.play();
            setIsPlaying(true);
          } catch (error) {
            console.log("Error playing audio: ", error);
          }
        }, 50);
      }
    }
  };

  const handleSaveToFlashcard = () => {
    if (currentSentenceIndex !== -1) {
      const sentence = article.sentences?.[currentSentenceIndex];
      if (sentence) {
        const sentences = {
          sentence: sentence.sentence,
          startTime: sentence.startTime,
          endTime: sentence.endTime,
          translation: {
            th: article.translatedPassage?.th?.[currentSentenceIndex] as string,
            cn: article.translatedPassage?.cn?.[currentSentenceIndex] as string,
            tw: article.translatedPassage?.tw?.[currentSentenceIndex] as string,
            vi: article.translatedPassage?.vi?.[currentSentenceIndex] as string,
          },
          audioUrl: article.audioUrl as string,
        };

        if (sentences) {
          startTransition(async () => {
            try {
              const res = await saveFlashcard(article.id, [], [sentences]);
              console.log(res.message);
              if (res.status === 200) {
                toast.success("Success", {
                  description: `You have saved sentences to flashcard`,
                  richColors: true,
                });
              } else if (res.status === 400) {
                toast.info("Sentence already saved", {
                  description: `${res?.message}`,
                  richColors: true,
                });
              }
            } catch (error: any) {
              toast.error("Something went wrong.", {
                description: "Your sentence was not saved. Please try again.",
                richColors: true,
              });
            }
          });
        }
      } else {
        toast.error("Something went wrong.", {
          description: "Your sentence was not saved. Please try again.",
          richColors: true,
        });
      }
    }
  };

  const paragraphs = article.passage
    .split("\n\n")
    .filter((p) => p.trim() !== "");

  return (
    <div className="flex flex-col gap-4">
      <div ref={controlsRef} className="flex flex-col gap-2 md:flex-row">
        <div id="onborda-audio" className="w-full">
          <audio
            ref={audioRef}
            src={getAudioUrl(article.audioUrl || "")}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentWordIndex(-1);
              setCurrentSentenceIndex(-1);
              setCurrentTime(0);
            }}
          />
          <Button
            variant="default"
            className="w-full"
            onClick={handleTogglePlayer}
          >
            {t("audioButton")}
          </Button>
        </div>
        <div id="onborda-translate" className="flex gap-2">
          <Select
            value={selectedLanguage}
            onValueChange={setSelectedLanguage}
            disabled={loading}
          >
            <SelectTrigger className="h-10 w-full">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                <SelectValue>
                  <span className="text-lg">
                    {selectedLanguage === "th" && "🇹🇭"}
                    {selectedLanguage === "vi" && "🇻🇳"}
                    {selectedLanguage === "cn" && "🇨🇳"}
                    {selectedLanguage === "tw" && "🇹🇼"}
                  </span>
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-60 w-48">
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <SelectItem key={code} value={code} className="w-full">
                  <span className="truncate">{name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="default"
            disabled={loading || currentSentenceIndex === -1}
            onClick={() => {
              isTranslateOpen
                ? setIsTranslateOpen(false)
                : setIsTranslateOpen(true);
              handleTranslate(currentSentenceIndex);
            }}
            className="flex items-center gap-2"
          >
            <>
              <Languages className="h-4 w-4" />
              {isTranslateOpen ? t("closeButton") : t("translate")}
            </>
          </Button>
        </div>
      </div>

      {shouldShowFixedControls && (
        <div className="bg-primary dark:bg-primary-foreground fixed right-0 bottom-0 left-0 z-50 border-t p-4 shadow-lg transition-all duration-300">
          <div className="mx-auto max-w-4xl space-y-3">
            {isTranslateOpen && (
              <div className="flex flex-col items-center justify-center border-b pb-3">
                <p className="text-center text-green-500">{translate}</p>
              </div>
            )}

            {/* Main Controls */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-center md:gap-4">
              <div className="flex w-full items-center md:flex-grow">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleTogglePlayer}
                >
                  {t("audioButton")}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedLanguage}
                  onValueChange={setSelectedLanguage}
                  disabled={loading}
                >
                  <SelectTrigger className="h-10 w-[70px] md:w-auto">
                    <div className="flex items-center gap-1 md:gap-2">
                      <Languages className="h-4 w-4 shrink-0" />
                      <SelectValue>
                        <span className="text-lg">
                          {selectedLanguage === "th" && "🇹🇭"}
                          {selectedLanguage === "vi" && "🇻🇳"}
                          {selectedLanguage === "cn" && "🇨🇳"}
                          {selectedLanguage === "tw" && "🇹🇼"}
                        </span>
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-60 w-48">
                    {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                      <SelectItem key={code} value={code} className="w-full">
                        <span className="truncate">{name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="default"
                  disabled={loading || currentSentenceIndex === -1}
                  onClick={() => {
                    isTranslateOpen
                      ? setIsTranslateOpen(false)
                      : setIsTranslateOpen(true);
                    handleTranslate(currentSentenceIndex);
                  }}
                  className="flex flex-1 items-center gap-2"
                >
                  <>
                    <Languages className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {isTranslateOpen ? t("closeButton") : t("translate")}
                    </span>
                  </>
                </Button>
              </div>
            </div>

            {/* Audio Player Controls */}
            {togglePlayer && (
              <div className="bg-primary text-primary-foreground rounded p-4">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="secondary"
                    className="h-10 w-10 rounded-full p-0"
                  >
                    <SkipBackIcon />
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-10 w-10 rounded-full p-0"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-10 w-10 rounded-full p-0"
                  >
                    <SkipForwardIcon />
                  </Button>
                  <div>
                    <Select defaultValue="1" onValueChange={handleSpeedTime}>
                      <SelectTrigger className="border-muted-foreground w-20 border">
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
          </div>
        </div>
      )}

      {/* Add padding when fixed controls are shown */}
      {shouldShowFixedControls && (
        <div
          className={cn(
            "pb-4",
            togglePlayer && isTranslateOpen
              ? "h-52"
              : togglePlayer
                ? "h-36"
                : isTranslateOpen
                  ? "h-32"
                  : "h-20",
          )}
        ></div>
      )}

      {/* Keep normal audio player when not fixed */}
      {togglePlayer && !shouldShowFixedControls && (
        <div
          id="audioPlayer"
          className="bg-primary text-primary-foreground my-2 rounded p-4 transition-all duration-300"
        >
          <div className="flex items-center justify-between gap-2">
            <Button variant="secondary" className="h-10 w-10 rounded-full p-0">
              <SkipBackIcon />
            </Button>
            <Button
              id="playPauseButton"
              variant="secondary"
              className="h-10 w-10 rounded-full p-0"
              onClick={handlePlayPause}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </Button>
            <Button variant="secondary" className="h-10 w-10 rounded-full p-0">
              <SkipForwardIcon />
            </Button>
            <div>
              <Select defaultValue="1" onValueChange={handleSpeedTime}>
                <SelectTrigger className="border-muted-foreground w-20 border">
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

      {/* Keep normal translate when not fixed */}
      {isTranslateOpen && !shouldShowFixedControls && (
        <div className="flex h-32 flex-col items-center justify-between transition-all duration-300 md:h-24">
          <Separator />
          <p className="text-center text-green-500">{translate}</p>
          <Separator />
        </div>
      )}

      {/* {isTranslateOpen && (
        <div
          // className="flex h-32 flex-col items-center justify-between md:h-24"
          className={cn(
            "flex h-32 flex-col items-center justify-between transition-all duration-300 md:h-24",
            shouldShowFixedControls
              ? "dark:bg-primary-foreground bg-primary fixed right-4 bottom-0 left-4 z-30 border-t p-4 shadow-lg"
              : "",
          )}
        >
          <Separator />
          <p className="text-center text-green-500">{translate}</p>
          <Separator />
        </div>
      )} */}

      {/* {Array.isArray(article.sentences) &&
        article.sentences.map(
          (sentence: SentenceTimepoint, sentenceIndex: number) => {
            return (
              <ContextMenu key={sentenceIndex}>
                <ContextMenuTrigger>
                  <span
                    className={`font-article mb-2 block rounded px-0.5 indent-4 text-lg hyphens-auto whitespace-pre-wrap transition-all duration-200 md:text-xl ${
                      sentenceIndex === currentSentenceIndex
                        ? "bg-blue-300 dark:bg-blue-900/70"
                        : ""
                    }`}
                  >
                    {(() => {
                      // Split on spaces and punctuation, including single quotes
                      const parts = sentence.sentence.split(
                        /(\s+|[.!?;:,"""'’`()[\]{}—–\u2013\u2014\u2026]+)/,
                      );
                      let wordIndex = 0;

                      // Merge contractions back together
                      const mergedParts = [];
                      for (let i = 0; i < parts.length; i++) {
                        const current = parts[i];
                        const next = parts[i + 1];
                        const after = parts[i + 2];

                        // Check if this is a contraction pattern: word + ' + word-part
                        if (
                          current &&
                          /^\w+$/.test(current) && // current is a word
                          (next === "'" || next === "’") && // next is apostrophe
                          after &&
                          /^[a-z]+$/i.test(after) && // after is letters
                          (after.toLowerCase() === "t" ||
                            after.toLowerCase() === "s" ||
                            after.toLowerCase() === "re" ||
                            after.toLowerCase() === "ll" ||
                            after.toLowerCase() === "ve" ||
                            after.toLowerCase() === "d" ||
                            after.toLowerCase() === "m")
                        ) {
                          // Merge contraction
                          mergedParts.push(current + next + after);
                          i += 2; // Skip the next two parts
                        } else {
                          mergedParts.push(current);
                        }
                      }

                      return mergedParts.map((part, partIndex) => {
                        // A word must contain letters/numbers and may include hyphens and apostrophes
                        // But it cannot be ONLY punctuation
                        const isActualWord =
                          /[\w]/.test(part) && // Must contain at least one letter/number
                          /^[\w'-]+$/.test(part) && // Can only contain word chars, hyphens, apostrophes
                          part.trim() !== "";

                        const currentPartWordIndex = isActualWord
                          ? wordIndex
                          : -1;

                        if (isActualWord) {
                          wordIndex++;
                        }

                        const isCurrentWord =
                          sentenceIndex === currentSentenceIndex &&
                          currentPartWordIndex !== -1 &&
                          currentPartWordIndex === currentWordIndex &&
                          isActualWord;

                        return (
                          <span
                            key={partIndex}
                            className={cn(
                              isActualWord
                                ? "cursor-pointer rounded transition-colors duration-150"
                                : "",
                              isCurrentWord && isPlaying
                                ? "bg-blue-500 text-white"
                                : isActualWord
                                  ? "hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                  : "",
                            )}
                            onClick={() =>
                              handleWordClick(
                                sentenceIndex,
                                currentPartWordIndex,
                                sentence,
                              )
                            }
                            // onClick={() => {
                            //   if (currentPartWordIndex !== -1 && isActualWord) {
                            //     setCurrentSentenceIndex(sentenceIndex);
                            //     setCurrentWordIndex(currentPartWordIndex);

                            //     if (
                            //       audioRef.current &&
                            //       sentence.words[currentPartWordIndex]
                            //     ) {
                            //       audioRef.current.currentTime =
                            //         sentence.words[currentPartWordIndex].start;
                            //     }
                            //   }
                            // }}
                          >
                            {part}
                          </span>
                        );
                      });
                    })()}
                    {sentence.sentence.split(/\b/).map((part, partIndex) => {
                      // const wordIndex = sentence.words.findIndex(
                      //   (word) => word.word === part
                      // );

                      // Instead of using findIndex, we need to map the split parts to actual word indices
                      // We'll create a mapping of word positions to their indices in the words array
                      let wordIndex = -1;
                      let wordCount = 0;

                      // Count actual words (not spaces/punctuation) up to this part
                      const splitParts = sentence.sentence.split(/\b/);

                      for (let i = 0; i <= partIndex; i++) {
                        const currentPart = splitParts[i];
                        // Check if this part is an actual word (not whitespace/punctuation)
                        if (currentPart && /\w/.test(currentPart)) {
                          if (i === partIndex) {
                            wordIndex = wordCount;
                          }
                          wordCount++;
                        }
                      }

                      // Only highlight if this part is actually a word (contains letters/numbers)
                      const isActualWord = part && /\w/.test(part);

                      // Check if this word should be highlighted
                      const isCurrentWord =
                        sentenceIndex === currentSentenceIndex &&
                        wordIndex !== -1 &&
                        wordIndex === currentWordIndex &&
                        isActualWord; // Only highlight actual words

                      return (
                        <span
                          key={partIndex}
                          className={cn(
                            isActualWord
                              ? "cursor-pointer rounded transition-colors duration-150"
                              : "",
                            isCurrentWord
                              ? "bg-blue-500 text-white"
                              : isActualWord
                                ? "hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                : "",
                          )}
                          onClick={() => {
                            if (wordIndex !== -1 && isActualWord) {
                              setCurrentSentenceIndex(sentenceIndex);
                              setCurrentWordIndex(wordIndex);

                              // Jump audio to word start time
                              if (audioRef.current) {
                                audioRef.current.currentTime =
                                  sentence.words[wordIndex].start;
                              }
                            }
                          }}
                        >
                          {part}
                        </span>
                      );
                    })}
                  </span>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-50">
                  {loading ? (
                    <ContextMenuItem inset disabled>
                      Loading
                    </ContextMenuItem>
                  ) : (
                    <>
                      <ContextMenuItem
                        inset
                        disabled={loading}
                        onClick={handleSaveToFlashcard}
                      >
                        {t("saveToFlashcard")}
                      </ContextMenuItem>
                      <ContextMenuItem
                        inset
                        disabled={loading || currentSentenceIndex === -1}
                        onClick={() => handleTranslateClick(sentenceIndex)}
                      >
                        {t("translate")}
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            );
          },
        )} */}

      {(() => {
        if (!Array.isArray(article.sentences)) {
          // Fallback to original paragraphs if no sentences
          return paragraphs.map((p, index) => (
            <p
              key={index}
              className="font-article mb-2 indent-4 text-lg hyphens-auto whitespace-pre-wrap"
            >
              {p}
            </p>
          ));
        }

        // Group sentences back into original paragraphs
        const groupSentencesIntoParagraphs = () => {
          const paragraphGroups: { paragraph: string; sentences: number[] }[] =
            [];
          let currentParagraphText = "";
          let currentSentenceIndices: number[] = [];

          // Reconstruct paragraph structure by checking which sentences belong to which paragraph
          paragraphs.forEach((paragraph) => {
            const paragraphSentences: number[] = [];

            article.sentences?.forEach((sentence, sentenceIndex) => {
              if (paragraph.includes(sentence.sentence.trim())) {
                paragraphSentences.push(sentenceIndex);
              }
            });

            if (paragraphSentences.length > 0) {
              paragraphGroups.push({
                paragraph,
                sentences: paragraphSentences,
              });
            }
          });

          return paragraphGroups;
        };

        const paragraphGroups = groupSentencesIntoParagraphs();

        return paragraphGroups.map((group, groupIndex) => {
          return (
            <div key={groupIndex} className="flex flex-col gap-4">
              <Image
                className="rounded-lg shadow-xl"
                src={
                  getArticleImageUrl(article.id, groupIndex + 1) || `/nopic.png`
                }
                alt="Article Image"
                width={1024}
                height={1024}
                unoptimized
              />
              <p className="mb-4 indent-8 whitespace-pre-wrap">
                {group.sentences.map((sentenceIndex) => {
                  const sentence = article.sentences?.[sentenceIndex];
                  const isCurrentSentence =
                    sentenceIndex === currentSentenceIndex;

                  return (
                    <ContextMenu key={sentenceIndex}>
                      <ContextMenuTrigger>
                        <span
                          ref={isCurrentSentence ? currentSentenceRef : null}
                          className={`font-article rounded px-0.5 text-lg transition-all duration-200 md:text-xl ${
                            sentenceIndex === currentSentenceIndex
                              ? "bg-blue-300 dark:bg-blue-900/70"
                              : ""
                          }`}
                        >
                          {(() => {
                            // ... existing word rendering logic ...
                            const parts = sentence?.sentence.split(
                              /(\s+|[.!?;:,"""''`()[\]{}—–\u2013\u2014\u2026]+)/,
                            );
                            let wordIndex = 0;

                            const mergedParts = [];
                            for (let i = 0; i < (parts?.length ?? 0); i++) {
                              const current = parts?.[i];
                              const next = parts?.[i + 1];
                              const after = parts?.[i + 2];

                              if (
                                current &&
                                /^\w+$/.test(current) &&
                                (next === "'" || next === "'") &&
                                after &&
                                /^[a-z]+$/i.test(after) &&
                                (after.toLowerCase() === "t" ||
                                  after.toLowerCase() === "s" ||
                                  after.toLowerCase() === "re" ||
                                  after.toLowerCase() === "ll" ||
                                  after.toLowerCase() === "ve" ||
                                  after.toLowerCase() === "d" ||
                                  after.toLowerCase() === "m")
                              ) {
                                mergedParts.push(current + next + after);
                                i += 2;
                              } else {
                                mergedParts.push(current);
                              }
                            }

                            return mergedParts.map((part, partIndex) => {
                              const isActualWord =
                                /[\w]/.test(part ?? "") &&
                                /^[\w'-]+$/.test(part ?? "") &&
                                part?.trim() !== "";

                              const currentPartWordIndex = isActualWord
                                ? wordIndex
                                : -1;

                              if (isActualWord) {
                                wordIndex++;
                              }

                              const isCurrentWord =
                                sentenceIndex === currentSentenceIndex &&
                                currentPartWordIndex !== -1 &&
                                currentPartWordIndex === currentWordIndex &&
                                isActualWord;

                              return (
                                <span
                                  key={partIndex}
                                  className={cn(
                                    isActualWord
                                      ? "cursor-pointer rounded transition-colors duration-150"
                                      : "",
                                    isCurrentWord && isPlaying
                                      ? "bg-blue-500 text-white"
                                      : isActualWord
                                        ? "hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                        : "",
                                  )}
                                  onClick={() =>
                                    handleWordClick(
                                      sentenceIndex,
                                      currentPartWordIndex,
                                      sentence as SentenceTimepoint,
                                    )
                                  }
                                >
                                  {part}
                                </span>
                              );
                            });
                          })()}
                        </span>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-50">
                        <ContextMenuItem
                          inset
                          disabled={loading || currentSentenceIndex === -1}
                          onClick={() => handleTranslateClick(sentenceIndex)}
                        >
                          {t("translate")}
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </p>
            </div>
          );
        });
      })()}
    </div>
  );
}
