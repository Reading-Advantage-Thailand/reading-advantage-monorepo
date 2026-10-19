"use client";
import { useCallback, useState, useRef, useEffect } from "react";
import Image from "next/image";
import { RpgButton } from "@/components/rpg/chrome";
import { Input } from "@/components/ui/input";
import { Skeleton, Avatar, AvatarFallback, AvatarImage } from "@reading-advantage/ui";
import { Bot, MessageSquare, Send, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@reading-advantage/auth-client";
import { Article } from "@/types";
import { useTranslations } from "next-intl";

interface Message {
  text: string;
  sender: "user" | "bot";
}

interface Props {
  article: Article;
  skipPhase: () => void;
  onCompleteChange: (complete: boolean) => void;
}

export default function LessonLanguageQuestion({
  article,
}: {
  article: Article;
}) {
  const t = useTranslations("LessonLanguageQuestion");
  const { user } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const inputLength = userInput.trim().length;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [loadingPage, setLoadingPage] = useState(false);

  const handleSendMessage = useCallback(async () => {
    if (userInput) {
      const newMessage: Message = { text: userInput, sender: "user" };
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      setLoading(true);

      try {
        const res = await fetch(`/api/assistant/lesson-chatbot`, {
          method: "POST",
          body: JSON.stringify({
            messages: updatedMessages,
            title: article.title,
            passage: article.passage,
            summary: article.summary,
            image_description: article.imageDescription,
            isInitial: false,
          }),
        });

        const data = await res.json();

        const response: Message = {
          text: data?.text,
          sender: "bot",
        };
        setMessages((msgs) => [...msgs, response]);
      } catch (error) {
        setMessages((msgs) => [
          ...msgs,
          { text: t("error.fetchResponse"), sender: "bot" },
        ]);
      } finally {
        setLoading(false);
      }

      setUserInput(""); // clear input
    }
  }, [userInput, messages, article]);

  useEffect(() => {
    const initBotMessage = async () => {
      setLoading(true);
      try {
        const questionListMAQ =
          article.multipleChoiceQuestions?.map((item) => item.question) || [];
        const questionListSAQ =
          article.shortAnswerQuestions?.map((item) => item.question) || [];
        const questionListLAQ =
          article.longAnswerQuestions?.map((item) => item.question) || [];
        const blacklistedQuestions = [
          ...questionListMAQ,
          ...questionListSAQ,
          ...questionListLAQ,
        ];

        const res = await fetch(`/api/assistant/lesson-chatbot`, {
          method: "POST",
          body: JSON.stringify({
            messages: [],
            title: article.title,
            passage: article.passage,
            summary: article.summary,
            image_description: article.imageDescription,
            blacklistedQuestions,
            isInitial: true,
          }),
        });

        const data = await res.json();
        const initialMessage: Message = {
          text: `${data?.text}`,
          sender: "bot",
        };
        setMessages([initialMessage]);
      } catch (error) {
        setMessages([{ text: t("error.fetchInitial"), sender: "bot" }]);
      } finally {
        setLoading(false);
      }
    };

    initBotMessage();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  return (
    <>
      <div className="relative">
        {loadingPage ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[var(--cq-parchment)]">
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-[var(--cq-wood-dark)]" />
              <p className="cq-muted text-sm font-medium">
                {t("loading.conversation")}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chat Header */}
            <div className="lf-well flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="lf-medal h-10 w-10">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-[var(--cq-parchment)] bg-[#2f6b35]"></div>
                </div>
                <div>
                  <h3 className="font-semibold">
                    {t("title")}
                  </h3>
                  <p className="cq-muted text-sm">
                    {user?.name
                      ? t("header.readyWithName", {
                          name: (user?.name || "").split(" ")[0],
                        })
                      : t("header.ready")}
                  </p>
                </div>
              </div>
              <div className="lf-text-good flex items-center space-x-2 text-xs font-semibold">
                <div className="h-2 w-2 animate-pulse rounded-full bg-[#2f6b35]"></div>
                <span>{t("status.online")}</span>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="lf-well overflow-hidden">
              <div className="scrollbar-thin scrollbar-track-transparent h-80 space-y-4 overflow-y-auto p-3 sm:h-96 sm:p-4">
                {messages.length === 0 && !loading && (
                  <div className="flex h-full flex-col items-center justify-center space-y-4 text-center opacity-60">
                    <MessageSquare className="cq-muted h-12 w-12" />
                    <div>
                      <p className="cq-muted font-medium">
                        {user?.name
                          ? t("empty.helloName", { name: user?.name })
                          : t("empty.start")}
                      </p>
                      <p className="cq-muted text-sm">
                        {t("empty.ask")}
                      </p>
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "animate-fade-in-up flex max-w-[90%] gap-2 sm:max-w-[85%] sm:gap-3",
                      message.sender === "user"
                        ? "ml-auto flex-row-reverse"
                        : "",
                    )}
                  >
                    {message.sender === "bot" && (
                      <div className="lf-medal h-6 w-6 flex-shrink-0 border-2 sm:h-8 sm:w-8">
                        <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 shadow-sm transition-all duration-200 hover:shadow-md sm:px-4 sm:py-3",
                        message.sender === "user"
                          ? "rounded-br-md border-2 border-[var(--cq-wood-dark)] bg-[var(--cq-wood)] text-[#fff4dc]"
                          : "rounded-bl-md border-2 border-[var(--cq-parchment-edge)] bg-[#fffaf0] text-[var(--cq-ink)]",
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.text}
                      </p>
                    </div>

                    {message.sender === "user" && (
                      <Avatar className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8">
                        <AvatarImage
                          src={"" }
                          alt={user?.name || "User"}
                          referrerPolicy="no-referrer"
                        />
                        <AvatarFallback className="border-2 border-[var(--cq-wood-dark)] bg-[var(--cq-wood)] text-xs font-semibold text-[#fff4dc] sm:text-sm">
                          {(user?.name || "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="animate-fade-in-up flex gap-2 sm:gap-3">
                    <div className="lf-medal h-6 w-6 flex-shrink-0 border-2 sm:h-8 sm:w-8">
                      <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>
                    <div className="rounded-2xl rounded-bl-md border-2 border-[var(--cq-parchment-edge)] bg-[#fffaf0] px-3 py-2 shadow-sm sm:px-4 sm:py-3">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div
                            className="h-2 w-2 animate-bounce rounded-full bg-[var(--cq-wood)]"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="h-2 w-2 animate-bounce rounded-full bg-[var(--cq-wood)]"
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className="h-2 w-2 animate-bounce rounded-full bg-[var(--cq-wood)]"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                        <span className="cq-muted text-xs">
                          {t("thinking")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>

              {/* Input Area */}
              <div className="border-t-2 border-[var(--cq-parchment-edge)] bg-[rgba(107,84,56,0.08)] p-3 sm:p-4">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (inputLength === 0) return;
                    handleSendMessage();
                  }}
                  className="flex items-end space-x-2 sm:space-x-3"
                >
                  <div className="relative flex-1">
                    <Input
                      placeholder={
                        user?.name
                          ? t("input.placeholderWithName", {
                              name: user?.name,
                            })
                          : t("input.placeholder")
                      }
                      value={userInput}
                      onChange={(e) => {
                        if (e.target.value.length <= 500) {
                          setUserInput(e.target.value);
                        }
                      }}
                      className="min-h-12 resize-none rounded-xl border-2 border-[var(--cq-parchment-edge)] bg-[#fffaf0] px-4 py-3 pr-16 text-[var(--cq-ink)] transition-all duration-200 placeholder:text-[var(--cq-ink-soft)] focus:border-[var(--cq-gold-dark)] focus:ring-2 focus:ring-[rgba(232,181,52,0.45)] dark:bg-[#fffaf0]"
                      autoComplete="off"
                      disabled={loading}
                      maxLength={500}
                    />
                    <div
                      className={cn(
                        "absolute top-1/2 right-3 -translate-y-1/2 transform text-xs transition-colors duration-200",
                        userInput.length > 450
                          ? "lf-text-bad font-semibold"
                          : "cq-muted",
                      )}
                    >
                      {userInput.length}/500
                    </div>
                  </div>

                  <div className="flex space-x-1 sm:space-x-2">
                    {loading ? (
                      <RpgButton
                        disabled
                        tone="gold"
                        className="px-4"
                        aria-label={t("loading.conversation")}
                      >
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </RpgButton>
                    ) : (
                      <RpgButton
                        type="submit"
                        tone="gold"
                        disabled={inputLength === 0 || loading}
                        className="px-4"
                      >
                        <Send className="h-5 w-5" />
                        <span className="sr-only">{t("buttons.send")}</span>
                      </RpgButton>
                    )}

                    <RpgButton
                      tone="iron"
                      className="px-3 sm:px-4"
                      aria-label={t("buttons.skip")}
                    >
                      <span className="hidden sm:inline">
                        {t("buttons.skip")}
                      </span>
                      <X className="h-4 w-4 sm:hidden" />
                    </RpgButton>
                  </div>
                </form>

                {/* Usage Tips */}
                <div className="mt-3 flex flex-wrap gap-1 sm:gap-2">
                  {[
                    t("tips.askVocabulary"),
                    t("tips.discussTheme"),
                    t("tips.clarifyParts"),
                  ].map((tip, index) => (
                    <button
                      key={index}
                      onClick={() => setUserInput(tip + "?")}
                      className="lg-chip min-h-9 px-3 py-1 text-xs transition-colors duration-200 hover:border-[var(--cq-wood)] hover:bg-[rgba(232,181,52,0.28)]"
                      disabled={loading}
                    >
                      {tip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
