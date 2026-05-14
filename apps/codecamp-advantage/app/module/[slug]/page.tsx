"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@reading-advantage/ui";
import { BookOpen, CheckCircle, Circle, ArrowLeft } from "lucide-react";

export default function ModulePage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: moduleData, isLoading } = trpc.codecamp.moduleBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  if (isLoading) {
    return <div className="container py-12">Loading...</div>;
  }

  if (!moduleData) {
    return (
      <div className="container py-12">
        <h1 className="text-2xl font-bold">Module not found</h1>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/">← Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <Button variant="ghost" className="mb-6" asChild>
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{moduleData.title}</h1>
        <p className="mt-2 text-muted-foreground">{moduleData.description}</p>
        <div className="mt-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${moduleData.progress}%` }}
          />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {moduleData.completedLessons} / {moduleData.lessonCount} lessons completed
        </p>
      </div>

      <div className="grid gap-4">
        {moduleData.lessons && moduleData.lessons.length > 0 ? (
          moduleData.lessons.map((lesson) => (
            <LessonItem
              key={lesson.id}
              title={lesson.title}
              description={lesson.description}
              status={lesson.userStatus ?? "not_started"}
              href={`/lesson/${lesson.id}`}
            />
          ))
        ) : (
          <p className="text-muted-foreground">No lessons available for this module yet.</p>
        )}
      </div>
    </div>
  );
}

function LessonItem({
  title,
  description,
  status,
  href,
}: {
  title: string;
  description: string;
  status: "not_started" | "in_progress" | "completed";
  href: string;
}) {
  const icons = {
    not_started: <Circle className="h-5 w-5 text-muted-foreground" />,
    in_progress: <BookOpen className="h-5 w-5 text-primary" />,
    completed: <CheckCircle className="h-5 w-5 text-green-500" />,
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
    >
      {icons[status]}
      <div className="flex-1">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" size="sm">
        {status === "completed" ? "Review" : "Start"}
      </Button>
    </Link>
  );
}
