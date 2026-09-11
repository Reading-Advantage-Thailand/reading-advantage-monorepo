"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type UseAudioSegmentResult = {
    audioRef: React.RefObject<HTMLAudioElement | null>;
    isPlaying: boolean;
    toggle: () => void;
};

/**
 * Plays one audio segment from `start` to `end` without polling timers.
 * The native `timeupdate` event stops playback at the segment end, and the
 * effect cleanup removes every listener and pauses the audio on unmount.
 * @param url The audio URL; re-registering listeners when it changes.
 * @param start Start position in seconds.
 * @param end Optional end position in seconds; plays to the end when omitted.
 * @returns The audio element ref, playing state, and a toggle handler.
 */
export default function useAudioSegment(
    url: string,
    start: number,
    end?: number
): UseAudioSegmentResult {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const startRef = useRef(start);
    const endRef = useRef(end);

    useEffect(() => {
        startRef.current = start;
        endRef.current = end;
    }, [start, end]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            const endTime = endRef.current;
            if (endTime !== undefined && audio.currentTime >= endTime) {
                audio.pause();
                audio.currentTime = startRef.current;
                setIsPlaying(false);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
        };

        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("ended", handleEnded);
            audio.pause();
        };
    }, [url]);

    const toggle = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            // Stop semantics: pause and keep the position at the segment start.
            audio.pause();
            audio.currentTime = startRef.current;
            setIsPlaying(false);
            return;
        }
        audio.currentTime = startRef.current;
        setIsPlaying(true);
        audio.play().catch((error) => {
            console.error("Audio playback failed:", error);
            setIsPlaying(false);
        });
    }, [isPlaying]);

    return { audioRef, isPlaying, toggle };
}
