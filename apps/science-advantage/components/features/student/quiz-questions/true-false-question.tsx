"use client";

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { QuizQuestion } from './types';

interface TrueFalseQuestionProps {
  question: QuizQuestion;
  value: string | undefined;
  onChange: (value: string) => void;
}

export function TrueFalseQuestion({
  question,
  value,
  onChange
}: TrueFalseQuestionProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      aria-label={question.text || 'True or false question'}
      className="space-y-3"
    >
      <div className="flex items-center space-x-3">
        <RadioGroupItem
          value="True"
          id={`${question.id}-true`}
        />
        <Label
          htmlFor={`${question.id}-true`}
          className="cursor-pointer font-normal text-gray-700"
        >
          True
        </Label>
      </div>
      <div className="flex items-center space-x-3">
        <RadioGroupItem
          value="False"
          id={`${question.id}-false`}
        />
        <Label
          htmlFor={`${question.id}-false`}
          className="cursor-pointer font-normal text-gray-700"
        >
          False
        </Label>
      </div>
    </RadioGroup>
  );
}
