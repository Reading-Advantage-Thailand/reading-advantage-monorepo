import base64 from "base64-js";
import fs from "fs";
import path from "path";
import { generateObject } from "ai";
import { openai, openaiModel } from "@/utils/openai";
import { google, googleModelLite } from "@/utils/google";
import z from "zod";
import ffmpeg from "fluent-ffmpeg";
import {
  AUDIO_URL,
  AVAILABLE_VOICES,
  BASE_TEXT_TO_SPEECH_URL,
  VOICES_AI,
} from "../constants";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SentenceTimepoint, WordTimestamp } from "@/types";
import { translateAndStoreSentences } from "./sentence-translator";
import { log } from "console";
import { createLogFile } from "../logging";
import { SENTENCE_SPLITTER_SYSTEM_PROMPT } from "@/data/prompts-ai";
import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";
import { uploadToBucket } from "@/utils/storage";

interface GenerateAudioParams {
  passage: string;
  sentences: string[];
  articleId: string;
}

interface GenerateChapterAudioParams {
  content: string;
  storyId: string;
  chapterNumber: string;
}

// Simple and reliable sentence splitting that handles abbreviations AND quotes
// function splitSentencesCorrectly(text: string): string[] {
//   // Common abbreviations that should not trigger sentence breaks
//   const abbreviations = [
//     "Mr",
//     "Mrs",
//     "Ms",
//     "Miss",
//     "Dr",
//     "Prof",
//     "Sr",
//     "Jr",
//     "vs",
//     "etc",
//     "Inc",
//     "Corp",
//     "Ltd",
//     "Co",
//     "Ave",
//     "St",
//     "Rd",
//     "Blvd",
//     "Apt",
//     "No",
//     "Vol",
//     "pp",
//     "Ph",
//     "M.D",
//     "B.A",
//     "M.A",
//     "Ph.D",
//     "U.S",
//     "U.K",
//     "i.e",
//     "e.g",
//   ];

//   const sentences: string[] = [];
//   let currentSentence = "";
//   let quoteCount = 0; // Track if we're inside quotes

//   // Split text into words while preserving spaces and punctuation
//   const tokens = text.match(/\S+|\s+/g) || [];

//   for (let i = 0; i < tokens.length; i++) {
//     const token = tokens[i];
//     currentSentence += token;

//     // Count quotes in this token to track quote state
//     const quotes = (token.match(/[""'"'']/g) || []).length;
//     quoteCount += quotes;
//     const insideQuotes = quoteCount % 2 === 1;

//     // Check if this token ends with sentence punctuation
//     if (/[.!?]+$/.test(token.trim())) {
//       // Check if it's an abbreviation
//       const wordWithoutPunct = token.replace(/[.!?]+$/, "").trim();
//       const isAbbreviation = abbreviations.some(
//         (abbr) => wordWithoutPunct.toLowerCase() === abbr.toLowerCase(),
//       );

//       // Don't split if:
//       // 1. It's an abbreviation, OR
//       // 2. We're inside quotes (unless this token also closes the quote)
//       const shouldNotSplit = isAbbreviation || (insideQuotes && quotes === 0);

//       if (!shouldNotSplit) {
//         // Look ahead to see if next non-space token starts with capital letter
//         let nextWordIndex = i + 1;
//         while (
//           nextWordIndex < tokens.length &&
//           /^\s+$/.test(tokens[nextWordIndex])
//         ) {
//           nextWordIndex++;
//         }

//         const nextWord =
//           nextWordIndex < tokens.length ? tokens[nextWordIndex] : "";
//         const nextStartsWithCapital = /^[A-Z]/.test(nextWord);
//         const isEnd = nextWordIndex >= tokens.length;

//         // Split sentence if we're at the end OR next word starts with capital
//         if (isEnd || nextStartsWithCapital) {
//           sentences.push(currentSentence.trim());
//           currentSentence = "";
//           // Reset quote count for new sentence
//           quoteCount = 0;
//         }
//       }
//     }
//   }

