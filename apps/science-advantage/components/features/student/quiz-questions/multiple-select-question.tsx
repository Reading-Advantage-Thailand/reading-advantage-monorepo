"use client";

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import { QuizQuestion } from './types';

interface MultipleSelectQuestionProps {
  question: QuizQuestion;
  value: string[];
  onChange: (value: string[]) => void;
}

export function MultipleSelectQuestion({
  question,
  value,
  onChange
}: MultipleSelectQuestionProps) {
  const options: string[] = Array.isArray(question.options) ? question.options : [];

  const handleCheckboxChange = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...value, option]);
    } else {
      onChange(value.filter(v => v !== option));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-gray-700">
        Select all that apply
      </p>
      <div className="space-y-3">
        {options.map((option, index) => (
          <div key={index} className="flex items-center space-x-3">
            <Checkbox
              id={`${question.id}-option-${index}`}
              checked={value.includes(option)}
              onCheckedChange={(checked) => handleCheckboxChange(option, checked as boolean)}
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
      </div>
    </div>
  );
}
