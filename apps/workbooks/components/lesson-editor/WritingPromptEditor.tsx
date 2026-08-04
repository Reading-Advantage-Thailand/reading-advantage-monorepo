"use client";

import type { WritingPromptEditorProps } from "./types";

/**
 * Edits the writing prompt section of a workbook lesson: the prompt, the plan
 * prompts, the sentence frames, and the sentence starters (as JSON arrays).
 * The visual-break image workflow is excluded in this phase: image generation
 * routes through @reading-advantage/ai as proposal-only work (FR-11).
 *
 * @param props - Current writing values plus an onChange callback; see WritingPromptEditorProps.
 * @returns The Writing Prompt section.
 */
export function WritingPromptEditor({
  writing_prompt,
  writing_plan_prompts,
  writing_sentence_frames,
  sentence_starters,
  onChange,
}: WritingPromptEditorProps) {
  const handlePlanPromptsChange = (value: string) => {
    try {
      const parsed: unknown = JSON.parse(value);
      onChange("writing_plan_prompts", parsed as string[]);
    } catch {
      // Invalid JSON is not propagated; the editor keeps its last valid value.
    }
  };

  const handleSentenceFramesChange = (value: string) => {
    try {
      const parsed: unknown = JSON.parse(value);
      onChange("writing_sentence_frames", parsed as string[]);
    } catch {
      // Invalid JSON is not propagated; the editor keeps its last valid value.
    }
  };

  const handleSentenceStartersChange = (value: string) => {
    try {
      const parsed: unknown = JSON.parse(value);
      onChange("sentence_starters", parsed as string[]);
    } catch {
      // Invalid JSON is not propagated; the editor keeps its last valid value.
    }
  };

  return (
    <section aria-labelledby="writing-prompt-heading">
      <h2 id="writing-prompt-heading">Writing Prompt</h2>
      <p>
        The visual break image workflow is deferred (image features are
        proposal-only via @reading-advantage/ai).
      </p>
      <div>
        <label htmlFor="writing_prompt">Writing Prompt</label>
        <textarea
          id="writing_prompt"
          value={writing_prompt || ""}
          onChange={(event) => onChange("writing_prompt", event.target.value)}
          rows={4}
          placeholder="Writing prompt for students..."
        />
      </div>
      <div>
        <label htmlFor="writing_plan_prompts">Writing Plan Prompts</label>
        <textarea
          id="writing_plan_prompts"
          value={JSON.stringify(writing_plan_prompts || [])}
          onChange={(event) => handlePlanPromptsChange(event.target.value)}
          rows={3}
          className="font-mono"
          placeholder='["Main idea / discovery:", "Key details to include:", "Vocabulary I will use:", "Why this discovery matters:"]'
        />
        <p>Enter as JSON array of strings</p>
      </div>
      <div>
        <label htmlFor="writing_sentence_frames">Writing Sentence Frames</label>
        <textarea
          id="writing_sentence_frames"
          value={JSON.stringify(writing_sentence_frames || [])}
          onChange={(event) => handleSentenceFramesChange(event.target.value)}
          rows={3}
          className="font-mono"
          placeholder='["First, I will...", "Then, I will..."]'
        />
        <p>Sentence starters to scaffold student writing (JSON array)</p>
      </div>
      <div>
        <label htmlFor="sentence_starters">Sentence Starters</label>
        <textarea
          id="sentence_starters"
          value={JSON.stringify(sentence_starters || [])}
          onChange={(event) => handleSentenceStartersChange(event.target.value)}
          rows={3}
          className="font-mono"
          placeholder='["The map shows...", "I discovered that..."]'
        />
        <p>Sentence starters to scaffold student writing (JSON array)</p>
      </div>
    </section>
  );
}
