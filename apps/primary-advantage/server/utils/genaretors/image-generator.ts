import {
  experimental_generateImage as generateImages,
  generateObject,
  NoImageGeneratedError,
  APICallError,
  generateText,
} from "ai";
import { vertex } from "@ai-sdk/google-vertex";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { openai, openaiImages } from "@/utils/openai";
import { google, googleImage, googleModelLite } from "@/utils/google";
import { uploadToBucket } from "@/utils/storage";
import { z } from "zod";
import { Uploadable } from "openai/uploads";
import { createLogFile } from "../logging";

interface GenerateImageParams {
  imageDesc: string;
  articleId: string;
  passage: string;
}

interface GeneratedImageResult {
  success: boolean;
  imageUrls?: string[];
  error?: string;
}

export async function generateImage(
  params: GenerateImageParams,
  maxRetries = 5,
): Promise<GeneratedImageResult> {
  const { imageDesc, articleId, passage } = params;
  const errors: string[] = [];

  // Ensure the local images directory exists
  const imagesDir = path.join(process.cwd(), "data/images");
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const outDir = path.join(process.cwd(), "public/story");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Retry logic to ensure exactly 3 images are generated
  let attempts = 0;
  let generatedImages: string[] = [];

  while (attempts < maxRetries) {
    try {
      console.log(
        `Attempt ${attempts + 1}/${maxRetries} to generate 3 images for article ${articleId}`,
      );

      const { object: storyParts } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: z.object({
          prompt: z.array(z.string()),
          mainCharacter: z
            .string()
            .describe(
              "create a character description for a story, make it detailed and consistent",
            ),
        }),
        system:
          "You're a visual storyteller. Break a visual story into 3 image prompts.",
        prompt: `Create 3 consecutive image generation prompts based on this story: "${imageDesc}". Each should describe a moment continuing from the last. return only the prompts, is array of prompts.`,
      });

      const result = await generateText({
        model: google(googleImage),
        prompt: `Create a high-quality, stylistically consistent digital illustration that visually represents:
        Main character: ${storyParts.mainCharacter}

        following are the image descriptions:
        image 1: ${storyParts.prompt[0]}
        image 2: ${storyParts.prompt[1]}
        image 3: ${storyParts.prompt[2]}

        
        Style: brightly colored cartoon illustration, storybook style. Generate exactly 3 separate images, 1 image per file.`,
      });

      // Validate that exactly 3 files were generated
      if (!result.files || result.files.length !== 3) {
        const errorMsg = `Expected 3 images, but got ${result.files?.length || 0} images`;
        console.warn(errorMsg);
        errors.push(errorMsg);
        attempts++;

        // Add delay before retry
        if (attempts < maxRetries) {
          const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        continue;
      }

      // Process and save the 3 images
      generatedImages = [];
      const tempFiles: string[] = [];

      for (const [index, file] of result.files.entries()) {
        const base64Image: Buffer = Buffer.from(file.base64, "base64");
        const localPath = path.join(imagesDir, `${articleId}_${index + 1}.png`);
        fs.writeFileSync(localPath, base64Image as Uint8Array);
        tempFiles.push(localPath);

        await uploadToBucket(localPath, `images/${articleId}_${index + 1}.png`);
        generatedImages.push(`images/${articleId}_${index + 1}.png`);
      }

      // Clean up temporary local files after successful upload
      for (const tempFile of tempFiles) {
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupError) {
          console.warn(
            `Failed to clean up local file ${tempFile}:`,
            cleanupError,
          );
        }
      }

      console.log(
        `Successfully generated and saved 3 images for article ${articleId}`,
      );
      break; // Success - exit retry loop
    } catch (error) {
      const errorMsg = `Attempt ${attempts + 1} failed: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      attempts++;

      if (attempts < maxRetries) {
        const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Check final result
  if (generatedImages.length !== 3) {
    createLogFile(articleId, errors, "error");
    return {
      success: false,
      error: `Failed to generate exactly 3 images after ${maxRetries} attempts. Generated ${generatedImages.length} images. Errors: ${errors.join(", ")}`,
    };
  }
  // const baseImage = Buffer.from(result.files[0].base64, "base64");
  // const basePath = path.join(outDir, "characters.png");
  // fs.writeFileSync(basePath, baseImage);

  // for (const file of result.files) {
  //   if (file.type.startsWith("image/")) {
  //     // The file object provides multiple data formats:
  //     // Access images as base64 string, Uint8Array binary data, or check type
  //     // - file.base64: string (data URL format)
  //     // - file.uint8Array: Uint8Array (binary data)
  //     // - file.mediaType: string (e.g. "image/png")
  //   }
  // }

  // const promptsText = storyParts.text || "";
  // const promptList = promptsText.split(/\n+/).filter(Boolean);
  // Generate character sheet
  // const base = await openaiClient.images.generate({
  //   model: "dall-e-3",
  //   prompt: characterDescription,
  //   size: "1024x1024",
  //   response_format: "b64_json",
  // });

  // const baseImage = Buffer.from(base.data?.[0]?.b64_json!, "base64");
  // const basePath = path.join(outDir, "characters.png");
  // fs.writeFileSync(basePath, baseImage);

  // for (let i = 0; i < storyParts.prompt.length; i++) {
  //   // Check if file exists before proceeding
  //   if (!fs.existsSync(basePath)) {
  //     throw new Error(`Base image file not found at: ${basePath}`);
  //   }

  //   // Convert image to RGBA format using Sharp
  //   const rgbaBuffer = await sharp(basePath)
  //     .ensureAlpha() // Adds alpha channel if not present
  //     .png() // Ensure PNG format
  //     .toBuffer();

  //   // Create a proper File object with RGBA image
  //   const imageFile = new File([new Uint8Array(rgbaBuffer)], "characters.png", {
  //     type: "image/png",
  //   });

  //   const edit = await openaiClient.images.edit({
  //     model: "dall-e-2",
  //     prompt: `
  //       Use ${characterDescription} as the main character.
  //       Scene: ${storyParts.prompt[i]}
  //       Same cartoon storybook style as the base character sheet.
  //     `,
  //     size: "1024x1024",
  //     image: imageFile,
  //     response_format: "b64_json",
  //   });

  //   const img = Buffer.from(edit.data?.[0]?.b64_json!, "base64");
  //   const filePath = path.join(outDir, `scene${i + 1}.png`);
  //   fs.writeFileSync(filePath, img);
  // }

  // for (let i = 0; i < storyParts.prompt.length; i++) {
  //   const prompt = `Generate an illustration of the story: "${storyParts.prompt[i]}"`;
  //   const { image } = await generateImages({
  //     model: openai.image(openaiImages), // or "dall-e-2"
  //     n: 1,
  //     prompt: prompt,
  //     size: "1024x1024",
  //     seed: 2134567890,
  //   });

  //   const base64 = image.base64;
  //   const base64Image: Buffer = Buffer.from(base64, "base64");
  //   const localPath = path.join(imagesDir, `${articleId}_${i + 1}.png`);
  //   fs.writeFileSync(localPath, base64Image as Uint8Array);

  //   await uploadToBucket(localPath, `images/${articleId}_${i + 1}.png`);
  //   generatedImages.push(localPath);

  //   try {
  //     fs.unlinkSync(localPath);
  //   } catch (cleanupError) {
  //     console.warn(`Failed to clean up local file ${localPath}:`, cleanupError);
  //   }
  // }

  // const userPrompt = `Create a high-quality, stylistically consistent digital illustration that visually represents the following passage from an article:

  //   - **Image 1 (Beginning):** ${imageDesc[0]}
  //   - **Image 2 (Middle):** ${imageDesc[1]}
  //   - **Image 3 (End):** ${imageDesc[2]}

  // The image should capture the core theme, mood, and symbolism of the text. Use a clean, modern art style (e.g., digital painting or vector), with thoughtful composition and appropriate color tone. Avoid text. Ensure the image is visually engaging and conceptually aligned with the message of the passage.one image per one description.`;

  // const userPrompt = `Create three high-quality, stylistically identical digital illustrations that visually represent the following passage:

  // **START OF PASSAGE**

  // ${passage}

  // **END OF PASSAGE**

  // The three images must feature the **same central character or subject** and use an **identical artistic style** across all three outputs. The style must be a **clean, modern, detailed digital painting** with a smooth finish and a professional matte texture.

  // **CRITICAL COMPOSITION RULE:** Each generated image must be a **single, unified, full-frame composition**. **DO NOT** create a collage, triptych, grid, or split-panel image. Each file should contain one complete picture.

  // Capture the core theme, mood, and symbolism of the text using thoughtful composition and an appropriate color tone. Avoid all text and ensure the images are visually engaging and conceptually aligned with the message of the passage. **Same character, same style, single composition.**`;

  // try {
  //   const { images } = await generateImages({
  //     model: google.image(googleImages),
  //     n: 3,
  //     prompt: userPrompt,
  //     aspectRatio: "1:1",
  //   });

  //   for (const [index, image] of images.entries()) {
  //     const base64 = image.base64;
  //     const base64Image: Buffer = Buffer.from(base64, "base64");
  //     const localPath = path.join(imagesDir, `${articleId}_${index + 1}.png`);
  //     fs.writeFileSync(localPath, base64Image as Uint8Array);

  //     await uploadToBucket(localPath, `images/${articleId}_${index + 1}.png`);
  //     generatedImages.push(localPath);

  //     try {
  //       fs.unlinkSync(localPath);
  //     } catch (cleanupError) {
  //       console.warn(
  //         `Failed to clean up local file ${localPath}:`,
  //         cleanupError,
  //       );
  //     }
  //   }
  // } catch (error) {
  //   if (APICallError.isInstance(error)) {
  //     console.log("APICallError");
  //     console.log("Cause:", error.cause);
  //     console.log("Responses:", error);
  //   }
  //   console.error("Error generating image:", error);
  //   return {
  //     success: false,
  //     error: "Failed to generate image",
  //   };
  // }

  // try {
  //   const { images } = await generateImages({
  //     model: openai.image(openaiImages),
  //     n: 3,
  //     prompt: userPrompt,
  //     size: "1024x1024",
  //     seed: 2134567890,
  //   });

  //   for (const [index, image] of images.entries()) {
  //     const base64 = image.base64;
  //     const base64Image: Buffer = Buffer.from(base64, "base64");
  //     const localPath = path.join(imagesDir, `${articleId}_${index + 1}.png`);
  //     fs.writeFileSync(localPath, base64Image as Uint8Array);

  //     await uploadToBucket(localPath, `images/${articleId}_${index + 1}.png`);
  //     generatedImages.push(localPath);

  //     try {
  //       fs.unlinkSync(localPath);
  //     } catch (cleanupError) {
  //       console.warn(
  //         `Failed to clean up local file ${localPath}:`,
  //         cleanupError,
  //       );
  //     }
  //   }
  // } catch (error) {
  //   console.error("Error generating image:", error);
  //   if (NoImageGeneratedError.isInstance(error)) {
  //     console.log("NoImageGeneratedError");
  //     console.log("Cause:", error.cause);
  //     console.log("Responses:", error.responses);
  //   }
  //   return {
  //     success: false,
  //     error: "Failed to generate image",
  //   };
  // }

  // const base64 = image.base64;
  // const base64Image: Buffer = Buffer.from(base64, "base64");
  // const localPath = path.join(imagesDir, `${articleId}.png`);
  // fs.writeFileSync(localPath, base64Image as Uint8Array);
  // await uploadToBucket(localPath, `images/${articleId}.png`);
  // generatedImages.push(localPath);
  // try {
  //   fs.unlinkSync(localPath);
  // } catch (cleanupError) {
  //   console.warn(`Failed to clean up local file ${localPath}:`, cleanupError);
  // }

  return {
    success: true,
    imageUrls: generatedImages,
  };

  // Generate each image sequentially to avoid rate limits
  // for (let i = 0; i < imageDesc.length && i < 3; i++) {
  //   const prompt = imageDesc[i];
  //   const imageNumber = i + 1;
  //   const filename = `${articleId}_${imageNumber}.png`;

  //   let attempts = 0;
  //   let imageGenerated = false;

  //   while (attempts < maxRetries && !imageGenerated) {
  //     try {
  //       console.log(
  //         `Generating image ${imageNumber}/3 for article ${articleId}...`,
  //       );

  //       const { image } = await generateImages({
  //         model: openai.image(openaiImages),
  //         n: 1,
  //         prompt: prompt,
  //         size: "1024x1024",
  //         seed: 1,
  //       });

  //       const base64 = image.base64;
  //       const base64Image: Buffer = Buffer.from(base64, "base64");

  //       // Save locally
  //       const localPath = path.join(imagesDir, filename);
  //       fs.writeFileSync(localPath, base64Image as Uint8Array);

  //       // Upload to cloud storage
  //       const cloudPath = `images/${filename}`;
  //       await uploadToBucket(localPath, cloudPath);

  //       // Clean up local file after successful upload
  //       try {
  //         fs.unlinkSync(localPath);
  //       } catch (cleanupError) {
  //         console.warn(
  //           `Failed to clean up local file ${localPath}:`,
  //           cleanupError,
  //         );
  //       }

  //       generatedImages.push(cloudPath);
  //       imageGenerated = true;

  //       console.log(
  //         `Successfully generated image ${imageNumber}/3: ${filename}`,
  //       );

  //       // Add delay between requests to avoid rate limits
  //       if (i < imageDesc.length - 1) {
  //         await new Promise((resolve) => setTimeout(resolve, 1000));
  //       }
  //     } catch (error) {
  //       console.error(
  //         `Failed to generate image ${imageNumber} (Attempt ${attempts + 1}):`,
  //         error,
  //       );
  //       attempts++;

  //       if (attempts >= maxRetries) {
  //         const errorMessage = `Failed to generate image ${imageNumber} after ${maxRetries} attempts: ${error}`;
  //         errors.push(errorMessage);
  //         console.error(errorMessage);
  //         break;
  //       }

  //       // Exponential backoff
  //       const delay = Math.pow(2, attempts) * 1000;
  //       await new Promise((resolve) => setTimeout(resolve, delay));
  //     }
  //   }
  // }

  // // Return result based on success/failure
  // if (generatedImages.length === 0) {
  //   return {
  //     success: false,
  //     error: `Failed to generate any images. Errors: ${errors.join(", ")}`,
  //   };
  // }

  // if (errors.length > 0) {
  //   console.warn(`Some images failed to generate: ${errors.join(", ")}`);
  // }

  // return {
  //   success: true,
  //   imageUrls: generatedImages,
  // };

  // if (NoImageGeneratedError.isInstance(error)) {
  //   console.log('NoImageGeneratedError');
  //   console.log('Cause:', error.cause);
  //   console.log('Responses:', error.responses);
  // }
}
