"use client";

import type { LessonReflectionEditorProps } from "./types";

/**
 * Edits the lesson reflection section: the reflection focus prompt shown to
 * students at the end of the lesson. The value persists through the
 * reflectionFocus normalized contract carrier.
 *
 * @param props - The current reflection focus value plus an onChange callback; see LessonReflectionEditorProps.
 * @returns The Lesson Reflection section.
 */
export function LessonReflectionEditor({
  reflection_focus,
  onChange,
}: LessonReflectionEditorProps) {
  return (
    <section aria-labelledby="lesson-reflection-heading">
      <h2 id="lesson-reflection-heading">Lesson Reflection</h2>
      <div>
        <label htmlFor="reflection_focus">Reflection Focus</label>
        <textarea
          id="reflection_focus"
          value={reflection_focus || ""}
          onChange={(event) => onChange("reflection_focus", event.target.value)}
          rows={3}
          placeholder="Today I learned:"
        />
      </div>
    </section>
  );
}
