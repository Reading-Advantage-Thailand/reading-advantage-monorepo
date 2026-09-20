"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@reading-advantage/ui";
import { Input } from "@reading-advantage/ui";
import { Button } from "@reading-advantage/ui";
import { MessageCircle, Send, Loader2 } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

/**
 * Renders the sales chat tutor.
 * @param props Component options.
 * @param props.lessonId Optional lesson identifier for the chat request.
 * @param props.moduleId Optional module identifier for the chat request.
 * @returns The chat tutor interface.
 */
export function ChatTutor({
  lessonId,
  moduleId,
}: {
  lessonId?: string;
  moduleId?: string;
}) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function send() {
    if (!input.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          lessonId,
          moduleId,
          locale,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error("chat failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistant += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: assistant };
          return copy;
        });
      }
    } catch {
      if (controller.signal.aborted) return;
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "[Error: chat unavailable]" };
        return copy;
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setStreaming(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4" /> {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 max-h-96 space-y-3 overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">Ask anything about sales technique.</p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 text-sm ${
                m.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-8"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content || (streaming ? "..." : "")}</p>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={t("placeholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={streaming}
          />
          <Button
            aria-label={t("send")}
            onClick={send}
            disabled={streaming || !input.trim()}
            size="icon"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
