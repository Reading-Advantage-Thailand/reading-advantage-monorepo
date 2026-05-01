import { useState, useEffect } from 'react';

interface LowestRatedArticle {
  id: string;
  title: string;
  type: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

interface LowestRatedArticlesResponse {
  success: boolean;
  data: LowestRatedArticle[];
  count: number;
  message?: string;
  error?: string;
}

export const useLowestRatedArticles = (limit: number = 10) => {
  const [articles, setArticles] = useState<LowestRatedArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLowestRatedArticles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/system/lowest-rated-articles?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: LowestRatedArticlesResponse = await response.json();

      if (data.success) {
        setArticles(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch lowest rated articles');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching lowest rated articles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowestRatedArticles();
  }, [limit]);

  const refetch = () => {
    fetchLowestRatedArticles();
  };

  return {
    articles,
    loading,
    error,
    refetch,
  };
};
