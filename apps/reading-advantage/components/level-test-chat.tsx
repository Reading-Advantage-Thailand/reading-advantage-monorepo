"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "./ui/use-toast";
import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import { useScopedI18n, useCurrentLocale } from "@/locales/client";
import { levelCalculation } from "@/lib/utils";
import { ActivityStatus, ActivityType } from "./models/user-activity-log-model";
import {
  Send,
  Loader2,
  MessageCircle,
  Trophy,
  RefreshCw,
  SkipForward,
  AlertTriangle,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useSession } from "next-auth/react";

type Props = {
  userId: string;
};

type Message = {
  text: string;
  sender: "user" | "bot";
};

type Assessment = {
  level: string;
  sublevel?: string;
  xp: number;
  explanation: string;
  strengths: string[];
  improvements: string[];
  nextSteps: string;
};

const SKIP_TIMEOUT_MS = 15000; // 15 seconds before showing skip button
const MAX_SKIPS_BEFORE_WARNING = 3; // Warn user after 3 skips
const MAX_SKIPS_BEFORE_END = 5; // End test early after 5 skips

// Convert CEFR level to system XP
// Based on levelCalculation ranges in lib/utils.ts
const cefrToSystemXp = (level: string, sublevel?: string): number => {
  const cefrXpMap: Record<string, number> = {
    "A1-": 0,
    A1: 5000,
    "A1+": 11000,
    "A2-": 18000,
    A2: 26000,
    "A2+": 35000,
    "B1-": 45000,
    B1: 56000,
    "B1+": 68000,
    "B2-": 81000,
    B2: 95000,
    "B2+": 110000,
    "C1-": 126000,
    C1: 143000,
    "C1+": 161000,
    "C2-": 180000,
    C2: 200000,
    "C2+": 221000,
  };

  // Construct CEFR key (e.g., "B1+", "A2-", "B2")
  const cefrKey = `${level}${sublevel || ""}`;

  // Try exact match first
  if (cefrXpMap[cefrKey]) {
    return cefrXpMap[cefrKey];
  }

  // Try level without sublevel
  if (cefrXpMap[level]) {
    return cefrXpMap[level];
  }

  // Default to A1-
  return 0;
};

