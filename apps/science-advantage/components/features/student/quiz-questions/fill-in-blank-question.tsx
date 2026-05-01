"use client";

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { QuizQuestion } from './types';

interface FillInBlankQuestionProps {
  question: QuizQuestion;
  value: string;
  onChange: (value: string) => void;
}

export function FillInBlankQuestion({
  question,
  value,
  onChange
}: FillInBlankQuestionProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor={`${question.id}-input`} className="text-sm font-medium text-gray-700">
        Your answer:
      </Label>
      <Input
        id={`${question.id}-input`}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here"
        aria-label="Answer input"
        className="max-w-md"
      />
    </div>
  );
}
