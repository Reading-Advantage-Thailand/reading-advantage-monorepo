import { splitTextIntoSentences } from "@/lib/utils";
import {
  AUDIO_URL,
  AVAILABLE_VOICES,
  BASE_TEXT_TO_SPEECH_URL,
  NEW_MODEL_VOICES,
} from "../../constants";
import base64 from "base64-js";
import fs from "fs";
import { execSync } from "child_process";
import uploadToBucket from "@/utils/uploadToBucket";
import db from "@/configs/firestore-config";
import { generateObject } from "ai";
import { openai, openaiModel } from "@/utils/openai";
import { google, googleModelAudio } from "@/utils/google";
import z from "zod";
import ffmpeg from "fluent-ffmpeg";

interface GenerateAudioParams {
  passage: string;
  articleId: string;
  isChapter?: boolean;
  chapterId?: string;
}

interface GenerateChapterAudioParams {
  passage: string; // Changed from 'content' to 'passage' to match Article structure
  storyId: string;
  chapterNumber: string;
}

function contentToSSML(content: string[]): string {
  let ssml = "<speak>";
  content.forEach((sentence, i) => {
    ssml += `<mark name='sentence${i + 1}'/>${sentence}`;
  });
  ssml += "</speak>";
  return ssml;
}

const generateSSML = async (article: string) => {
  try {
    //const prompt = `You are an SSML processing engine. Given the following text, break it into sentences and wrap each sentence in SSML tags. Add a <mark> tag before each sentence using the format <mark name='sentenceX'/> where X is the sentence number.\n\nHere is the text:\n---\n${article}\n---\n\nReturn only the SSML output, without explanations.`;
    const systemPrompt = `You are a text processor. Given an article, split it into individual sentences.
    Return only an array of strings, where each string is a complete sentence from the article.
    Preserve the original punctuation and formatting within each sentence.`;
    const userPrompt = `Split the following text into sentences: ${article}`;

    //and Add a <speak> tag before and end article only.
    const { object: ssml } = await generateObject({
      model: google(googleModelAudio),
      // schema: z
      //   .array(
      //     z.string().describe("A single complete sentence from the article")
      //   )
      //   .describe("Array of sentences extracted from the input article"),
      schema: z.object({
        input: z
          .object({
            article: z
              .string()
              .min(10)
              .describe(
                "The input article as a string. Must be at least 10 characters long."
              ),
          })
          .describe("The input object containing the article to be processed."),

        output: z
          .object({
            sentences: z
              .array(z.string().min(1))
              .describe(
                "An array of sentences extracted from the article. Each sentence must be a non-empty string."
              ),
          })
          .describe("The output object containing the extracted sentences."),
      }),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.2,
    });

    return ssml.output.sentences;
  } catch (error: any) {
    throw `failed to generate ssml: ${error}`;
  }
};

async function splitTextIntoChunks(
  content: string,
  maxBytes: number
): Promise<{ sentences: string[]; chunks: string[] }> {
  // const sentences = splitTextIntoSentences(content);
  const sentences = await generateSSML(content);
  const chunks: string[] = [];
  let currentChunk: string[] = [];

  sentences.forEach((sentence, index) => {
    currentChunk.push(sentence);
    const ssml = contentToSSML(currentChunk);

    if (new TextEncoder().encode(ssml).length > maxBytes) {
      currentChunk.pop();
      chunks.push(contentToSSML(currentChunk));
      currentChunk = [sentence];
    }

    if (index === sentences.length - 1 && currentChunk.length > 0) {
      chunks.push(contentToSSML(currentChunk));
    }
  });

  return { sentences, chunks };
}

// Get the duration of an audio file
function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

// Function to merge multiple MP3 files
function mergeAudioFiles(files: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg();
    files.forEach((file) => command.input(file));

    command
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .mergeToFile(outputPath, `${process.cwd()}/data/audios`);
  });
}