//   // Add any remaining text
//   if (currentSentence.trim()) {
//     sentences.push(currentSentence.trim());
//   }

//   return sentences.filter((s) => s.length > 0);
// }

function splitSentences(text: string): string[] {
  // 1. Normalize line breaks and trim overall text
  text = text.replace(/\r\n|\r/g, "\n").trim();

  if (!text) {
    return []; // Return empty array for empty input
  }

  // This robust regex aims to split sentences based on common terminators (.?!)
  // while handling numerous exceptions.
  // It captures the delimiter (Group 1) and the following whitespace/quotes (Group 2).
  const sentenceRegex = new RegExp(
    // Look for common sentence-ending punctuation.
    "([.?!])" +
      // Capture optional whitespace and quote characters immediately after the punctuation.
      // This handles cases like "sentence." or "sentence?" "Another".
      "(\\s*[\"'`’„”«»]*\\s*)" +
      // Negative lookahead to prevent splitting in the middle of:
      // - A word (e.g., 'etc.and')
      // - A number (e.g., '3.14')
      // - Common abbreviations followed by a period (e.g., 'Mr.', 'Dr.', 'etc.')
      // - Acronyms/initials (e.g., 'U.S.A.', 'J.P. Morgan')
      "(?!" +
      "\\s*" + // Optional whitespace
      "(?:" +
      "[a-z]" + // Lowercase letter (part of a word)
      "|\\d+" + // A digit (part of a number/version)
      "|" +
      "(?:" + // Common abbreviations (non-exhaustive, add more if needed)
      "\\b(?:Mr|Mrs|Ms|Dr|Prof|Gen|Col|Sr|Jr|Ave|Blvd|St|Rd|Apt|Pvt|Corp|Inc|Ltd|Co|etc|e\\.g|i\\.e)" +
      "|" + // Or multi-initial acronyms (A.B.C.) - matches A.B. then expects C. for example
      "(?:[A-Z]\\.){2,}" +
      ")" +
      "\\." + // The period specifically for abbreviations/acronyms
      ")" +
      ")" +
      // Another negative lookahead: do not split if the punctuation is immediately followed by a quote
      // UNLESS it's also followed by a capital letter or end of string.
      // This helps manage dialogue flow: "He said, 'Hello.'" shouldn't split 'Hello.'
      // but "He said, 'Hello.' She replied..." should split 'Hello.'.
      "(?!['\"`’])" +
      // Positive lookahead: Ensure the split point is valid.
      // It must be followed by:
      // - Optional whitespace, then a capital letter (start of new sentence)
      // - OR optional whitespace, then a quote (start of new dialogue sentence)
      // - OR the very end of the string ($) to capture the last sentence.
      "(?=\\s*(?:[A-Z\"'`’]|$))",
    "g", // Global flag to find all matches
  );

  const sentences: string[] = [];
  let lastIndex = 0; // Tracks the start of the current segment

  // Use matchAll to get all occurrences of the regex pattern
  const matches = Array.from(text.matchAll(sentenceRegex));

  // Handle the case where there are no delimiters (e.g., a single phrase)
  if (matches.length === 0 && text.length > 0) {
    sentences.push(text.trim());
    return sentences;
  }

  for (const match of matches) {
    const fullMatch = match[0]; // The entire matched string (e.g., ". ")
    const delimiter = match[1]; // The punctuation mark (e.g., ".")
    const trailingChars = match[2]; // The whitespace/quotes after the delimiter (e.g., " ")
    const matchStartIndex = match.index!; // Where the match started in the text

    // Extract the sentence text before the delimiter
    let sentenceText = text.substring(lastIndex, matchStartIndex);

    // Reconstruct the full sentence including the delimiter and its immediate trailing characters
    // Only include the trailing chars if they actually exist (i.e., not end of string)
    let fullSentence =
      sentenceText +
      delimiter +
      (matchStartIndex + fullMatch.length <= text.length ? trailingChars : "");

    // Trim and clean up extra internal spaces
    fullSentence = fullSentence.replace(/\s+/g, " ").trim();

    if (fullSentence) {
      sentences.push(fullSentence);
    }

    lastIndex = matchStartIndex + fullMatch.length;
  }

  // Add any remaining text as a sentence if it exists
  // This catches text that doesn't end with standard punctuation.
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex).replace(/\s+/g, " ").trim();
    if (remainingText) {
      sentences.push(remainingText);
    }
  }

  return sentences;
}

