"use client";
import { useCallback, useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, MessageSquare, Send, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const { data: session } = useSession();
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
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-gray-200 backdrop-blur-sm dark:bg-gray-900/90">
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("loading.conversation")}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chat Header */}
            <div className="flex items-center justify-between rounded-xl border border-indigo-200/50 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-4 dark:border-indigo-700/50 dark:from-indigo-500/20 dark:to-purple-500/20">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-white bg-green-500 dark:border-gray-800"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t("title")}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {session?.user?.name
                      ? t("header.readyWithName", {
                          name: (session.user.name || "").split(" ")[0],
                        })
                      : t("header.ready")}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                <span>{t("status.online")}</span>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="from-gray-gray-300 overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-b to-white dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900">
              <div className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent h-80 space-y-4 overflow-y-auto p-3 sm:h-96 sm:p-4">
                {messages.length === 0 && !loading && (
                  <div className="flex h-full flex-col items-center justify-center space-y-4 text-center opacity-60">
                    <MessageSquare className="h-12 w-12 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-500 dark:text-gray-400">
                        {session?.user?.name
                          ? t("empty.helloName", { name: session.user.name })
                          : t("empty.start")}
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
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
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 sm:h-8 sm:w-8">
                        <Bot className="h-3 w-3 text-white sm:h-4 sm:w-4" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 shadow-sm transition-all duration-200 hover:shadow-md sm:px-4 sm:py-3",
                        message.sender === "user"
                          ? "rounded-br-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                          : "rounded-bl-md border border-gray-200 bg-gray-200 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.text}
                      </p>
                    </div>

                    {message.sender === "user" && (
                      <Avatar className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8">
                        <AvatarImage
                          src={session?.user?.image || ""}
                          alt={session?.user?.name || "User"}
                          referrerPolicy="no-referrer"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-600 text-xs font-semibold text-white sm:text-sm">
                          {(session?.user?.name || "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="animate-fade-in-up flex gap-2 sm:gap-3">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 sm:h-8 sm:w-8">
                      <Bot className="h-3 w-3 text-white sm:h-4 sm:w-4" />
                    </div>
                    <div className="rounded-2xl rounded-bl-md border border-gray-200 bg-gray-200 px-3 py-2 shadow-sm sm:px-4 sm:py-3 dark:border-gray-600 dark:bg-gray-800">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div
                            className="h-2 w-2 animate-bounce rounded-full bg-indigo-500"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="h-2 w-2 animate-bounce rounded-full bg-indigo-500"
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className="h-2 w-2 animate-bounce rounded-full bg-indigo-500"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {t("thinking")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 bg-gray-200 p-3 sm:p-4 dark:border-gray-600 dark:bg-gray-800">
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
                        session?.user?.name
                          ? t("input.placeholderWithName", {
                              name: session.user.name,
                            })
                          : t("input.placeholder")
                      }
                      value={userInput}
                      onChange={(e) => {
                        if (e.target.value.length <= 500) {
                          setUserInput(e.target.value);
                        }
                      }}
                      className="resize-none rounded-xl border-2 border-gray-200 bg-slate-300 px-4 py-3 pr-16 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:focus:border-indigo-400 dark:focus:ring-indigo-800"
                      autoComplete="off"
                      disabled={loading}
                      maxLength={500}
                    />
                    <div
                      className={cn(
                        "absolute top-1/2 right-3 -translate-y-1/2 transform text-xs transition-colors duration-200",
                        userInput.length > 450
                          ? "text-orange-500 dark:text-orange-400"
                          : "text-gray-400 dark:text-gray-500",
                      )}
                    >
                      {userInput.length}/500
                    </div>
                  </div>

                  <div className="flex space-x-1 sm:space-x-2">
                    {loading ? (
                      <Button
                        disabled
                        className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-white shadow-lg transition-all duration-200 hover:from-indigo-600 hover:to-purple-700"
                      >
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={inputLength === 0 || loading}
                        className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-white shadow-lg transition-all duration-200 hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none"
                      >
                        <Send className="h-5 w-5" />
                        <span className="sr-only">{t("buttons.send")}</span>
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-2 border-gray-300 px-3 py-3 transition-all duration-200 hover:border-gray-400 sm:px-4 dark:border-gray-600 dark:hover:border-gray-500"
                    >
                      <span className="hidden sm:inline">
                        {t("buttons.skip")}
                      </span>
                      <X className="h-4 w-4 sm:hidden" />
                    </Button>
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
                      className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700 transition-colors duration-200 hover:bg-indigo-100 sm:px-3 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
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
