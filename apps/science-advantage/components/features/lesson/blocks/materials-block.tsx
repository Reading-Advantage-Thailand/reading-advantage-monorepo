'use client';

import { cn } from '@/lib/utils';
import type { MaterialsBlock as MaterialsBlockType } from '@/lib/schemas/lesson-content.schema';

interface MaterialsBlockProps {
  block: MaterialsBlockType;
  showThai?: boolean;
  className?: string;
}

/**
 * MaterialsBlock component displays a list of required materials with optional quantities.
 * When showThai is true, Thai item names appear inline below each English item.
 */
export function MaterialsBlock({ block, showThai = false, className }: MaterialsBlockProps) {
  return (
    <section
      className={cn('space-y-3', className)}
      data-block-type="materials"
      data-block-id={block.id}
      data-testid={`materials-block-${block.id ?? 'unknown'}`}
      aria-label="Materials list"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Materials Needed
      </h3>
      <ul className="space-y-2" role="list">
        {block.items.map((material, index) => {
          const hasThai = showThai && material.itemThai;

          return (
            <li
              key={`${material.item}-${index}`}
              className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-blue-500 mt-1.5"
                aria-hidden="true"
              />
              <div>
                <span>
                  {material.quantity && (
                    <span className="mr-2 font-medium text-gray-900 dark:text-gray-100">
                      {material.quantity}
                    </span>
                  )}
                  {material.item}
                </span>
                {hasThai && (
                  <p
                    className="mt-0.5 text-sm text-gray-500 dark:text-gray-400"
                    data-thai-item=""
                  >
                    {material.itemThai}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
