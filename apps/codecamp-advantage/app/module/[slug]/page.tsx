"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@reading-advantage/ui";
import { BookOpen, CheckCircle, Circle, ArrowLeft } from "lucide-react";

export default function ModulePage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: modules, isLoading: modulesLoading } = trpc.codecamp.modules.useQuery();
  const moduleData = modules?.find((m) => m.slug === slug);

  const { data: lessons, isLoading: lessonsLoading } = trpc.codecamp.lessons.useQuery(
    { moduleId: moduleData?.id ?? "" },
    { enabled: !!moduleData?.id }
  );

  const isLoading = modulesLoading || lessonsLoading;

  if (isLoading) {
    return <div className="container py-12">Loading...</div>;
  }

  if (!moduleData) {
    return (
      <div className="container py-12">
        <h1 className="text-2xl font-bold">Module not found</h1>
        <Button variant="outline" className="mt-4" asChild>
          <a href="/">← Back to Dashboard</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <Button variant="ghost" className="mb-6" asChild>
        <a href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </a>
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
        {lessons && lessons.length > 0 ? (
          lessons.map((lesson) => (
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
    <a
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
    </a>
  );
}
