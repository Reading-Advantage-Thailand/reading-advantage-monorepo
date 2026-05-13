"use client";

import { useParams } from "next/navigation";
// import { trpc } from "@/lib/trpc";
import { Button } from "@reading-advantage/ui";
import { ArrowLeft, Send } from "lucide-react";
import { useState } from "react";

export default function LessonPage() {
  const params = useParams();
  const lessonId = params.id as string;

  // Note: This is a placeholder page. Real lesson IDs would be UUIDs from the DB.
  // For now we show a generic lesson layout.

  return (
    <div className="container py-12">
      <Button variant="ghost" className="mb-6" asChild>
        <a href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </a>
      </Button>

      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">Lesson</h1>
        <p className="mt-2 text-muted-foreground">
          Lesson ID: {lessonId}
        </p>

        <div className="mt-8 rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Content</h2>
          <p className="mt-4 text-muted-foreground">
            This is a placeholder lesson page. The full implementation would
            render lesson content from the database, including theory sections,
            code examples, exercises, and quizzes.
          </p>
        </div>

        <div className="mt-8 rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Chat with AI Tutor</h2>
          <ChatTutor lessonId={lessonId} />
        </div>
      </div>
    </div>
  );
}

function ChatTutor({ lessonId }: { lessonId: string }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message;
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, lessonId }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
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
  };

  return (
    <div className="mt-4">
      <div className="h-64 overflow-y-auto rounded-lg border bg-muted/50 p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ask a question about this lesson...
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`mb-3 flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-secondary px-4 py-2 text-sm">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask about this lesson..."
          className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm"
        />
        <Button size="sm" onClick={sendMessage} disabled={isLoading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
