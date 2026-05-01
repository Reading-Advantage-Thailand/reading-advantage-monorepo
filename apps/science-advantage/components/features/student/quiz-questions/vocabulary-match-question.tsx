"use client";

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { QuizQuestion } from './types';

interface VocabularyMatchQuestionProps {
  question: QuizQuestion;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}

export function VocabularyMatchQuestion({
  question,
  value,
  onChange
}: VocabularyMatchQuestionProps) {
  // Expected format from API:
  // options: {
  //   terms: ["Term1", "Term2", "Term3"],
  //   definitions: ["Def1", "Def2", "Def3"]
  // }

  const vocabOptions = (question.options &&
    !Array.isArray(question.options) &&
    'terms' in question.options &&
    'definitions' in question.options
  ) ? question.options : { terms: [] as string[], definitions: [] as string[] };

  const terms: string[] = vocabOptions.terms || [];
  const definitions: string[] = vocabOptions.definitions || [];

  const handleSelectionChange = (term: string, definition: string) => {
    onChange({
      ...value,
      [term]: definition
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-gray-700">
        Match each term with its definition
      </p>
      <div className="space-y-4">
        {terms.map((term, index) => (
          <div key={index} className="space-y-2">
            <Label htmlFor={`${question.id}-term-${index}`} className="font-semibold text-gray-900">
              {term}
            </Label>
            <Select
              value={value[term] || ''}
              onValueChange={(definition) => handleSelectionChange(term, definition)}
            >
              <SelectTrigger
                id={`${question.id}-term-${index}`}
                aria-label={`Select definition for ${term}`}
                className="w-full"
              >
                <SelectValue placeholder="Select a definition" />
              </SelectTrigger>
              <SelectContent>
                {definitions.map((definition, defIndex) => (
                  <SelectItem
                    key={defIndex}
                    value={definition}
                    aria-label={definition}
                  >
                    {definition}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
