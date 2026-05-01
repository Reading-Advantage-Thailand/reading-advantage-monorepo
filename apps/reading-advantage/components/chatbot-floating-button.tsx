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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Message {
  text: string;
  sender: "user" | "bot";
}

interface Props {
  article: Article;
}

export default function ChatBotFloatingChatButton({ article }: Props) {
  const t = useScopedI18n("components.chatBot");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const { mcQuestion, saQuestion, laqQuestion } = useQuestionStore();
  const inputLength = userInput.trim().length;
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = useCallback(async () => {
    if (userInput) {
      const newMessage: Message = {
        text: userInput,
        sender: "user",
      };
      setMessages([...messages, newMessage]);
      setLoading(true); // Start loading

      try {
        const questionListMAQ = mcQuestion.results.map((item) => item.question);
        const blacklistedQuestions = [
          ...questionListMAQ,
          saQuestion?.result?.question,
          laqQuestion?.result?.question,
        ];

        const resOpenAi = await fetch(`/api/v1/assistant/chatbot`, {
          method: "POST",
          body: JSON.stringify({
            newMessage,
            articleId: article.id,
            blacklistedQuestions,
          }),
        });

        const data = await resOpenAi.json();

        const response: Message = {
          text: ` : ${data?.text}`,
          sender: "bot",
        };
        setMessages((messages) => [...messages, response]);
      } catch (error) {
        setMessages((msgs) => [
          ...msgs,
          { text: "Error: Could not fetch response.", sender: "bot" },
        ]);
      } finally {
        setLoading(false); // Stop loading
      }

      setUserInput(""); // Clear input after sending
    }
  }, [
    userInput,
    messages,
    mcQuestion.results,
    saQuestion?.result?.question,
    laqQuestion?.result?.question,
    article.id,
  ]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
      <div
        id="onborda-chatbot"
        className="fixed bottom-4 right-4 flex items-center space-x-2 z-50"
      >
        {!isOpen && (
          <Button
            onClick={() => {
              setIsOpen(!isOpen);
              setUserInput("");
              setMessages([]);
            }}
          >
            <MessageSquare />
          </Button>
        )}

        {isOpen && (
          <Card className="fixed bottom-4 right-2 w-80 max-w-[calc(100vw-1rem)] h-[420px] shadow-xl flex flex-col">
            <CardHeader className="flex border-b-[1px] px-4 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bot />
                  <p className="text-sm font-medium leading-none">
                    Talk to our assistant
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="rounded-full p-2"
                  onClick={() => setIsOpen(false)}
                >
                  <X />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 justify-end overflow-y-auto p-4">
              <div className="flex flex-1 flex-col gap-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                      message.sender === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.sender !== "user" ? (
                      <div>
                        <Bot />
                        <span>{message.text}</span>
                      </div>
                    ) : (
                      <span>{message.text}</span>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </CardContent>
            <CardFooter className="p-2 border-t-[1px]">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (inputLength === 0) return;
                  handleSendMessage();
                }}
                className="flex w-full items-center space-x-2"
              >
                <Input
                  placeholder="Type your message..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="flex-1 focus-visible:ring-0"
                  autoComplete="off"
                />
                {loading ? (
                  <Button disabled className="bg-blue-600 disabled:bg-gray-600">
                    <Loader2 className="animate-spin" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    disabled={inputLength === 0 || loading}
                    className="bg-blue-600 disabled:bg-gray-600 w-12"
                  >
                    <Send />
                    <span className="sr-only">Send</span>
                  </Button>
                )}
              </form>
            </CardFooter>
          </Card>
        )}
      </div>
    </>
  );
}