export async function generateAudio({
  passage,
  articleId,
  isChapter = false,
  chapterId,
  userId = "",
}: GenerateAudioParams & {
  isUserGenerated?: boolean;
  userId?: string;
}): Promise<any[]> {
  try {
    const voice =
      AVAILABLE_VOICES[Math.floor(Math.random() * AVAILABLE_VOICES.length)];
    const newVoice =
      NEW_MODEL_VOICES[Math.floor(Math.random() * NEW_MODEL_VOICES.length)];

    const { sentences, chunks } = await splitTextIntoChunks(passage, 5000);
    let currentIndex = 0;
    let cumulativeTime = 0;

    const result: Array<{
      markName: string;
      timeSeconds: number;
      index: number;
      file: string;
      sentences: string;
    }> = [];
    [];
    const audioPaths: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const ssml = chunks[i];
      const response = await fetch(
        `${BASE_TEXT_TO_SPEECH_URL}/v1beta1/text:synthesize?key=${process.env.GOOGLE_TEXT_TO_SPEECH_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: {
              ssml: ssml,
            },
            voice: {
              languageCode: "en-US",
              name: voice,
            },
            audioConfig: {
              audioEncoding: "MP3",
            },
            enableTimePointing: ["SSML_MARK"],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      const audio = data.audioContent;
      const MP3 = base64.toByteArray(audio);

      const localPath = `${process.cwd()}/data/audios/${articleId}_${i}.mp3`;
      fs.writeFileSync(localPath, MP3);
      audioPaths.push(localPath);

      // Process timepoints and build the result array
      data.timepoints.forEach((tp: any) => {
        result.push({
          markName: `sentence${currentIndex++}`,
          timeSeconds: tp.timeSeconds + cumulativeTime,
          index: currentIndex - 1,
          file: `${articleId}.mp3`, // Final combined file name
          sentences: sentences[currentIndex - 1],
        });
      });

      // Update the cumulative time with the duration of the current chunk
      // const chunkDuration = data.timepoints[data.timepoints.length - 1]?.timeSeconds || 0;
      const chunkDuration = await getAudioDuration(localPath);
      cumulativeTime += chunkDuration;
    }

    // Combine MP3 files using FFmpeg
    const combinedAudioPath = `${process.cwd()}/data/audios/${articleId}.mp3`;
    await mergeAudioFiles(audioPaths, combinedAudioPath);

    // Cleanup
    audioPaths.forEach((p) => fs.unlinkSync(p));

    await uploadToBucket(combinedAudioPath, `${AUDIO_URL}/${articleId}.mp3`);

    //update using Prisma
    const { prisma } = await import("@/lib/prisma");
    try {
      if (isChapter && chapterId) {
        // For chapters, don't update database here, just return the result
        // The caller will handle the database update
      } else {
        await prisma.article.update({
          where: { id: articleId },
          data: {
            sentences: result,
            audioUrl: `${articleId}.mp3`,
          },
        });
      }
    } catch (error) {
      console.log("Prisma update error:", error);
    }

    // Return the timepoints for stories to use
    return result;
  } catch (error: any) {
    console.log(error);
    throw `failed to generate audio: ${error} \n\n error: ${JSON.stringify(
      error.response?.data || error
    )}`;
  }
}

export async function generateChapterAudio({
  passage, // Changed from 'content' to 'passage'
  storyId,
  chapterNumber,
}: GenerateChapterAudioParams): Promise<void> {
  try {
    const voice =
      AVAILABLE_VOICES[Math.floor(Math.random() * AVAILABLE_VOICES.length)];
    const newVoice =
      NEW_MODEL_VOICES[Math.floor(Math.random() * NEW_MODEL_VOICES.length)];

    const { sentences, chunks } = await splitTextIntoChunks(passage, 5000);
    let currentIndex = 0;
    let cumulativeTime = 0;

    const result: Array<{
      markName: string;
      timeSeconds: number;
      index: number;
      file: string;
      sentences: string;
    }> = [];
    [];
    const audioPaths: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const ssml = chunks[i];
      const response = await fetch(
        `${BASE_TEXT_TO_SPEECH_URL}/v1beta1/text:synthesize?key=${process.env.GOOGLE_TEXT_TO_SPEECH_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: {
              ssml: ssml,
            },
            voice: {
              languageCode: "en-US",
              name: voice,
            },
            audioConfig: {
              audioEncoding: "MP3",
            },
            enableTimePointing: ["SSML_MARK"],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      const audio = data.audioContent;
      const MP3 = base64.toByteArray(audio);

      const localPath = `${process.cwd()}/data/tts/${storyId}-${chapterNumber}_${i}.mp3`;
      fs.writeFileSync(localPath, MP3);
      audioPaths.push(localPath);

      // Process timepoints and build the result array
      data.timepoints.forEach((tp: any) => {
        result.push({
          markName: `sentence${currentIndex++}`,
          timeSeconds: tp.timeSeconds + cumulativeTime,
          index: currentIndex - 1,
          file: `${storyId}-${chapterNumber}.mp3`, // Final combined file name
          sentences: sentences[currentIndex - 1],
        });
      });

      // Update the cumulative time with the duration of the current chunk
      // const chunkDuration = data.timepoints[data.timepoints.length - 1]?.timeSeconds || 0;
      const chunkDuration = await getAudioDuration(localPath);
      cumulativeTime += chunkDuration;
    }

    // Combine MP3 files using FFmpeg
    const combinedAudioPath = `${process.cwd()}/data/audios/${storyId}-${chapterNumber}.mp3`;
    await mergeAudioFiles(audioPaths, combinedAudioPath);

    // Cleanup
    audioPaths.forEach((p) => fs.unlinkSync(p));

    await uploadToBucket(
      combinedAudioPath,
      `${AUDIO_URL}/${storyId}-${chapterNumber}.mp3`
    );

    // Update the database with all timepoints

    await db
      .collection("stories")
      .doc(storyId)
      .collection("timepoints")
      .doc(chapterNumber)
      .set({
        timepoints: result,
        id: storyId,
        chapterNumber: chapterNumber,
      });
  } catch (error: any) {
    console.log(error);
    // throw `failed to generate audio: ${error} \n\n error: ${JSON.stringify(
    //   error.response.data
    // )}`;
  }
}
