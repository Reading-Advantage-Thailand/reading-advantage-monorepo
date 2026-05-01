"use client";

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { QuizQuestion } from './types';

interface MultipleChoiceQuestionProps {
  question: QuizQuestion;
  value: string | undefined;
  onChange: (value: string) => void;
}

export function MultipleChoiceQuestion({
  question,
  value,
  onChange
}: MultipleChoiceQuestionProps) {
  const options: string[] = Array.isArray(question.options) ? question.options : [];

  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      aria-label={question.text}
      className="space-y-3"
    >
      {options.map((option, index) => (
        <div key={index} className="flex items-center space-x-3">
          <RadioGroupItem
            value={option}
            id={`${question.id}-option-${index}`}
            aria-label={option}
          />
          <Label
            htmlFor={`${question.id}-option-${index}`}
            className="cursor-pointer font-normal text-gray-700"
          >
            {option}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
