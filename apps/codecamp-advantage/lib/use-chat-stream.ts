"use client";

import { useState, useCallback } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseChatStreamOptions {
  endpoint?: string;
  lessonId?: string;
  moduleId?: string;
}

export function useChatStream(options: UseChatStreamOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setIsLoading(true);

      try {
        const res = await fetch(options.endpoint ?? "/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            lessonId: options.lessonId,
            moduleId: options.moduleId,
          }),
          credentials: "include",
        });

        if (!res.ok) throw new Error("Failed to get response");

        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("text/event-stream") || res.body?.getReader) {
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          let assistantMessage = "";

          setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

          while (reader) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("0:")) {
                try {
                  const text = JSON.parse(line.slice(2));
                  assistantMessage += text;
                  setMessages((prev) => {
                    const next = [...prev];
                    next[next.length - 1] = {
                      role: "assistant",
                      content: assistantMessage,
                    };
                    return next;
                  });
                } catch {
                  // ignore parse errors
                }
              }
            }
          }
        } else {
          const data = await res.json();
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.response },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I'm having trouble responding right now.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [options.endpoint, options.lessonId, options.moduleId]
  );

  return { messages, isLoading, sendMessage };
}
