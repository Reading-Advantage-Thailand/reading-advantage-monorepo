"use client";
import { memo, useMemo, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { HIGHLIGHT_CLASSES } from "@/lib/audio-highlight";
import {
  bucketItems,
  bucketSentencesIntoParagraphs,
  splitPassageIntoSentences,
  TARGET_PARAGRAPH_COUNT,
} from "@/lib/paragraph-utils";
import { buildWordMaps, splitDisplayWords, type ReadAlongSentence, type WordMaps, type DisplaySentence } from "@/lib/read-along/align";
import type { ReadAlongPosition } from "@/lib/read-along/position";
import { cn } from "@/lib/utils";

/** Props of the read-along passage; the host owns the audio element and the player. */
export interface ReadAlongPassageProps {
  /** The sentence entries with their word timings; an empty list shows the passage text. */
  sentences: ReadAlongSentence[];
  /** The plain text, shown when `sentences` is empty. */
  passage: string;
  /** The sentence and the audio word that the voice says. */
  position: ReadAlongPosition;
  /** True while the read-along is on: the band, the mark, and the taps work. */
  active: boolean;
  /** Ref for the element of the current sentence (the host scrolls to it). */
  currentSentenceRef?: Ref<HTMLSpanElement>;
  /** Content before each block, for example a picture; the passage knows no article page. */
  renderBlockMedia?: (blockIndex: number) => ReactNode;
  /** Called with the sentence and the audio word of a tapped word; -1 when the sentence has no timing. */
  onWordTap?: (sentenceIndex: number, audioWordIndex: number) => void;
  /** Called from the sentence menu; the menu shows only when this prop is set. */
  onTranslate?: (sentenceIndex: number) => void;
  translateLabel?: string;
  translateDisabled?: boolean;
}

interface SentenceViewProps {
  index: number;
  display: DisplaySentence;
  maps: WordMaps;
  isCurrent: boolean;
  /** Screen word to mark, or -1. */
  markedWord: number;
  active: boolean;
  currentSentenceRef?: Ref<HTMLSpanElement>;
  onWordTap?: (sentenceIndex: number, audioWordIndex: number) => void;
}

/** One sentence: the band, and the words with the mark. */
const SentenceView = memo(function SentenceView({
  index,
  display,
  maps,
  isCurrent,
  markedWord,
  active,
  currentSentenceRef,
  onWordTap,
}: SentenceViewProps) {
  const interactive = active && !!onWordTap;
  return (
    <span
      ref={isCurrent ? currentSentenceRef : undefined}
      data-sentence={index}
      className={cn(
        "font-article rounded px-0.5 text-lg transition-all duration-200 md:text-xl",
        active && isCurrent && HIGHLIGHT_CLASSES.playingSentence,
        interactive &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
      {...(interactive
        ? {
            role: "button",
            tabIndex: 0,
            onClick: () => onWordTap?.(index, -1),
            onKeyDown: (e: KeyboardEvent<HTMLSpanElement>) => {
              if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onWordTap?.(index, -1);
              }
            },
          }
        : {})}
    >
      {display.words.map((word) => {
        const tap = (e: MouseEvent) => {
          e.stopPropagation();
          onWordTap?.(index, maps.displayToAudio[word.index] ?? -1);
        };
      
        return (
          <span key={word.index}>
            {word.lead}
            <span
              className={cn(
                "cursor-pointer rounded transition-colors duration-150",
                active && word.index === markedWord ? HIGHLIGHT_CLASSES.currentWord : HIGHLIGHT_CLASSES.hoverWord,
              )}
              onClick={tap}
            >
              {word.text}
            </span>
          </span>
        );
      })}
      {display.tail}
    </span>
  );
});

/**
 * Renders the text of an article in at most 3 blocks, with the sentence band and the word mark.
 * @param props See `ReadAlongPassageProps`.
 * @returns The blocks.
 */
export function ReadAlongPassage({
  sentences,
  passage,
  position,
  active,
  currentSentenceRef,
  renderBlockMedia,
  onWordTap,
  onTranslate,
  translateLabel,
  translateDisabled,
}: ReadAlongPassageProps): ReactNode {
  const aligned = useMemo(
    () =>
      sentences.map((sentence) => {
        const display = splitDisplayWords(sentence.sentence);
        const maps = buildWordMaps(
          display.words.map((w) => w.text),
          sentence.words.map((w) => w.word),
        );
        return { display, maps };
      }),
    [sentences],
  );

  if (sentences.length === 0) {
    return bucketSentencesIntoParagraphs(splitPassageIntoSentences(passage)).map((p, i) => (
      <p key={i} className="font-article mb-2 indent-4 text-lg hyphens-auto whitespace-pre-wrap">
        {p}
      </p>
    ));
  }

  const blocks = bucketItems(
    sentences.map((_, i) => i),
    TARGET_PARAGRAPH_COUNT,
  );

  return blocks.map((block, blockIndex) => (
    <div key={blockIndex} className="flex flex-col gap-4">
      {renderBlockMedia?.(blockIndex)}
      <p className="mb-4 indent-8 whitespace-pre-wrap">
        {block.map((i) => {
          const { display, maps } = aligned[i];
          const isCurrent = i === position.sentenceIndex;
          const view = (
            <SentenceView
              index={i}
              display={display}
              maps={maps}
              isCurrent={isCurrent}
              markedWord={isCurrent && position.wordIndex >= 0 ? (maps.audioToDisplay[position.wordIndex] ?? -1) : -1}
              active={active}
              currentSentenceRef={currentSentenceRef}
              onWordTap={onWordTap}
            />
          );
          return (
            <span key={i}>
              {onTranslate ? (
                <ContextMenu>
                  <ContextMenuTrigger>{view}</ContextMenuTrigger>
                  <ContextMenuContent className="w-50">
                    <ContextMenuItem inset disabled={translateDisabled} onClick={() => onTranslate(i)}>
                      {translateLabel}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ) : (
                view
              )}{" "}
            </span>
          );
        })}
      </p>
    </div>
  ));
}
