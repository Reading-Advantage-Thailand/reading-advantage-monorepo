"use client";
import { useCallback, useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useScopedI18n } from "@/locales/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, MessageSquare, Send, Loader2, X } from "lucide-react";
import { Article } from "@/components/models/article-model";
import { useQuestionStore } from "@/store/question-store";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  skipPhase,
  onCompleteChange,
}: Props) {
  const t = useScopedI18n("components.chatBot");
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const { mcQuestion, saQuestion, laqQuestion } = useQuestionStore();
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
        const res = await fetch(`/api/v1/assistant/chatbot-question`, {
          method: "POST",
          body: JSON.stringify({
            messages: updatedMessages,
            title: article.title,
            passage: article.passage,
            summary: article.summary,
            image_description: article.image_description,
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
          { text: t("errorFetchResponse"), sender: "bot" },
        ]);
      } finally {
        setLoading(false);
      }

      setUserInput(""); // clear input
    }
  }, [userInput, messages, article, mcQuestion, saQuestion, laqQuestion]);

  useEffect(() => {
    const initBotMessage = async () => {
      setLoading(true);
      try {
        const questionListMAQ = mcQuestion.results.map((item) => item.question);
        const blacklistedQuestions = [
          ...questionListMAQ,
          saQuestion?.result?.question,
          laqQuestion?.result?.question,
        ];

        const res = await fetch(`/api/v1/assistant/chatbot-question`, {
          method: "POST",
          body: JSON.stringify({
            messages: [],
            title: article.title,
            passage: article.passage,
            summary: article.summary,
            image_description: article.image_description,
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
        setMessages([
          { text: t("errorFetchInitialQuestion"), sender: "bot" },
        ]);
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
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl z-10">
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 h-10 w-10" />
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Loading conversation...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-xl border border-indigo-200/50 dark:border-indigo-700/50">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">AI Reading Assistant</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {session?.user?.display_name || session?.user?.name ?
                      `Ready to help ${(session.user.display_name || session.user.name || "").split(' ')[0]} with questions` :
                      "Ready to help with your questions"
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Online</span>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="bg-gradient-to-b from-gray-gray-300 to-white dark:from-gray-800/50 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="h-80 sm:h-96 overflow-y-auto p-3 sm:p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {messages.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
                    <MessageSquare className="h-12 w-12 text-gray-400" />
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">
                        {session?.user?.display_name || session?.user?.name ? 
                          `สวัสดี ${session.user.display_name || session.user.name}!` : 
                          "Start the conversation!"
                        }
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Ask me anything about the article.</p>
                    </div>
                  </div>
                )}
                
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] animate-fade-in-up",
                      message.sender === "user" ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    {message.sender === "bot" && (
                      <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                      </div>
                    )}
                    
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-sm transition-all duration-200 hover:shadow-md",
                        message.sender === "user"
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-md"
                          : "bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-bl-md"
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                    </div>
                    
                    {message.sender === "user" && (
                      <Avatar className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8">
                        <AvatarImage 
                          src={session?.user?.picture || session?.user?.image || ""} 
                          alt={session?.user?.display_name || session?.user?.name || "User"} 
                          referrerPolicy="no-referrer"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-600 text-white text-xs sm:text-sm font-semibold">
                          {(session?.user?.display_name || session?.user?.name || "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                
                {loading && (
                  <div className="flex gap-2 sm:gap-3 animate-fade-in-up">
                    <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </div>
                    <div className="bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl rounded-bl-md px-3 py-2 sm:px-4 sm:py-3 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
              
              {/* Input Area */}
              <div className="border-t border-gray-200 dark:border-gray-600 bg-gray-200 dark:bg-gray-800 p-3 sm:p-4">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (inputLength === 0) return;
                    handleSendMessage();
                  }}
                  className="flex items-end space-x-2 sm:space-x-3"
                >
                  <div className="flex-1 relative">
                    <Input
                      placeholder={
                        session?.user?.display_name || session?.user?.name ?
                        `${session.user.display_name || session.user.name}, ask about the article...` :
                        "Type your question about the article..."
                      }
                      value={userInput}
                      onChange={(e) => {
                        if (e.target.value.length <= 500) {
                          setUserInput(e.target.value);
                        }
                      }}
                      className="resize-none border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 pr-16 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all duration-200 bg-slate-300 dark:bg-gray-700"
                      autoComplete="off"
                      disabled={loading}
                      maxLength={500}
                    />
                    <div className={cn(
                      "absolute right-3 top-1/2 transform -translate-y-1/2 text-xs transition-colors duration-200",
                      userInput.length > 450 ? "text-orange-500 dark:text-orange-400" : "text-gray-400 dark:text-gray-500"
                    )}>
                      {userInput.length}/500
                    </div>
                  </div>
                  
                  <div className="flex space-x-1 sm:space-x-2">
                    {loading ? (
                      <Button
                        disabled
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl px-4 py-3 transition-all duration-200 shadow-lg"
                      >
                        <Loader2 className="animate-spin h-5 w-5" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={inputLength === 0 || loading}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl px-4 py-3 transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none"
                      >
                        <Send className="h-5 w-5" />
                        <span className="sr-only">Send</span>
                      </Button>
                    )}
                    
                    <Button
                      type="button"
                      onClick={() => {
                        onCompleteChange(true);
                        skipPhase();
                      }}
                      variant="outline"
                      className="rounded-xl px-3 py-3 sm:px-4 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200"
                    >
                      <span className="hidden sm:inline">Skip</span>
                      <X className="h-4 w-4 sm:hidden" />
                    </Button>
                  </div>
                </form>
                
                {/* Usage Tips */}
                <div className="mt-3 flex flex-wrap gap-1 sm:gap-2">
                  {[
                    "Ask about vocabulary",
                    "Discuss the main theme",
                    "Clarify confusing parts"
                  ].map((tip, index) => (
                    <button
                      key={index}
                      onClick={() => setUserInput(tip + "?")}
                      className="text-xs px-2 py-1 sm:px-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors duration-200"
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
