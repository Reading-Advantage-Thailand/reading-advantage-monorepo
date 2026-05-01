'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { QuizBlock as QuizBlockType, QuizQuestionItem } from '@/lib/schemas/lesson-content.schema';

interface QuizBlockProps {
  block: QuizBlockType;
  showThai?: boolean;
  className?: string;
}

interface QuestionNavigationProps {
  currentIndex: number;
  total: number;
  answers: Map<number, string>;
  onPrevious: () => void;
  onNext: () => void;
}

function QuestionNavigation({
  currentIndex,
  total,
  answers,
  onPrevious,
  onNext,
}: QuestionNavigationProps) {
  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={currentIndex === 0}
        aria-label="Previous question"
      >
        Previous
      </Button>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Question {currentIndex + 1} of {total}
        </span>
        {answers.has(currentIndex) && (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Answered
          </Badge>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={currentIndex === total - 1}
        aria-label="Next question"
      >
        Next
      </Button>
    </div>
  );
}

interface QuestionDisplayProps {
  question: QuizQuestionItem;
  questionIndex: number;
  selectedAnswer: string | undefined;
  onSelectAnswer: (questionIndex: number, answer: string) => void;
  showThai: boolean;
}

function QuestionDisplay({
  question,
  questionIndex,
  selectedAnswer,
  onSelectAnswer,
  showThai,
}: QuestionDisplayProps) {
  const questionText = showThai && question.textThai ? question.textThai : question.text;

  return (
    <div className="space-y-4">
      <p className="font-medium text-gray-900 dark:text-gray-100">
        <span className="mr-2 text-sm text-gray-500 dark:text-gray-400">
          Q{questionIndex + 1}.
        </span>
        {questionText}
      </p>

      {question.type === 'multiple_choice' && question.options && (
        <div className="space-y-2" role="radiogroup" aria-label={`Options for question ${questionIndex + 1}`}>
          {question.options.map((option) => {
            const optionText = showThai && option.textThai ? option.textThai : option.text;
            const isSelected = selectedAnswer === option.id;

            return (
              <label
                key={option.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                )}
              >
                <input
                  type="radio"
                  name={`question-${questionIndex}`}
                  value={option.id}
                  checked={isSelected}
                  onChange={() => onSelectAnswer(questionIndex, option.id)}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">{optionText}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === 'true_false' && (
        <div className="space-y-2" role="radiogroup" aria-label={`Options for question ${questionIndex + 1}`}>
          {['True', 'False'].map((option) => {
            const isSelected = selectedAnswer === option;

            return (
              <label
                key={option}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                )}
              >
                <input
                  type="radio"
                  name={`question-${questionIndex}`}
                  value={option}
                  checked={isSelected}
                  onChange={() => onSelectAnswer(questionIndex, option)}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            );
          })}
        </div>
      )}

      {!['multiple_choice', 'true_false'].includes(question.type) && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          This question type is not yet supported for inline display.
        </p>
      )}
    </div>
  );
}

/**
 * QuizBlock component displays an inline quiz with question navigation.
 * Users can navigate between questions and select answers.
 */
export function QuizBlock({ block, showThai = false, className }: QuizBlockProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());

  const handleSelectAnswer = useCallback((questionIndex: number, answer: string) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionIndex, answer);
      return next;
    });
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(block.questions.length - 1, prev + 1));
  }, [block.questions.length]);

  const title = showThai && block.titleThai ? block.titleThai : block.title;
  const currentQuestion = block.questions[currentIndex];

  return (
    <section
      className={cn('space-y-4', className)}
      data-block-type="quiz"
      data-block-id={block.id}
      aria-label={`Quiz: ${title}`}
    >
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {answers.size} / {block.questions.length} answered
          </Badge>
          {block.passingScore !== undefined && (
            <Badge variant="secondary">
              Pass: {block.passingScore}%
            </Badge>
          )}
        </div>
      </header>

      <QuestionNavigation
        currentIndex={currentIndex}
        total={block.questions.length}
        answers={answers}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        {currentQuestion && (
          <QuestionDisplay
            question={currentQuestion}
            questionIndex={currentIndex}
            selectedAnswer={answers.get(currentIndex)}
            onSelectAnswer={handleSelectAnswer}
            showThai={showThai}
          />
        )}
      </div>
    </section>
  );
}
