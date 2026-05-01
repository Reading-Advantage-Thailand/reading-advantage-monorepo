'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import type { ProcedureBlock as ProcedureBlockType, ProcedureStep } from '@/lib/schemas/lesson-content.schema';

interface ProcedureBlockProps {
  block: ProcedureBlockType;
  showThai?: boolean;
  className?: string;
}

interface StepItemProps {
  step: ProcedureStep;
  showThai: boolean;
  isChecked: boolean;
  onToggle: () => void;
}

function StepItem({ step, showThai, isChecked, onToggle }: StepItemProps) {
  const hasThai = showThai && step.instructionThai;
  const stepId = `step-${step.stepNumber}`;

  return (
    <li className="relative">
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-3 pt-0.5">
          <span
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium',
              isChecked
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            )}
            aria-hidden="true"
          >
            {step.stepNumber}
          </span>
          <Checkbox
            id={stepId}
            checked={isChecked}
            onCheckedChange={onToggle}
            aria-label={`Mark step ${step.stepNumber} as complete`}
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor={stepId}
            className={cn(
              'cursor-pointer text-base',
              isChecked && 'text-gray-500 line-through dark:text-gray-400'
            )}
          >
            {step.instruction}
          </label>
          {hasThai && (
            <p
              className="mt-0.5 text-sm text-gray-500 dark:text-gray-400"
              data-thai-instruction=""
            >
              {step.instructionThai}
            </p>
          )}
          {step.subSteps && step.subSteps.length > 0 && (
            <ul className="mt-2 ml-6 space-y-1" aria-label="Sub-steps">
              {step.subSteps.map((subStep, index) => (
                <li
                  key={index}
                  className={cn(
                    'text-sm text-gray-600 dark:text-gray-400',
                    isChecked && 'text-gray-400 line-through dark:text-gray-500'
                  )}
                >
                  <span aria-hidden="true">- </span>
                  {subStep}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * ProcedureBlock component displays step-by-step instructions as an interactive checklist.
 * When showThai is true, Thai instructions appear inline below each English instruction.
 */
export function ProcedureBlock({ block, showThai = false, className }: ProcedureBlockProps) {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (stepNumber: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
  };

  return (
    <section
      className={cn('space-y-4', className)}
      data-block-type="procedure"
      data-block-id={block.id}
      data-testid={`procedure-block-${block.id ?? 'unknown'}`}
      aria-label="Procedure steps"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Procedure
      </h3>
      <ol className="space-y-4" role="list">
        {block.steps.map((step) => (
          <StepItem
            key={step.stepNumber}
            step={step}
            showThai={showThai}
            isChecked={checkedSteps.has(step.stepNumber)}
            onToggle={() => toggleStep(step.stepNumber)}
          />
        ))}
      </ol>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {checkedSteps.size} of {block.steps.length} steps completed
      </p>
    </section>
  );
}
