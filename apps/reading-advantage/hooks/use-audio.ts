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
     * True when the sentence list carries real timepoints. Combined clips
     * still advance through `timeupdate`; separate clips advance through
     * `ended`. When false, fallback timing advances through `timeupdate`.
     */
    hasTimepoints?: boolean;
};

/**
 * Returns true when every sentence shares one audio file.
 * Combined clips must advance by time, not by the `ended` event.
 * @param sentenceList Sentences with audio URLs.
 * @returns True when the list is a single combined clip.
 */
export function isCombinedAudioClip(sentenceList: Sentence[]): boolean {
    if (sentenceList.length < 2) return false;
    const firstUrl = sentenceList[0]?.audioUrl;
    return Boolean(firstUrl) && sentenceList.every((sentence) => sentence.audioUrl === firstUrl);
}

/**
 * Drives sentence-by-sentence audio playback for the reading views.
 * Both the article and stories content components share this hook.
 * @param sentenceList Sentences with start/end times and audio URLs.
 * @param options Playback options; `hasTimepoints` selects fallback timing.
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
    const sentenceListRef = useRef(sentenceList);
    sentenceListRef.current = sentenceList;
    const combinedClipRef = useRef(isCombinedAudioClip(sentenceList));
    combinedClipRef.current = isCombinedAudioClip(sentenceList);
    const loadedUrlRef = useRef<string | null>(null);
    const canplayHandlerRef = useRef<(() => void) | null>(null);
    const currentIndexRef = useRef(0);
    currentIndexRef.current = currentAudioIndex;

    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    /**
     * Detaches a pending `canplaythrough` listener so a later load cannot
     * fire an old seek.
     * @param audio The audio element that owns the listener.
     */
    const clearCanplayHandler = (audio: HTMLAudioElement) => {
        if (canplayHandlerRef.current) {
            audio.removeEventListener("canplaythrough", canplayHandlerRef.current);
            canplayHandlerRef.current = null;
        }
    };

    /**
     * Seeks to the sentence start and restores the selected playback speed.
     * @param audio The audio element to seek.
     * @param sentence The sentence that should play.
     * @param autoplay When true, start playback after the seek.
     */
    const seekToSentence = (
        audio: HTMLAudioElement,
        sentence: Sentence,
        autoplay: boolean
    ) => {
        audio.currentTime = sentence.startTime;
        audio.playbackRate = Number(speedRef.current);
        if (autoplay) {
            audio.play().catch((error) => {
                console.error("Error playing audio: ", error);
            });
        }
    };

    /**
     * Loads the clip for `index` only when the URL changed, then plays from
     * the sentence start time. Combined clips seek without a second load.
     * Attaches the `canplaythrough` listener before `load()` because cached
     * clips can fire the event before `load()` returns.
     * @param index The sentence index to play.
     */
    const playFromIndex = useCallback((index: number) => {
        const audio = audioRef.current;
        const sentence = sentenceListRef.current[index];
        if (!audio || !sentence) return;

        if (loadedUrlRef.current === sentence.audioUrl) {
            clearCanplayHandler(audio);
            seekToSentence(audio, sentence, true);
            return;
        }

        clearCanplayHandler(audio);
        audio.pause();
        audio.src = sentence.audioUrl;
        loadedUrlRef.current = sentence.audioUrl;
        const playAudio = () => {
            audio.removeEventListener("canplaythrough", playAudio);
            if (canplayHandlerRef.current === playAudio) {
                canplayHandlerRef.current = null;
            }
            seekToSentence(audio, sentence, true);
        };
        canplayHandlerRef.current = playAudio;
        audio.addEventListener("canplaythrough", playAudio);
        audio.load();
    }, []);

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
            loadedUrlRef.current = null;
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
        const list = sentenceListRef.current;
        const index = currentIndexRef.current;
        if (index < list.length - 1) {
            const nextAudioIndex = index + 1;
            setCurrentAudioIndex(nextAudioIndex);
            playFromIndex(nextAudioIndex);
        } else {
            setIsPlaying(false);
            setCurrentAudioIndex(0);
        }
    };

    const handleAudioEnded = () => {
        // Combined files fire `ended` once at the end of the article.
        // Fallback timing also uses timeupdate, so `ended` only stops playback.
        if (combinedClipRef.current || !hasTimepoints) {
            setIsPlaying(false);
            return;
        }
        advanceToNext();
    };

    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        if (!audio) return;
        currentTimeRef.current = audio.currentTime;
        const useTimeupdateAdvance = combinedClipRef.current || !hasTimepoints;
        if (!useTimeupdateAdvance) return;
        const currentSentence = sentenceListRef.current[currentIndexRef.current];
        if (currentSentence && audio.currentTime >= currentSentence.endTime) {
            advanceToNext();
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
        const sentence = sentenceListRef.current[currentAudioIndex];
        setSelectedIndex(-1);
        if (!audio || !sentence) return;

        if (loadedUrlRef.current === sentence.audioUrl) {
            audio.currentTime = sentence.startTime;
            audio.playbackRate = Number(speedRef.current);
            return;
        }

        const handleLoadedMetadata = () => {
            audio.currentTime = sentence.startTime;
            audio.playbackRate = Number(speedRef.current);
            if (isPlayingRef.current) {
                audio.play().catch((error) => {
                    console.error("Playback error:", error);
                });
            }
        };

        clearCanplayHandler(audio);
        audio.src = sentence.audioUrl;
        loadedUrlRef.current = sentence.audioUrl;
        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.load();

        return () => {
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        };
    }, [currentAudioIndex]);

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