// Improved helper function to split text into sentences properly
async function splitIntoSentences(passage: string): Promise<string[]> {
  try {
    //const prompt = `You are an SSML processing engine. Given the following text, break it into sentences and wrap each sentence in SSML tags. Add a <mark> tag before each sentence using the format <mark name='sentenceX'/> where X is the sentence number.\n\nHere is the text:\n---\n${article}\n---\n\nReturn only the SSML output, without explanations.`;
    const systemPrompt = `You are a text processor. Given an article, split it into individual sentences.
    Return only an array of strings, where each string is a complete sentence from the article.
    Preserve the original punctuation and formatting within each sentence.`;
    const userPrompt = `Split the following text into complete sentences, keeping dialogue and attribution together:${passage}`;

    //and Add a <speak> tag before and end article only.
    const { object } = await generateObject({
      model: google(googleModelLite),
      schema: z.object({
        input: z
          .object({
            article: z
              .string()
              .min(10)
              .describe(
                "The input article as a string. Must be at least 10 characters long.",
              ),
          })
          .describe("The input object containing the article to be processed."),

        output: z
          .object({
            sentences: z
              .array(z.string().min(1))
              .describe(
                "An array of sentences extracted from the article. Each sentence must be a non-empty string.",
              ),
          })
          .describe("The output object containing the extracted sentences."),
      }),
      system: SENTENCE_SPLITTER_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.2,
    });

    console.log(object.output.sentences);

    return object.output.sentences;
  } catch (error: any) {
    throw `failed to generate ssml: ${error}`;
  }
}

