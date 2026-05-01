import { experimental_generateImage as generateImages } from "ai";
import uploadToBucket from "@/utils/uploadToBucket";
import fs from "fs";
import { IMAGE_URL } from "../../constants";
import { google, googleImages } from "@/utils/google";

interface GenerateImageParams {
  imageDesc: string;
  articleId: string;
}

export async function generateImage(
  params: GenerateImageParams,
  maxRetries = 5
): Promise<void> {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      //console.log(`Generating image (Attempt ${attempts + 1}/${maxRetries})`);

      const { image } = await generateImages({
        model: google.image(googleImages as any),
        prompt: params.imageDesc,
        providerOptions: {
          vertex: {
            aspectRatio: "1:1",
            personGeneration: "allow_all",
          },
        },
      });

      const base64 = image.base64;
      const base64Image: Buffer = Buffer.from(base64, "base64");

      const localPath = `${process.cwd()}/data/images/${params.articleId}.png`;
      fs.writeFileSync(localPath, base64Image as Uint8Array);

      await uploadToBucket(localPath, `${IMAGE_URL}/${params.articleId}.png`);

      //console.log("Image generation successful!");
      return;
    } catch (error) {
      console.error(
        `Failed to generate image (Attempt ${attempts + 1}):`,
        error
      );
      attempts++;

      if (attempts >= maxRetries) {
        throw new Error(
          `Failed to generate image after ${maxRetries} attempts: ${error}`
        );
      }

      const delay = Math.pow(2, attempts) * 1000;
      //console.log(`Retrying in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
