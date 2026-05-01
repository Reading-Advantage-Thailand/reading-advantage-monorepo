"use client";
import React, { useRef, useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useReactToPrint } from "react-to-print";
import { Article } from "@/components/models/article-model";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { Locale } from "@/configs/locale-config";

export default function PrintArticle({
  articleId,
  article,
}: {
  articleId: string;
  article: Article;
}) {
  const [laqQuestions, setLAQQuestions] = useState<any[]>([]);
  const [saqQuestions, setSAQQuestions] = useState<any[]>([]);
  const [maqQuestions, setMAQQuestions] = useState<any[]>([]);
  const [wordList, setWordList] = useState<any[]>([]);
  const [translated, setTranslated] = useState<any[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });
  const locale = useCurrentLocale();
  const t = useScopedI18n("components.article");
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const handlePrint = async () => {
    if (isDataLoaded) {
      reactToPrintFn();
      return;
    }
    
    setIsLoading(true);
    const fetchLAQQuestions = async () => {
      const response = await fetch(
        `/api/v1/articles/${articleId}/questions/laq`
      );
      const data = await response.json();
      if (data.message) {
        console.error(data.message);
      } else {
        setLAQQuestions(data.result.question);
      }
    };
    const fetchSAQQuestions = async () => {
      const response = await fetch(
        `/api/v1/articles/${articleId}/questions/sa`
      );
      const data = await response.json();
      if (data.message) {
        console.error(data.message);
      } else {
        setSAQQuestions(data.result.question);
      }
    };
    const fetchMAQQuestions = async () => {
      const response = await fetch(
        `/api/v1/articles/${articleId}/questions/mcq`
      );
      const data = await response.json();
      if (data.message) {
        console.error(data.message);
      } else {
        setMAQQuestions(data.results);
      }
    };
    const fetchWordList = async () => {
      const response = await fetch(`/api/v1/assistant/wordlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ article, articleId }),
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setWordList(data);
      } else if (data.word_list) {
        setWordList(data.word_list);
      } else if (data.message) {
        console.error(data.message);
      }
    };
    const fetchTranslate = async () => {
      type ExtendedLocale = "th" | "cn" | "tw" | "vi" | "zh-CN" | "zh-TW";
      let targetLanguage: ExtendedLocale = locale as ExtendedLocale;
      switch (locale) {
        case "cn":
          targetLanguage = "zh-CN";
          break;
        case "tw":
          targetLanguage = "zh-TW";
          break;
      }
      if (locale !== "en") {
        const response = await fetch(`/api/v1/assistant/translate`, {
          method: "POST",
          body: JSON.stringify({ passage: article.passage, targetLanguage }),
        });
        const data = await response.json();

        setTranslated(data.translated_sentences);
      }
    };
    await Promise.all([
      fetchTranslate(),
      fetchWordList(),
      fetchSAQQuestions(),
      fetchMAQQuestions(),
      fetchLAQQuestions()
    ]);
    
    setIsDataLoaded(true);
    setIsLoading(false);
    
    setTimeout(() => {
      reactToPrintFn();
    }, 500);
  };

  const highlightVocabulary = (text: string, vocabularyList: string[]) => {
    const escapedWords = vocabularyList.map((word) =>
      word.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
    );
    const pattern = new RegExp(`\\b(${escapedWords.join("|")})\\b`, "gi");

    return text
      .split(pattern)
      .map((part, index) =>
        vocabularyList.some(
          (vocab) => vocab.toLowerCase() === part.toLowerCase()
        ) ? (
          <strong key={index}>{part}</strong>
        ) : (
          part
        )
      );
  };

  const vocabularyList =
    wordList?.map((word: { vocabulary: string }) => word.vocabulary) || [];

  const paragraphs = article.passage.split("\n\n");

  let charCount = 0;
  let questionCharCount = 0;

  return (
    <div className="flex items-center">
      <Button size="sm" onClick={handlePrint} disabled={isLoading}>
        {isLoading ? "Loading..." : t("printButton")}
      </Button>
      {isDataLoaded && (
        <div className="hidden">
          <div
            ref={contentRef}
            className="w-[210mm] h-[297mm] mx-auto bg-white print:p-4 print:w-[210mm] print:h-[297mm] relative"
          >
            {/* Persistent Print Header */}
            <div className="hidden print:flex fixed justify-center top-0 left-[35%] text-xs text-gray-600">
            <div className="flex items-end gap-2">
              <img
                src="/android-chrome-192x192.png"
                alt="Logo"
                className="h-9 w-9"
              />
              <div className="flex flex-col">
                <h1 className="font-semibold text-lg">Reading Advantage</h1>
                <p className="">Your Reading Journey, Your Advantage</p>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <header className="text-center mb-6">
              <h1 className="text-2xl font-bold">{article.title}</h1>
              <p className="text-gray-600 text-sm">
                RALevel : {article.ra_level} / CEFR Level : {article.cefr_level}
              </p>
              <p className="text-gray-700 mt-2">{article.summary}</p>
            </header>

            <div className="flex gap-6 items-start mb-6">
              <div className="w-1/3 bg-gray-100 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">Vocabulary List</h3>
                <ul className="list-disc list-inside text-gray-700">
                  {wordList?.map(
                    (
                      wordlist: {
                        vocabulary: string;
                        definition: { [key in Locale]: string };
                      },
                      index: number
                    ) => (
                      <li key={index}>
                        <span className="text-sm">{wordlist.vocabulary}</span>
                        {" - "}
                        <span className="text-sm">
                          {wordlist.definition[locale as Locale]}
                        </span>
                      </li>
                    )
                  )}
                </ul>
              </div>
              <div className="w-2/3 flex justify-center">
                <img
                  src={`https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${articleId}.png`}
                  alt="Article Illustration"
                  className="max-w-full h-auto rounded-lg shadow-md"
                />
              </div>
            </div>

            <div className="break-before-page mt-[10mm]"></div>

            <article className="text-gray-800  leading-relaxed mb-6 p-4">
              {paragraphs.map((paragraph, index) => {
                const paragraphLength = paragraph.length;
                charCount += paragraphLength;

                const shouldBreak = charCount > 3000;
                if (shouldBreak) charCount = 0;

                return (
                  <p
                    key={index}
                    className={`mb-4 article-paragraph break-inside-avoid ${
                      shouldBreak ? "break-before-page mt-[15mm]" : ""
                    }`}
                  >
                    <span className="font-semibold mr-2">{index + 1}.</span>
                    {highlightVocabulary(paragraph, vocabularyList)}
                  </p>
                );
              })}
            </article>

            <div className="break-before-page mt-[10mm]"></div>

            <section className="p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">
                Multiple Choice Questions
              </h3>
              <div className="space-y-4">
                {maqQuestions?.map(
                  (
                    question: { question: string; options: string[] },
                    index: number
                  ) => {
                    const questionLength = question.question.length;
                    const optionsLength = question.options.reduce(
                      (total, option) => total + option.length,
                      0
                    );
                    const totalLength = questionLength + optionsLength;

                    questionCharCount += totalLength;
                    const shouldBreak = questionCharCount > 2500;

                    if (shouldBreak) questionCharCount = 0;

                    return (
                      <div key={index} className={`maq-question`}>
                        <p
                          className={`font-medium break-inside-avoid ${
                            shouldBreak ? "break-before-page mt-[15mm]" : ""
                          }`}
                        >
                          {index + 1}. {question.question}
                        </p>
                        <div className="space-y-1 ">
                          {question.options.map(
                            (option, optionIndex: number) => (
                              <label
                                key={optionIndex}
                                className="flex items-start"
                              >
                                <input
                                  type="radio"
                                  name={`q${index + 1}`}
                                  className="mt-1 mr-2"
                                />
                                <p>
                                  {String.fromCharCode(65 + optionIndex)}.{" "}
                                  {option}
                                </p>
                              </label>
                            )
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>

            <div className="break-before-page mt-[10mm]"></div>

            <div className="p-6">
              <section className=" mb-6">
                <h3 className="text-xl font-semibold">Short Answer Question</h3>
                <p className="mt-2 text-gray-700">{saqQuestions}:</p>
                <div className="border-b border-gray-400 h-8 my-2"></div>
                <div className="border-b border-gray-400 h-8 my-2"></div>
              </section>

              <section className="mb-6">
                <h3 className="text-xl font-semibold">Long Answer Question</h3>
                <p className="mt-2 text-gray-700">{laqQuestions}:</p>
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="border-b border-gray-400 h-8"></div>
                  ))}
                </div>
              </section>
            </div>

            {locale !== "en" && (
              <>
                <div className="break-before-page mt-[10mm]"></div>

                <section className="p-6">
                  <h3 className="text-xl font-semibold">Translation</h3>
                  <div className="text-gray-800 leading-relaxed mt-6 text-sm">
                    {translated.map((paragraph: string, index: number) => {
                      const paragraphLength = paragraph.length;
                      charCount += paragraphLength;

                      const shouldBreak = charCount > 5000;
                      if (shouldBreak) charCount = 0;
                      return (
                        <p
                          key={index}
                          className={`mb-4 translation-paragraph break-inside-avoid ${
                            shouldBreak ? "break-before-page mt-[15mm]" : ""
                          }`}
                        >
                          <span className="font-semibold mr-2">
                            {index + 1}.
                          </span>
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </div>
          {/* Print Footer with Page Number and Title */}
          <div className="hidden print:flex fixed bottom-0 left-0 right-0 justify-between items-center text-xs px-6 py-2 border-t bg-white">
            <span className="text-sm">{article.title}</span>
            {/* <span className="text-gray-600 page-number" /> */}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
