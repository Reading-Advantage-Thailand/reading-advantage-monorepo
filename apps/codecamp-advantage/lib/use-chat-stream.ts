"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseChatStreamOptions {
  endpoint?: string;
  locale?: string;
  lessonId?: string;
  moduleId?: string;
  initialMessages?: ChatMessage[];
  onSend?: (message: string) => void | Promise<void>;
  onComplete?: (message: string) => void | Promise<void>;
}

export function useChatStream(options: UseChatStreamOptions = {}) {
  const {
    endpoint,
    locale,
    lessonId,
    moduleId,
    initialMessages,
    onSend,
    onComplete,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const assistantRef = useRef("");

  // Sync initialMessages into state when they arrive after mount,
  // but never overwrite messages the user has already sent.
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length > 0 || !initialMessages || initialMessages.length === 0) {
        return prev;
      }
      return initialMessages;
    });
  }, [initialMessages]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setIsLoading(true);
      assistantRef.current = "";

      // Persist user message
      if (onSend) {
        try {
          await onSend(message);
        } catch {
          // Non-critical: continue even if persistence fails
        }
      }

      try {
        const res = await fetch(endpoint ?? "/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            lessonId,
            moduleId,
            locale,
          }),
          credentials: "include",
        });

        if (!res.ok) throw new Error("Failed to get response");

        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("text/event-stream")) {
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

          assistantRef.current = assistantMessage;

          // Persist assistant message
          if (onComplete && assistantMessage) {
            try {
              await onComplete(assistantMessage);
            } catch {
              // Non-critical
            }
          }
        } else {
          const data = await res.json();
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.response },
          ]);
          assistantRef.current = data.response;

          if (onComplete && data.response) {
            try {
              await onComplete(data.response);
            } catch {
              // Non-critical
            }
          }
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
    [endpoint, locale, lessonId, moduleId, onSend, onComplete]
  );

  return { messages, isLoading, sendMessage };
}
