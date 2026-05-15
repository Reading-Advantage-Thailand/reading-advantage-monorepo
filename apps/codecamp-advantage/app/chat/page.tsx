"use client";

import { Button } from "@reading-advantage/ui";
import { Send, Plus } from "lucide-react";
import { useState } from "react";
import { useChatStream } from "@/lib/use-chat-stream";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage } = useChatStream();

  return (
    <div className="container flex h-[calc(100vh-4rem)] flex-col py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Tutor</h1>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <Plus className="mr-2 h-4 w-4" />
          New Conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border bg-muted/50 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">
              Ask me anything about Next.js, tRPC, Drizzle, or monorepo patterns.
            </p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`mb-4 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-secondary px-4 py-2 text-sm">Thinking...</div>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isLoading && sendMessage(input)}
          placeholder="Ask about Next.js, tRPC, Drizzle..."
          aria-label="Chat message"
          className="flex-1 rounded-lg border bg-background px-4 py-3 text-sm"
        />
        <Button onClick={() => sendMessage(input)} disabled={isLoading}>
          <Send className="mr-2 h-4 w-4" />
          Send
        </Button>
      </div>
    </div>
  );
}