export default function LevelTestChat({ userId }: Props) {
  const t = useScopedI18n("components.levelTestChat");
  const router = useRouter();
  const currentLocale = useCurrentLocale();
  const { update } = useSession();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [testFinished, setTestFinished] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start/reset skip timer when messages change (bot sent new message)
  useEffect(() => {
    // Clear existing timer
    if (skipTimerRef.current) {
      clearTimeout(skipTimerRef.current);
      skipTimerRef.current = null;
    }
    setShowSkipButton(false);

    // Only start timer if last message is from bot and test is not finished
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.sender === "bot" &&
      !testFinished &&
      isInitialized &&
      !isLoading
    ) {
      skipTimerRef.current = setTimeout(() => {
        setShowSkipButton(true);
      }, SKIP_TIMEOUT_MS);
    }

    return () => {
      if (skipTimerRef.current) {
        clearTimeout(skipTimerRef.current);
      }
    };
  }, [messages, testFinished, isInitialized, isLoading]);

  // Initialize conversation
  useEffect(() => {
    if (!isInitialized) {
      initializeChat();
    }
  }, [isInitialized]);

  const initializeChat = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/level-test/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [],
          isInitial: true,
          preferredLanguage: currentLocale,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to initialize chat");
      }

      const data = await response.json();

      setMessages([
        {
          text: data.text,
          sender: "bot",
        },
      ]);
      setIsInitialized(true);
    } catch (error) {
      console.error("Error initializing chat:", error);
      toast({
        title: t("toast.errorTitle"),
        description: t("toast.initError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      text: inputValue.trim(),
      sender: "user",
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/level-test/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
          isInitial: false,
          preferredLanguage: currentLocale,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      setMessages([
        ...newMessages,
        {
          text: data.text,
          sender: "bot",
        },
      ]);

      // Check if assessment is complete
      if (data.assessment) {
        setAssessment(data.assessment);
        setTestFinished(true);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: t("toast.errorTitle"),
        description: t("toast.sendError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSkipQuestion = async () => {
    const newSkipCount = skipCount + 1;
    setSkipCount(newSkipCount);
    setShowSkipButton(false);

    // Check if user has skipped too many times
    if (newSkipCount >= MAX_SKIPS_BEFORE_END) {
      // End test early with partial assessment
      toast({
        title: t("toast.tooManySkips"),
        description: t("toast.endingTestEarly"),
        variant: "destructive",
      });
      await requestAssessmentDueToSkips(newSkipCount);
      return;
    }

    // Show warning if approaching limit
    if (newSkipCount >= MAX_SKIPS_BEFORE_WARNING) {
      setShowSkipWarning(true);
      setTimeout(() => setShowSkipWarning(false), 5000);
    }

    // Send skip message to bot (display message vs API message are different)
    const displayMessage: Message = {
      text: t("skippedMessage"),
      sender: "user",
    };

    // For API, include skip count for assessment purposes
    const apiMessage: Message = {
      text: `[User skipped this question - skip count: ${newSkipCount}]`,
      sender: "user",
    };

    const displayMessages = [...messages, displayMessage];
    const apiMessages = [...messages, apiMessage];
    setMessages(displayMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/level-test/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          isInitial: false,
          preferredLanguage: currentLocale,
          skipCount: newSkipCount,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to skip question");
      }

      const data = await response.json();

      setMessages([
        ...displayMessages,
        {
          text: data.text,
          sender: "bot",
        },
      ]);

      if (data.assessment) {
        setAssessment(data.assessment);
        setTestFinished(true);
      }
    } catch (error) {
      console.error("Error skipping question:", error);
      toast({
        title: t("toast.errorTitle"),
        description: t("toast.skipError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const requestAssessmentDueToSkips = async (currentSkipCount: number) => {
    const assessmentMessage: Message = {
      text: `[User has skipped ${currentSkipCount} questions. Please provide assessment based on available responses.]`,
      sender: "user",
    };

    const newMessages = [...messages, assessmentMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/level-test/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
          isInitial: false,
          preferredLanguage: currentLocale,
          forceAssessment: true,
          skipCount: currentSkipCount,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get assessment");
      }

      const data = await response.json();

      setMessages([
        ...newMessages,
        {
          text: data.text,
          sender: "bot",
        },
      ]);

      if (data.assessment) {
        setAssessment(data.assessment);
        setTestFinished(true);
      }
    } catch (error) {
      console.error("Error getting assessment due to skips:", error);
      toast({
        title: t("toast.errorTitle"),
        description: t("toast.assessmentError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveAssessmentToDb = async (
    assessmentData: Assessment,
  ): Promise<boolean> => {
    setIsSaving(true);
    try {
      // Convert AI's CEFR level to system XP
      const systemXp = cefrToSystemXp(
        assessmentData.level,
        assessmentData.sublevel,
      );
      const calculatedLevel = levelCalculation(systemXp);

      const updateResult = await fetch(`/api/v1/users/${userId}/activitylog`, {
        method: "POST",
        body: JSON.stringify({
          activityType: ActivityType.LevelTest,
          activityStatus: ActivityStatus.Completed,
          xpEarned: systemXp,
          isInitialLevelTest: true,
          details: {
            assessmentMethod: "chat",
            cefrLevel: assessmentData.level,
            sublevel: assessmentData.sublevel,
            aiXp: assessmentData.xp,
            systemXp: systemXp,
            messageCount: messages.length,
            strengths: assessmentData.strengths,
            improvements: assessmentData.improvements,
            cefr_level: calculatedLevel.cefrLevel,
          },
        }),
      });

      if (updateResult.status === 200) {
        setIsSaved(true);
        return true;
      } else {
        console.error("Update Failed");
        toast({
          title: t("toast.errorTitle"),
          description: t("toast.errorDescription"),
          variant: "destructive",
          className: "bg-red-500",
        });
        return false;
      }
    } catch (error) {
      console.error(error);
      toast({
        title: t("toast.errorTitle"),
        description: t("toast.errorDescription"),
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save when assessment is available
  useEffect(() => {
    if (assessment && !isSaved && !isSaving) {
      saveAssessmentToDb(assessment);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment]);

  const handleContinue = async () => {
    if (isSaved) {
      toast({
        title: t("toast.successUpdate"),
        description: t("toast.successUpdateDescription"),
      });
      // Force session refresh before navigation to ensure middleware sees new level
      await update();
      router.push("/student/read");
      router.refresh();
      return;
    }

    if (assessment) {
      const success = await saveAssessmentToDb(assessment);
      if (success) {
        toast({
          title: t("toast.successUpdate"),
          description: t("toast.successUpdateDescription"),
        });
        // Force session refresh before navigation to ensure middleware sees new level
        await update();
        router.push("/student/read");
        router.refresh();
      }
    }
  };

  // Display completed test result
  if (testFinished && assessment) {
    const systemXp = cefrToSystemXp(assessment.level, assessment.sublevel);
    const calculatedLevel = levelCalculation(systemXp);

    return (
      <div>
        <Confetti width={window.innerWidth} height={window.innerHeight} />
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="font-bold text-2xl flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              {t("congratulations")}
            </CardTitle>
            <CardDescription>{t("congratulationsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 text-center">
              <p className="text-lg font-medium mb-1">{t("yourCefrLevel")}</p>
              <p className="text-5xl font-bold mb-2">
                {assessment.level}
                {assessment.sublevel || ""}
              </p>
              <p className="text-lg">{t("yourScore", { xp: systemXp })}</p>
              <p className="text-sm mt-1">
                RA Level: {calculatedLevel.raLevel}
              </p>
            </div>

            <Button
              size="lg"
              className="w-full mt-4"
              onClick={handleContinue}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("saving")}
                </>
              ) : isSaved ? (
                t("getStartedButton")
              ) : (
                "Retry Save & Continue"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Chat interface
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-bold text-2xl flex items-center gap-2">
          <MessageCircle className="h-6 w-6" />
          {t("heading")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chat Messages */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                } animate-in fade-in slide-in-from-bottom-2 duration-200`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Skip Warning */}
        {showSkipWarning && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {t("skipWarning", {
                remaining: MAX_SKIPS_BEFORE_END - skipCount,
              })}
            </p>
          </div>
        )}

        {/* Skip Button - appears after 15 seconds of inactivity */}
        {showSkipButton && !isLoading && (
          <div className="bg-muted/50 border border-dashed rounded-lg p-4 text-center space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-sm text-muted-foreground">{t("skipPrompt")}</p>
            <Button
              variant="secondary"
              onClick={handleSkipQuestion}
              className="gap-2"
            >
              <SkipForward className="h-4 w-4" />
              {t("skipButton")}
              {skipCount > 0 && (
                <span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded">
                  {skipCount}/{MAX_SKIPS_BEFORE_END}
                </span>
              )}
            </Button>
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("inputPlaceholder")}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            onClick={() => {
              setMessages([]);
              setIsInitialized(false);
            }}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("restartButton")}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">{t("hint")}</p>
      </CardContent>
    </Card>
  );
}
