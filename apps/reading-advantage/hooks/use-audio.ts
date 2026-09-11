"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type Sentence = {
    sentence: string;
    index: number;
    startTime: number;
    endTime: number;
    audioUrl: string;
};

export type UseAudioOptions = {
    /**
     * True when the sentence list carries real timepoints. The audio element
     * then advances sentences through the `ended` event. When false, the
     * fallback timing mode advances sentences through the timeupdate check.
     */
    hasTimepoints?: boolean;
};

/**
 * Drives sentence-by-sentence audio playback for the reading views.
 * Both the article and stories content components share this hook.
 * @param sentenceList Sentences with start/end times and audio URLs.
 * @param options Playback options; `hasTimepoints` selects the advance path.
 * @returns Playback handlers, state, and the audio element ref.
 */
export default function useAudio(
    sentenceList: Sentence[],
    options?: UseAudioOptions
) {
    const { hasTimepoints = true } = options ?? {};
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const currentTimeRef = useRef(0);
    const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
    const [togglePlayer, setTogglePlayer] = useState<boolean>(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [selectedSentence, setSelectedSentence] = useState<number>(-1);
    const [speed, setSpeed] = useState<string>("1");
    const speedRef = useRef("1");
    const isPlayingRef = useRef(false);

    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    /**
     * Loads the clip for `index` and plays it from the sentence start time.
     * Attaches the `canplaythrough` listener before `load()` because cached
     * clips can fire the event before `load()` returns.
     * @param index The sentence index to play.
     */
    const playFromIndex = useCallback(
        (index: number) => {
            const audio = audioRef.current;
            const sentence = sentenceList[index];
            if (!audio || !sentence) return;
            audio.pause();
            audio.src = sentence.audioUrl;
            const playAudio = () => {
                audio.removeEventListener("canplaythrough", playAudio);
                audio.currentTime = sentence.startTime;
                audio.play().catch((error) => {
                    console.error("Error playing audio: ", error);
                });
            };
            audio.addEventListener("canplaythrough", playAudio);
            audio.load();
        },
        [sentenceList]
    );

    const handlePreviousTrack = () => {
        if (!isPlaying) return;
        if (currentAudioIndex > 0) {
            const prevAudioIndex = currentAudioIndex - 1;
            setCurrentAudioIndex(prevAudioIndex);
            playFromIndex(prevAudioIndex);
        } else {
            setCurrentAudioIndex(0);
            setSelectedIndex(-1);
            playFromIndex(0);
        }
    };

    const handleNextTrack = () => {
        if (!isPlaying) return;
        if (currentAudioIndex < sentenceList.length - 1) {
            const nextAudioIndex = currentAudioIndex + 1;
            setCurrentAudioIndex(nextAudioIndex);
            playFromIndex(nextAudioIndex);
        } else {
            setIsPlaying(false);
        }
    };

    const handleSpeedTime = (value: string) => {
        setSpeed(value);
        speedRef.current = value;
        if (audioRef.current) {
            audioRef.current.playbackRate = Number(value);
        }
    };

    const handleTogglePlayer = () => {
        if (togglePlayer) {
            setTogglePlayer(false);
            audioRef.current?.load();
            setIsPlaying(false);
            setCurrentAudioIndex(0);
            setSpeed("1");
            speedRef.current = "1";
        } else {
            setTogglePlayer(true);
        }
    };

    const handleSentenceClick = (startTime: number, audioIndex: number) => {
        if (audioRef.current && togglePlayer) {
            setCurrentAudioIndex(audioIndex);
            setSelectedIndex(audioIndex);
            setSelectedSentence(audioIndex);
            playFromIndex(audioIndex);
            if (!isPlaying) {
                setIsPlaying(true);
            }
        }
    };

    const advanceToNext = () => {
        if (currentAudioIndex < sentenceList.length - 1) {
            const nextAudioIndex = currentAudioIndex + 1;
            setCurrentAudioIndex(nextAudioIndex);
            playFromIndex(nextAudioIndex);
        } else {
            setIsPlaying(false);
            setCurrentAudioIndex(0);
        }
    };

    const handleAudioEnded = () => {
        if (!hasTimepoints) {
            // Fallback timing mode: sentences advance via the timeupdate check.
            setIsPlaying(false);
            return;
        }
        advanceToNext();
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            currentTimeRef.current = audioRef.current.currentTime;
            // Single advance path: onEnded advances when timepoints exist.
            // The timeupdate check runs only in fallback timing mode.
            if (!hasTimepoints) {
                const currentSentence = sentenceList[currentAudioIndex];
                if (
                    currentSentence &&
                    audioRef.current.currentTime >= currentSentence.endTime
                ) {
                    advanceToNext();
                }
            }
        }
    };

    const handlePlayPause = async () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                try {
                    await audioRef.current.play();
                } catch (error) {
                    console.error("Error playing audio: ", error);
                }
            }
            setIsPlaying(!isPlaying);
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        setSelectedIndex(-1);
        if (audio && sentenceList[currentAudioIndex]) {
            // Use the URL from sentenceList (already has cache busting)
            audio.src = sentenceList[currentAudioIndex].audioUrl;
            audio.load();

            const handleLoadedMetadata = () => {
                audio.currentTime = sentenceList[currentAudioIndex].startTime;
                audio.playbackRate = Number(speedRef.current);

                if (isPlayingRef.current) {
                    audio.play().catch((error) => {
                        console.error("Playback error:", error);
                    });
                }
            };

            audio.addEventListener("loadedmetadata", handleLoadedMetadata);

            return () => {
                audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
                audio.pause();
            };
        }
    }, [currentAudioIndex, sentenceList]);

    return {
        handlePlayPause,
        handleTimeUpdate,
        handleSentenceClick,
        handleAudioEnded,
        handleTogglePlayer,
        handleSpeedTime,
        handleNextTrack,
        handlePreviousTrack,
        playFromIndex,
        audioRef,
        isPlaying,
        currentAudioIndex,
        speed,
        selectedIndex,
        selectedSentence,
        togglePlayer,
        setIsPlaying,
        setCurrentAudioIndex,
        setSelectedIndex,
        setSelectedSentence,
    };
}
