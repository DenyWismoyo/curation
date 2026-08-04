import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { z } from "zod";
import OpenAI from "openai";

const deepseekApiKeySecret = defineSecret("DEEPSEEK_API_KEY");

const generatePromptSchema = z.object({
  coreStory: z.string().trim().min(5),
  sceneDescription: z.string().trim().min(2),
  previousPrompt: z.string().nullable().optional(),
  visualStyle: z.string().trim().min(2),
});

export const generateScenePrompt = onCall(
  {
    region: "asia-southeast2",
    secrets: [deepseekApiKeySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }

    try {
      const { coreStory, sceneDescription, previousPrompt, visualStyle } =
        generatePromptSchema.parse(request.data);

      const openai = new OpenAI({
        apiKey: deepseekApiKeySecret.value(),
        baseURL: "https://api.deepseek.com",
      });

      const systemPrompt = `You are an expert cinematographer and AI video prompt engineer. Your job is to create highly detailed, vivid video generation prompts.
You will be provided with:
1. Core Story: The overarching narrative.
2. Visual Style: The desired aesthetic (e.g., cinematic, 35mm, specific lighting).
3. Previous Scene Prompt (Optional): The prompt generated for the immediately preceding scene.
4. Current Scene Description: What happens in this exact scene.

Your task:
Write a single, highly detailed prompt paragraph (around 50-100 words) for an AI video generator (like Sora, Midjourney+Runway, etc.) for the Current Scene.
CRITICAL: If a Previous Scene Prompt is provided, you MUST ensure visual and character continuity. Use the same descriptors for the main subjects and environment to keep the visual look consistent.
DO NOT include conversational text, only the prompt itself. Do not wrap in quotes. End with the visual style descriptors.`;

      let userMessage = `Core Story: ${coreStory}\nVisual Style: ${visualStyle}\n`;
      if (previousPrompt) {
        userMessage += `Previous Scene Prompt: ${previousPrompt}\n`;
      }
      userMessage += `Current Scene Description: ${sceneDescription}\n\nGenerate the video prompt now:`;

      const completion = await openai.chat.completions.create({
        model: "deepseek-chat", // DeepSeek V4 Pro / DeepSeek V3 equivalent
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
      });

      const generatedPrompt = completion.choices[0]?.message?.content?.trim();

      if (!generatedPrompt) {
        throw new Error("Failed to generate prompt from AI.");
      }

      return {
        success: true,
        prompt: generatedPrompt,
      };
    } catch (error: any) {
      console.error("Error generating scene prompt:", error);
      throw new HttpsError("internal", error.message || "Unknown error occurred.");
    }
  }
);

const generateFullStoryboardSchema = z.object({
  title: z.string().trim().min(3),
  summary: z.string().trim().min(5),
  numScenes: z.number().min(1).max(20),
  durationPerScene: z.number().min(1).max(60).default(7),
});

export const generateFullStoryboard = onCall(
  {
    region: "asia-southeast2",
    secrets: [deepseekApiKeySecret],
    cors: true,
    timeoutSeconds: 300, // Karena proses generate banyak scene butuh waktu lama
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }

    try {
      const { title, summary, numScenes, durationPerScene } =
        generateFullStoryboardSchema.parse(request.data);

      const openai = new OpenAI({
        apiKey: deepseekApiKeySecret.value(),
        baseURL: "https://api.deepseek.com", // Jika Deepseek V3/V4 Pro support JSON mode via beta url, gunakan standar.
      });

      const systemPrompt = `You are an expert cinematographer, director, and AI video prompt engineer. Your job is to generate a full storyboard for a short video.
You will receive a title, a short summary, the desired number of scenes, and the duration per scene.

You MUST respond strictly with a valid JSON object matching this schema:
{
  "coreStory": "A 2-3 sentence overarching narrative based on the summary.",
  "visualStyle": "A detailed visual style (e.g. Cinematic, 35mm lens, photorealistic, moody lighting).",
  "scenes": [
    {
      "sceneNumber": 1, // incremental integer
      "description": "What happens in this scene, pacing adjusted for the given duration.",
      "prompt": "Highly detailed video generation prompt for AI (Sora/Runway/Midjourney). Must include the visual style descriptors and ensure visual consistency with previous scenes. Do NOT use conversational text.",
      "voiceoverText": "Narasi atau dialog pengisi suara (Voiceover) dalam bahasa Indonesia yang sesuai dengan adegan ini. Biarkan kosong jika tidak ada suara."
    }
  ]
}`;

      const userMessage = `Title: ${title}\nSummary: ${summary}\nNumber of Scenes: ${numScenes}\nDuration per Scene: ${durationPerScene} seconds\n\nGenerate the full storyboard in JSON format.`;

      const completion = await openai.chat.completions.create({
        model: "deepseek-chat", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const resultText = completion.choices[0]?.message?.content?.trim();

      if (!resultText) {
        throw new Error("Failed to generate storyboard from AI.");
      }

      // Pastikan parse JSON aman
      let parsedData;
      try {
        parsedData = JSON.parse(resultText);
      } catch (parseError) {
        console.error("Failed to parse JSON from AI:", resultText);
        throw new Error("AI returned invalid JSON format.");
      }

      return {
        success: true,
        data: parsedData,
      };
    } catch (error: any) {
      console.error("Error generating full storyboard:", error);
      throw new HttpsError("internal", error.message || "Unknown error occurred.");
    }
  }
);
