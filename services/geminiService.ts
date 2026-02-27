import { GenerateContentResponse, GoogleGenAI, Type } from "@google/genai";
import { Scene, ScriptData, Shot } from "../types";
import { PROMPT_TEMPLATES } from "./promptTemplates";

// Module-level variable to store the key at runtime
let runtimeApiKey: string = "";

export const setApiKey = (key: string) => {
  runtimeApiKey = key;
};

// Helper to get a fresh client instance to ensure latest API key is used
const getAiClient = () => {
  if (!runtimeApiKey) throw new Error("API Key missing. Please configure your Gemini API Key.");
  return new GoogleGenAI({ apiKey: runtimeApiKey });
};

// Helper for retry logic on 429 errors
const retryOperation = async <T>(operation: () => Promise<T>, maxRetries: number = 1, baseDelay: number = 2000): Promise<T> => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (e: any) {
      lastError = e;
      // Check for quota/rate limit errors (429)
      if (e.status === 429 || e.code === 429 || e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('RESOURCE_EXHAUSTED')) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`Hit rate limit, retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw e; // Throw other errors immediately
    }
  }
  throw lastError;
};

// Helper to clean JSON string from Markdown fences or accidental text
const cleanJsonString = (str: string): string => {
  if (!str) return "{}";
  // Remove ```json ... ``` or ``` ... ```
  let cleaned = str.replace(/```json\n?/g, '').replace(/```/g, '');
  return cleaned.trim();
};

/**
 * Agent 1 & 2: Script Structuring & Breakdown
 * Uses gemini-2.5-flash for fast, structured text generation.
 */
export const parseScriptToData = async (rawText: string, language: string = '中文'): Promise<ScriptData> => {
  const ai = getAiClient();
  const prompt = PROMPT_TEMPLATES.PARSE_SCRIPT(rawText, language);

  const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192, 
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          genre: { type: Type.STRING },
          logline: { type: Type.STRING },
          characters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                gender: { type: Type.STRING },
                age: { type: Type.STRING },
                personality: { type: Type.STRING }
              },
              required: ["id", "name", "gender", "age", "personality"]
            }
          },
          scenes: {
             type: Type.ARRAY,
             items: {
               type: Type.OBJECT,
               properties: {
                 id: { type: Type.STRING },
                 location: { type: Type.STRING },
                 time: { type: Type.STRING },
                 atmosphere: { type: Type.STRING }
               },
               required: ["id", "location", "time", "atmosphere"]
             }
          },
          storyParagraphs: {
             type: Type.ARRAY,
             items: {
               type: Type.OBJECT,
               properties: {
                 id: { type: Type.NUMBER },
                 text: { type: Type.STRING },
                 sceneRefId: { type: Type.STRING }
               },
               required: ["id", "text", "sceneRefId"]
             }
          }
        },
        required: ["title", "genre", "logline", "characters", "scenes", "storyParagraphs"]
      }
    }
  }));

  let parsed: any = {};
  try {
    const text = cleanJsonString(response.text || "{}");
    parsed = JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse script data JSON:", e);
    parsed = {};
  }
  
  // Enforce String IDs for consistency and init variations
  const characters = Array.isArray(parsed.characters) ? parsed.characters.map((c: any) => ({
    ...c, 
    id: String(c.id),
    variations: [] // Initialize empty variations
  })) : [];
  const scenes = Array.isArray(parsed.scenes) ? parsed.scenes.map((s: any) => ({...s, id: String(s.id)})) : [];
  const storyParagraphs = Array.isArray(parsed.storyParagraphs) ? parsed.storyParagraphs.map((p: any) => ({...p, sceneRefId: String(p.sceneRefId)})) : [];

  return {
    title: parsed.title || "未命名剧本",
    genre: parsed.genre || "剧情片",
    logline: parsed.logline || "",
    language: language,
    characters,
    scenes,
    storyParagraphs
  };
};

/**
 * 为单个场景生成镜头清单
 * @param scriptData - 剧本数据
 * @param scene - 场景数据
 * @param index - 场景索引
 */
export const generateShotListForScene = async (
  scriptData: ScriptData,
  scene: Scene,
  index: number
): Promise<Shot[]> => {
  const ai = getAiClient();
  const lang = scriptData.language || '中文';

  const paragraphs = scriptData.storyParagraphs
    .filter(p => String(p.sceneRefId) === String(scene.id))
    .map(p => p.text)
    .join('\n');

  if (!paragraphs.trim()) return [];

  const prompt = PROMPT_TEMPLATES.GENERATE_SHOTS(
    index,
    scene,
    paragraphs,
    scriptData.genre,
    scriptData.targetDuration || "Standard",
    scriptData.characters,
    lang
  );

  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              sceneId: { type: Type.STRING },
              actionSummary: { type: Type.STRING },
              dialogue: { type: Type.STRING, description: "本镜头中的台词。若无台词则留空。" },
              cameraMovement: { type: Type.STRING },
              shotSize: { type: Type.STRING, description: "例如：广角镜头、特写镜头" },
              characters: { type: Type.ARRAY, items: { type: Type.STRING } },
              keyframes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["start", "end"] },
                    visualPrompt: { type: Type.STRING, description: "详细的中文视觉描述" }
                  },
                  required: ["id", "type", "visualPrompt"]
                }
              }
            },
            required: ["sceneId", "actionSummary", "cameraMovement", "shotSize", "characters", "keyframes"]
          }
        }
      }
    }));

    const text = cleanJsonString(response.text || "[]");
    const shots = JSON.parse(text);

    // FIX: Explicitly override the sceneId to match the source scene
    // This prevents the AI from hallucinating incorrect scene IDs
    const validShots = Array.isArray(shots) ? shots : [];
    return validShots.map(s => ({
      ...s,
      sceneId: String(scene.id) // Force String
    }));

  } catch (e) {
    console.error(`Failed to generate shots for scene ${scene.id}`, e);
    return [];
  }
};

export const generateShotList = async (scriptData: ScriptData): Promise<Shot[]> => {
  if (!scriptData.scenes || scriptData.scenes.length === 0) {
    return [];
  }

  // Process scenes sequentially (Batch Size 1) to strictly minimize rate limits
  const BATCH_SIZE = 1;
  const allShots: Shot[] = [];

  for (let i = 0; i < scriptData.scenes.length; i += BATCH_SIZE) {
    // Add delay between batches
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 1500));

    const batch = scriptData.scenes.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((scene, idx) => generateShotListForScene(scriptData, scene, i + idx))
    );
    batchResults.forEach(shots => allShots.push(...shots));
  }

  // Re-index shots to be sequential globally and set initial status
  return allShots.map((s, idx) => ({
    ...s,
    id: `shot-${idx + 1}`,
    keyframes: Array.isArray(s.keyframes) ? s.keyframes.map(k => ({ 
      ...k, 
      id: `kf-${idx + 1}-${k.type}`, // Normalized ID
      status: 'pending' 
    })) : []
  }));
};

/**
 * Agent 0: Script Generation from simple prompt
 * 根据简单提示词生成完整剧本
 */
export const generateScript = async (
  prompt: string,
  genre: string = "剧情片",
  targetDuration: string = "60s",
  language: string = "中文"
): Promise<string> => {
  const ai = getAiClient();

  const generationPrompt = PROMPT_TEMPLATES.GENERATE_SCRIPT(prompt, targetDuration, genre, language);

  const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: generationPrompt,
    config: {
      systemInstruction: PROMPT_TEMPLATES.SYSTEM_SCREENWRITER,
      maxOutputTokens: 8192,
    }
  }));

  return (response.text || "").trim();
};

/**
 * Agent 3: Visual Design (Prompt Generation)
 */
export const generateVisualPrompts = async (prompt: string): Promise<string> => {
   const ai = getAiClient();
   const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
     model: 'gemini-2.5-flash',
     contents: prompt,
     config: {
      systemInstruction: PROMPT_TEMPLATES.SYSTEM_VISUAL_DESIGNER,
      maxOutputTokens: 8192,
     }
   }));
   return (response.text || "").trim();
};

/**
 * Agent 4 & 6: Image Generation
 */
export const generateImage = async (prompt: string, referenceImages: string[] = [],
    imageType: string = "character",
  localStyle: string = "真人写实",
  imageSize: string = "2560x1440",
  imageCount: number = 1
): Promise<string> => {
  const ai = getAiClient();

  // If we have reference images, instruct the model to use them for consistency
  let finalPrompt = prompt;

  const parts: any[] = [{ text: finalPrompt }];

  // Attach reference images as inline data
  referenceImages.forEach((imgUrl) => {
    // Parse the data URL to get mimeType and base64 data
    const match = imgUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
    }
  });

  const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-image', // Nano Banana
    contents: {
      parts: parts
    }
  }));

  // Extract base64 image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("图片生成失败 (No image data returned)");
};

/**
 * Agent 8: Video Generation
 * Supports Start Image -> Video OR Start Image + End Image -> Video
 */
export const generateVideo = async (prompt: string, startImageBase64?: string, endImageBase64?: string,full_frame:boolean=false): Promise<string> => {
  const ai = getAiClient();
  const apiKey = runtimeApiKey; // Use runtime key
  
  // Clean base64 strings
  const cleanStart = startImageBase64?.replace(/^data:image\/(png|jpeg|jpg);base64,/, '') || '';
  const cleanEnd = endImageBase64?.replace(/^data:image\/(png|jpeg|jpg);base64,/, '') || '';

  const config: any = {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
  };

  // If end frame is provided, use lastFrame config
  if (cleanEnd && !full_frame) {
      config.lastFrame = {
        imageBytes: cleanEnd,
        mimeType: 'image/png'
      };
  }

  let operation = await retryOperation<any>(() => ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    image: startImageBase64 ? {
      imageBytes: cleanStart,
      mimeType: 'image/png'
    } : undefined,
    config: config
  }));

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("视频生成失败 (Video generation failed)");
  
  // Note: The URI requires the API key appended to fetch the binary
  return `${videoUri}&key=${apiKey}`;
};