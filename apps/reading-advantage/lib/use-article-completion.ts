import { useCallback, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import { checkArticleCompletion } from "./check-article-completion";

const completionToastShown = new Set<string>();

export function useArticleCompletion() {
  const checkAndNotifyCompletion = useCallback(
    async (userId: string, articleId: string) => {
      try {
        const completion = await checkArticleCompletion(userId, articleId);

        if (completion.allCompleted && !completion.wasAlreadyCompleted) {
          const completionKey = `${userId}-${articleId}`;

          if (!completionToastShown.has(completionKey)) {
            completionToastShown.add(completionKey);

            toast({
              title: "🎉 Article Completed!",
              description:
                "Congratulations! You have completed all questions for this article. Your reading progress has been saved!",
              duration: 5000,
            });

            setTimeout(() => {
              completionToastShown.delete(completionKey);
            }, 10000);
          }

          return {
            ...completion,
            justCompleted: true,
          };
        }

        return {
          ...completion,
          justCompleted: false,
        };
      } catch (error) {
        console.error("Error checking article completion:", error);
        return {
          mcqCompleted: false,
          saqCompleted: false,
          laqCompleted: false,
          allCompleted: false,
          justCompleted: false,
        };
      }
    },
    []
  );

  return {
    checkAndNotifyCompletion,
  };
}
