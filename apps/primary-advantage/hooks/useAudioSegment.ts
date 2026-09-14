"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { shouldStopSegment } from "@/lib/audio-highlight";

/**
 * State returned by the shared audio-segment hook.
 */
export interface AudioSegmentState {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  playSegment: () => Promise<void>;
  stopSegment: () => void;
}

/**
 * Plays one audio slice on the native timeupdate event.
 * @param audioUrl The audio resource URL.
 * @param startTimestamp Where the slice starts in seconds.
 * @param endTimestamp Where the slice ends; zero means play to the end.
 * @returns The element ref plus playback state and controls.
 */
export function useAudioSegment(
  audioUrl: string,
  startTimestamp: number,
  endTimestamp: number,
): AudioSegmentState {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentRef = useRef({ start: startTimestamp, end: endTimestamp });
  segmentRef.current = { start: startTimestamp, end: endTimestamp };
  const [isPlaying, setIsPlaying] = useState(false);

  const stopSegment = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const playSegment = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = segmentRef.current.start;
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => {
      if (shouldStopSegment(audio.currentTime, segmentRef.current.end)) {
        audio.pause();
        setIsPlaying(false);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.load();
  }, [audioUrl]);

  return { audioRef, isPlaying, playSegment, stopSegment };
}
