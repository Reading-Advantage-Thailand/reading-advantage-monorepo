"use client";
import { useEffect, useRef, useState } from "react";

export type Sentence = {
    sentence: string;
    index: number;
    startTime: number;
    endTime: number;
    audioUrl: string;
};

export default function useAudio(sentenceList: Sentence[]) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const currentTimeRef = useRef(0);
    const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
    const [togglePlayer, setTogglePlayer] = useState<Boolean>(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [speed, setSpeed] = useState<string>("1");

    const handlePreviousTrack = () => {
        if (isPlaying) {
            if (currentAudioIndex > 0) {
                const prevAudioIndex = currentAudioIndex - 1;
                setCurrentAudioIndex(prevAudioIndex);
                if (audioRef.current) {
                    audioRef.current.src = sentenceList[prevAudioIndex].audioUrl;
                    audioRef.current.load();
                    const playAudio = () => {
                        audioRef.current!.currentTime =
                            sentenceList[prevAudioIndex].startTime;
                        audioRef.current!.play().catch((error) => {
                            console.error("Error playing audio: ", error);
                        });
                        audioRef.current!.removeEventListener("canplaythrough", playAudio);
                    };
                    audioRef.current.addEventListener("canplaythrough", playAudio);
                }
            } else {
                setCurrentAudioIndex(0);
                setSelectedIndex(-1);
                if (audioRef.current) {
                    audioRef.current.src = sentenceList[currentAudioIndex].audioUrl;
                    audioRef.current.load();

                    const playAudio = () => {
                        audioRef.current!.currentTime =
                            sentenceList[currentAudioIndex].startTime;
                        audioRef.current!.play().catch((error) => {
                            console.error("Error playing audio: ", error);
                        });
                        audioRef.current!.removeEventListener("canplaythrough", playAudio);
                    };

                    audioRef.current.addEventListener("canplaythrough", playAudio);
                }
            }
        }
    };

    const handleNextTrack = () => {
        if (isPlaying) {
            if (currentAudioIndex < sentenceList.length - 1) {
                const nextAudioIndex = currentAudioIndex + 1;
                setCurrentAudioIndex(nextAudioIndex);
                if (audioRef.current) {
                    audioRef.current.src = sentenceList[nextAudioIndex].audioUrl;
                    audioRef.current.load();
                    const playAudio = () => {
                        audioRef.current!.currentTime =
                            sentenceList[nextAudioIndex].startTime;
                        audioRef.current!.play().catch((error) => {
                            console.error("Error playing audio: ", error);
                        });
                        audioRef.current!.removeEventListener("canplaythrough", playAudio);
                    };
                    audioRef.current.addEventListener("canplaythrough", playAudio);
                }
            } else {
                setIsPlaying(false);
            }
        }
    };

    const handleSpeedTime = (value: string) => {
        setSpeed(value);
    };

    const handleTogglePlayer = () => {
        if (togglePlayer) {
            setTogglePlayer(false);
            audioRef.current?.load();
            setIsPlaying(false);
            setCurrentAudioIndex(0);
            setSpeed("1");
        } else {
            setTogglePlayer(true);
        }
    };

    const handleAudioEnded = () => {
        if (currentAudioIndex < sentenceList.length - 1) {
            const nextAudioIndex = currentAudioIndex + 1;
            setCurrentAudioIndex(nextAudioIndex);
            if (audioRef.current) {
                audioRef.current.src = sentenceList[nextAudioIndex].audioUrl;
                audioRef.current.load();
                const playAudio = () => {
                    audioRef.current!.currentTime =
                        sentenceList[nextAudioIndex].startTime;
                    audioRef.current!.play().catch((error) => {
                        console.error("Error playing audio: ", error);
                    });
                    audioRef.current!.removeEventListener("canplaythrough", playAudio);
                };
                audioRef.current.addEventListener("canplaythrough", playAudio);
            }
        } else {
            setIsPlaying(false);
            setCurrentAudioIndex(0);
        }
    };

    const handleSentenceClick = (startTime: number, audioIndex: number) => {
        if (audioRef.current && togglePlayer) {
            audioRef.current.pause();
            setCurrentAudioIndex(audioIndex);
            audioRef.current.src = sentenceList[audioIndex].audioUrl;
            audioRef.current.currentTime = startTime;
            const playAudio = () => {
                audioRef.current!.play().catch((error) => {
                    console.error("Error playing audio: ", error);
                });
                audioRef.current!.removeEventListener("canplaythrough", playAudio);
            };
            audioRef.current.addEventListener("canplaythrough", playAudio);
            audioRef.current.load();
            if (!isPlaying) {
                setIsPlaying(true);
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

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            currentTimeRef.current = audioRef.current.currentTime;
            const currentSentence = sentenceList[currentAudioIndex];
            if (audioRef.current.currentTime >= currentSentence.endTime) {
                handleAudioEnded();
            }
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
                audio.playbackRate = Number(speed);

                if (isPlaying) {
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
    }, [currentAudioIndex, speed]);

    return {
        handlePlayPause,
        handleTimeUpdate,
        handleSentenceClick,
        handleAudioEnded,
        handleTogglePlayer,
        handleSpeedTime,
        handleNextTrack,
        handlePreviousTrack,
        audioRef,
        isPlaying,
        currentAudioIndex,
        togglePlayer,
        selectedIndex,
        speed,
        setIsPlaying,
        setCurrentAudioIndex,
        setSelectedIndex
    };
}
