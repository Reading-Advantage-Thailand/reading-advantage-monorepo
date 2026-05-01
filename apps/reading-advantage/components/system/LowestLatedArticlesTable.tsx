"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLowestRatedArticles } from "@/hooks/useLowestRatedArticles";

// const ChallengingQuestionsTable = () => {
const LowestRatedArticlesTable = () => {
  const { articles, loading, error, refetch } = useLowestRatedArticles(10);

  return (
    <Card className="w-full col-span-3">
      <CardHeader>
        <CardTitle className="text-lg font-bold sm:text-xl md:text-2xl">
          Lowest Rated Articles
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-red-500">Error: {error}</div>
            <button
              onClick={refetch}
              className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">No articles found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600 border-b">
                    Articles
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600 border-b">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600 border-b">
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article, index) => (
                  <tr
                    key={article.id || index}
                    className="border-b last:border-b-0"
                  >
                    <td className="px-4 py-2">{article.title}</td>
                    <td className="px-4 py-2">{article.type}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center">
                        {article.rating}
                        <span className="text-yellow-500 ml-1">★</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LowestRatedArticlesTable;