function processWordTimestampsIntoSentences(
  wordTimestamps: WordTimestamp[],
  sentences: string[],
  articleId: string,
): SentenceTimepoint[] {
  const sentenceTimepoints: SentenceTimepoint[] = [];

  // Split the original passage into sentences using a more sophisticated approach
  // const sentences = splitIntoSentences(passage);

  let wordIndex = 0;
  let hasProblems = false;
  const problemsLog: any[] = [];

  sentences.forEach((sentence, sentenceIndex) => {
    const sentenceWords: WordTimestamp[] = [];
    const cleanSentence = sentence.trim();

    // Get the actual words from this sentence
    const sentenceWordsList = cleanSentence
      .split(/[\s\—\–]+/)
      .map((word) => word.replace(/[^\w]/g, "").toLowerCase())
      .filter((word) => word.length > 0);

    let sentenceStartTime = null;
    let sentenceEndTime = null;
    let wordsFound = 0;
    const missingWords: string[] = [];

    // Look for each word from the sentence in the word timestamps
    for (const expectedWord of sentenceWordsList) {
      let wordFound = false;

      // Search through remaining timestamps for this word
      let searchIndex = wordIndex;
      while (searchIndex < wordTimestamps.length) {
        const timestamp = wordTimestamps[searchIndex];
        const timestampWord = timestamp.word
          .replace(/[^\w]/g, "")
          .toLowerCase();

        if (timestampWord === expectedWord) {
          // Found the word - add it to sentence
          sentenceWords.push({
            ...timestamp,
            word: timestamp.word.replace(/[.!?,;:'"""()[\]{}…]+/g, ""),
          });

          if (sentenceStartTime === null) {
            sentenceStartTime = timestamp.start;
          }
          sentenceEndTime = timestamp.end;

          // Update wordIndex to continue from next word
          wordIndex = searchIndex + 1;
          wordsFound++;
          wordFound = true;
          break;
        }
        searchIndex++;
      }

      if (!wordFound) {
        missingWords.push(expectedWord);
        hasProblems = true;
        // console.warn(
        //   `Missing timestamp for word: "${expectedWord}" in sentence: "${cleanSentence.substring(0, 50)}..."`,
        // );
      }
    }

    // Log missing words for debugging
    if (missingWords.length > 0) {
      problemsLog.push({
        sentenceIndex,
        sentence: cleanSentence,
        expectedWords: sentenceWordsList,
        missingWords,
        wordsFound,
        totalWords: sentenceWordsList.length,
      });
      // console.log(`Missing words from timestamps:`, missingWords);
      // console.log(
      //   `Found ${wordsFound}/${sentenceWordsList.length} words for sentence`,
      // );
    }

    // Create sentence timepoint even if some words are missing
    if (
      sentenceWords.length > 0 &&
      sentenceStartTime !== null &&
      sentenceEndTime !== null
    ) {
      sentenceTimepoints.push({
        startTime: sentenceStartTime,
        endTime: sentenceEndTime,
        words: sentenceWords,
        sentence: cleanSentence,
      });
    } else if (sentenceWords.length === 0) {
      hasProblems = true;
      problemsLog.push({
        sentenceIndex,
        sentence: cleanSentence,
        error: "No words found for sentence",
        expectedWords: sentenceWordsList,
      });
      // console.error(`No words found for sentence: "${cleanSentence}"`);
    }
  });
  // Only create log file if there are problems
  if (hasProblems) {
    createLogFile(
      articleId,
      {
        status: "PROBLEMS_DETECTED",
        wordTimestampsCount: wordTimestamps.length,
        sentencesCount: sentences.length,
        problemsCount: problemsLog.length,
        problems: problemsLog,
        wordTimestamps: wordTimestamps,
        sentences: sentences,
      },
      "problems",
    );

    console.log(
      `⚠️  Processing completed with problems. Log file created for article: ${articleId}`,
    );
  }

  return sentenceTimepoints;
}

export async function generateAudio({
  passage,
  sentences,
  articleId,
}: GenerateAudioParams): Promise<void> {
  try {
    const voice = VOICES_AI[Math.floor(Math.random() * VOICES_AI.length)];

    const response = await fetch("https://api.lemonfox.ai/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AUDIO_API_KEY}`,
      },
      body: JSON.stringify({
        input: passage,
        voice: voice,
        response_format: "mp3",
        speed: 0.7,
        word_timestamps: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const json = await response.json();

    const MP3 = base64.toByteArray(json.audio);

    const localPath = `${process.cwd()}/data/audios/${articleId}.mp3`;
    fs.writeFileSync(localPath, MP3);

    await uploadToBucket(localPath, `audios/articles/${articleId}.mp3`);

    fs.unlinkSync(localPath);

    // const sentences = await splitIntoSentences(passage);
    // const sentence: string[] = sentencize(passage);
    // const nlp = winkNLP(model);
    // const doc = nlp.readDoc(passage);
    // const its = nlp.its;
    // const sentences: string[] = doc.sentences().out(its.value);

    // Process word timestamps into sentence timepoints
    const sentenceTimepoints = processWordTimestampsIntoSentences(
      json.word_timestamps,
      sentences,
      articleId,
    );

    // // Update the database with sentence timepoints
    await prisma.article.update({
      where: { id: articleId },
      data: {
        sentences: JSON.parse(JSON.stringify(sentenceTimepoints)),
        audioUrl: `/audios/articles/${articleId}.mp3`,
      },
    });

    // Automatically translate sentences after audio generation
    try {
      await translateAndStoreSentences({ articleId });
    } catch (translationError) {
      console.error(
        `Failed to translate sentences for article ${articleId}:`,
        translationError,
      );
      // Don't throw here - audio generation was successful
    }

    return;
  } catch (error: any) {
    console.log(error);
    throw `failed to generate audio: ${error} \n\n error: ${JSON.stringify(
      error.response.data,
    )}`;
  }
}

// export async function generateChapterAudio({
//   content,
//   storyId,
//   chapterNumber,
// }: GenerateChapterAudioParams): Promise<void> {
//   try {
//     const voice =
//       AVAILABLE_VOICES[Math.floor(Math.random() * AVAILABLE_VOICES.length)];
//     const newVoice =
//       NEW_MODEL_VOICES[Math.floor(Math.random() * NEW_MODEL_VOICES.length)];

//     const { sentences, chunks } = await splitTextIntoChunks(content, 5000);
//     let currentIndex = 0;
//     let cumulativeTime = 0;

//     const result: Array<{
//       markName: string;
//       timeSeconds: number;
//       index: number;
//       file: string;
//       sentences: string;
//     }> = [];
//     [];
//     const audioPaths: string[] = [];

//     for (let i = 0; i < chunks.length; i++) {
//       const ssml = chunks[i];
//       const response = await fetch(
//         `${BASE_TEXT_TO_SPEECH_URL}/v1beta1/text:synthesize?key=${process.env.GOOGLE_TEXT_TO_SPEECH_API_KEY}`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             input: {
//               ssml: ssml,
//             },
//             voice: {
//               languageCode: "en-US",
//               name: voice,
//             },
//             audioConfig: {
//               audioEncoding: "MP3",
//             },
//             enableTimePointing: ["SSML_MARK"],
//           }),
//         }
//       );

//       if (!response.ok) {
//         throw new Error(`Error: ${response.statusText}`);
//       }

//       const data = await response.json();
//       const audio = data.audioContent;
//       const MP3 = base64.toByteArray(audio);

//       const localPath = `${process.cwd()}/data/audios/${storyId}-${chapterNumber}_${i}.mp3`;
//       fs.writeFileSync(localPath, MP3);
//       audioPaths.push(localPath);

//       // Process timepoints and build the result array
//       data.timepoints.forEach((tp: any) => {
//         result.push({
//           markName: `sentence${currentIndex++}`,
//           timeSeconds: tp.timeSeconds + cumulativeTime,
//           index: currentIndex - 1,
//           file: `${storyId}-${chapterNumber}.mp3`, // Final combined file name
//           sentences: sentences[currentIndex - 1],
//         });
//       });

//       // Update the cumulative time with the duration of the current chunk
//       // const chunkDuration = data.timepoints[data.timepoints.length - 1]?.timeSeconds || 0;
//       const chunkDuration = await getAudioDuration(localPath);
//       cumulativeTime += chunkDuration;
//     }

//     // Combine MP3 files using FFmpeg
//     const combinedAudioPath = `${process.cwd()}/data/audios/${storyId}-${chapterNumber}.mp3`;
//     await mergeAudioFiles(audioPaths, combinedAudioPath);

//     // Cleanup
//     audioPaths.forEach((p) => fs.unlinkSync(p));

//     await uploadToBucket(
//       combinedAudioPath,
//       `${AUDIO_URL}/${storyId}-${chapterNumber}.mp3`
//     );

//     // Update the database with all timepoints

//     await db
//       .collection("stories")
//       .doc(storyId)
//       .collection("timepoints")
//       .doc(chapterNumber)
//       .set({
//         timepoints: result,
//         id: storyId,
//         chapterNumber: chapterNumber,
//       });
//   } catch (error: any) {
//     console.log(error);
//     // throw `failed to generate audio: ${error} \n\n error: ${JSON.stringify(
//     //   error.response.data
//     // )}`;
//   }
// }
