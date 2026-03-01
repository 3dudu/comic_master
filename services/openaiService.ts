// services/openaiService.ts

import { ScriptData, Shot } from "../types";
import { PROMPT_TEMPLATES } from "./promptTemplates";

// OpenAI 配置
const OPENAI_CONFIG = {
  // 文本生成模型
  TEXT_MODEL: "gpt-4-turbo-preview",

  // 图片生成模型
  IMAGE_MODEL: "dall-e-3",

  // 视频生成模型（Sora）
  VIDEO_MODEL: "sora-1.0-turbo",

  // API 端点
  API_ENDPOINT: "https://api.openai.com/v1",
};

// Module-level variable to store key at runtime
let runtimeApiKey: string = process.env.OPENAI_API_KEY || "";
let runtimeApiUrl: string = OPENAI_CONFIG.API_ENDPOINT;

// Runtime model names (can be overridden by config)
let runtimeTextModel: string = OPENAI_CONFIG.TEXT_MODEL;
let runtimeImageModel: string = OPENAI_CONFIG.IMAGE_MODEL;
let runtimeVideoModel: string = OPENAI_CONFIG.VIDEO_MODEL;

export const setApiKey = (key: string) => {
  runtimeApiKey = key ? key : process.env.OPENAI_API_KEY;
};

export const setApiUrl = (url: string) => {
  runtimeApiUrl = url || OPENAI_CONFIG.API_ENDPOINT;
};

export const setModel = (modelType: 'text' | 'image' | 'video', modelName: string) => {
  switch (modelType) {
    case 'text':
      runtimeTextModel = modelName || OPENAI_CONFIG.TEXT_MODEL;
      break;
    case 'image':
      runtimeImageModel = modelName || OPENAI_CONFIG.IMAGE_MODEL;
      break;
    case 'video':
      runtimeVideoModel = modelName || OPENAI_CONFIG.VIDEO_MODEL;
      break;
  }
};

// Helper for authentication headers
const getAuthHeaders = () => {
  return {
    "Authorization": `Bearer ${runtimeApiKey}`,
    "Content-Type": "application/json",
  };
};

// Helper for retry logic
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 1,
  baseDelay: number = 2000
): Promise<T> => {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (e: any) {
      lastError = e;
      // Check for quota/rate limit errors (429)
      if (
        e.status === 429 ||
        e.code === 429 ||
        e.message?.includes("429") ||
        e.message?.includes("quota") ||
        e.message?.includes("RATE_LIMIT")
      ) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(
          `Hit rate limit, retrying in ${delay}ms... (Attempt ${
            i + 1
          }/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
};

// Helper to make HTTP requests to OpenAI API
const fetchWithRetry = async (
  endpoint: string,
  options: RequestInit,
  retries: number = 1
): Promise<any> => {
  return retryOperation(async () => {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `API Error (${response.status}): ${error.error?.message || error.message}`
      );
    }

    return response.json();
  }, retries);
};

// Helper to clean JSON string from Markdown fences
const cleanJsonString = (str: string): string => {
  if (!str) return "{}";
  // Remove ```json ... ``` or ``` ... ```
  let cleaned = str.replace(/```json\n?/g, "").replace(/```/g, "");
  return cleaned.trim();
};

/**
 * Agent 1 & 2: Script Structuring & Breakdown
 * Uses OpenAI GPT-4 for high-quality script analysis
 */
export const parseScriptToData = async (
  rawText: string,
  language: string = "中文"
): Promise<ScriptData> => {
  const endpoint = `${runtimeApiUrl}/chat/completions`;

  const prompt = PROMPT_TEMPLATES.PARSE_SCRIPT(rawText, language);

  const response =  await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify({
      model: runtimeTextModel,
      messages: [
        {
          role: "system",
          content: PROMPT_TEMPLATES.SYSTEM_SCRIPT_ANALYZER,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });

  const content = response.choices?.[0]?.message?.content || "{}";

  let parsed: any = {};
  try {
    const text = cleanJsonString(content);
    //console.log("Parsed JSON:", text);
    parsed = JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse script data JSON:", e);
    parsed = {};
  }

  // Enforce String IDs for consistency and init variations
  const characters = Array.isArray(parsed.characters)
    ? parsed.characters.map((c: any) => ({
        ...c,
        id: String(c.id),
        variations: [],
      }))
    : [];
  const scenes = Array.isArray(parsed.scenes)
    ? parsed.scenes.map((s: any) => ({ ...s, id: String(s.id) }))
    : [];
  const storyParagraphs = Array.isArray(parsed.storyParagraphs)
    ? parsed.storyParagraphs.map((p: any) => ({
        ...p,
        sceneRefId: String(p.sceneRefId),
      }))
    : [];

  return {
    title: parsed.title || "未命名剧本",
    genre: parsed.genre || "剧情片",
    logline: parsed.logline || "",
    language: language,
    characters,
    scenes,
    storyParagraphs,
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
  scene: any,
  index: number
): Promise<Shot[]> => {
  const lang = scriptData.language || "中文";

  const paragraphs = scriptData.storyParagraphs
    .filter((p) => String(p.sceneRefId) === String(scene.id))
    .map((p) => p.text)
    .join("\n");

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
    const endpoint = `${runtimeApiUrl}/chat/completions`;
    const response = await fetchWithRetry(endpoint, {
      method: "POST",
      body: JSON.stringify({
        model: runtimeTextModel,
        messages: [
          {
            role: "system",
            content: PROMPT_TEMPLATES.SYSTEM_PHOTOGRAPHER,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    const content = response.choices?.[0]?.message?.content || "[]";
    const shots = JSON.parse(cleanJsonString(content));

    const validShots = Array.isArray(shots) ? shots : [];
    return validShots.map((s: any) => ({
      ...s,
      sceneId: String(scene.id),
    }));
  } catch (e) {
    console.error(`Failed to generate shots for scene ${scene.id}`, e);
    return [];
  }
};

export const generateShotList = async (
  scriptData: ScriptData
): Promise<Shot[]> => {
  if (!scriptData.scenes || scriptData.scenes.length === 0) {
    return [];
  }

  // Process scenes sequentially
  const BATCH_SIZE = 1;
  const allShots: Shot[] = [];

  for (let i = 0; i < scriptData.scenes.length; i += BATCH_SIZE) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 1000));

    const batch = scriptData.scenes.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((scene, idx) => generateShotListForScene(scriptData, scene, i + idx))
    );
    batchResults.forEach((shots) => allShots.push(...shots));
  }

  // Re-index shots to be sequential globally
  return allShots.map((s, idx) => ({
    ...s,
    id: `shot-${idx + 1}`,
    keyframes: Array.isArray(s.keyframes)
      ? s.keyframes.map((k: any) => ({
          ...k,
          id: `kf-${idx + 1}-${k.type}`,
          status: "pending",
        }))
      : [],
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
  const endpoint = `${runtimeApiUrl}/chat/completions`;

  const generationPrompt = PROMPT_TEMPLATES.GENERATE_SCRIPT(prompt, targetDuration, genre, language);

  const response =  await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify({
      model: runtimeTextModel,
      messages: [
        {
          role: "system",
          content: PROMPT_TEMPLATES.SYSTEM_SCREENWRITER,
        },
        {
          role: "user",
          content: generationPrompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 4096,
    }),
  });

  const content = response.choices?.[0]?.message?.content || "";
  return content.trim();
};

/**
 * Agent 3: Visual Design (Prompt Generation)
 */
export const generateVisualPrompts = async (
  prompt: string
): Promise<string> => {
  const endpoint = `${runtimeApiUrl}/chat/completions`;
  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify({
      model: runtimeTextModel,
      messages: [
        {
            role: "system",
            content: PROMPT_TEMPLATES.SYSTEM_VISUAL_DESIGNER,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 500,
    }),
  });

  return response.choices?.[0]?.message?.content || "";
};

/**
 * Agent 4 & 6: Image Generation
 * Uses OpenAI DALL-E 3
 */
export const generateImage = async (
  prompt: string,
  referenceImages: string[] = [],
  imageType: string = "character",
  localStyle: string = "真人写实",
  imageSize: string = "2560x1440",
  imageCount: number = 1
): Promise<string> => {
  const endpoint = `${runtimeApiUrl}/images/generations`;

  // 转换尺寸格式：2560x1440 -> 1024x1024 (DALL-E 3 标准)
  const sizeMap: Record<string, string> = {
    "1728x2304": "1024x1792",
    "2560x1440": "1024x1024",
    "1440x2560": "1024x1024",
  };
  const dallE3Size = sizeMap[imageSize] || "1024x1024";

  // 构建提示词
  let finalPrompt = prompt;

  const requestBody: any = {
    model: runtimeImageModel,
    prompt: finalPrompt,
    n: 1,
    size: dallE3Size,
    quality: "standard",
    response_format: "url",
  };

  // 如果有参考图片，可以添加到提示词中（DALL-E 3 不直接支持参考图）
  if (referenceImages.length > 0) {
    console.warn("DALL-E 3 不直接支持参考图片，将尝试在提示词中描述");
  }

  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  // 提取图片 URL
  if (response.data && response.data.length > 0) {
    return response.data[0].url;
  } else {
    throw new Error("图片生成失败");
  }
};

/**
 * Agent 8: Video Generation
 * Uses OpenAI Sora (note: Sora API availability may vary)
 */
export const generateVideo = async (
  prompt: string,
  startImageBase64?: string,
  endImageBase64?: string,
  duration: number = 5,
  full_frame: boolean = false
): Promise<string> => {
  const endpoint = `${runtimeApiUrl}/videos/generations`;

  const requestBody: any = {
    model: runtimeVideoModel,
    prompt: prompt,
    duration: Math.min(Math.max(duration, 1), 10), // Sora supports 1-10 seconds
    aspect_ratio: "16:9",
  };

  // 处理起始图片（如果 Sora 支持）
  if (startImageBase64) {
    requestBody.image = startImageBase64;
  }

  // OpenAI Sora 目前可能不支持结束图片参数
  // 这里保留接口以备将来使用
  if (endImageBase64 && !full_frame) {
    console.warn("OpenAI Sora 当前可能不支持结束图片参数");
  }

  //console.log('调用 OpenAI Sora 视频生成:', requestBody);

  try {
    const response = await fetchWithRetry(endpoint, {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    // Sora 可能返回异步任务 ID
    if (response.id) {
      // 如果返回任务 ID，需要轮询获取结果
      return await pollVideoTask(response.id);
    } else if (response.video_url || response.url) {
      // 如果直接返回视频 URL
      return response.video_url || response.url;
    } else {
      throw new Error("OpenAI 未返回视频数据");
    }
  } catch (error) {
    console.error('OpenAI Sora 视频生成失败:', error);
    throw error;
  }
};

/**
 * 轮询视频生成任务
 * @param taskId - 任务ID
 * @returns - 视频URL
 */
const pollVideoTask = async (taskId: string): Promise<string> => {
  const endpoint = `${runtimeApiUrl}/videos/generations/${taskId}`;
  const maxAttempts = 120; // 最多轮询10分钟（每5秒）
  const pollInterval = 10000; // 5秒

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    try {
      const response = await fetchWithRetry(endpoint, {
        method: "GET",
      });

      const status = response.status;

      if (status === "succeeded" || status === "completed") {
        const videoUrl = response.video_url || response.url;
        if (videoUrl) {
          //console.log('OpenAI Sora 视频生成成功:', videoUrl);
          return videoUrl;
        }
      } else if (status === "failed") {
        const errorMsg = response.error || "未知错误";
        throw new Error(`OpenAI Sora 视频生成失败: ${errorMsg}`);
      } else if (status === "processing" || status === "queued") {
        //console.log(`OpenAI Sora 视频生成中... (${i + 1}/${maxAttempts})`);
        continue;
      }
    } catch (error) {
      if (i === maxAttempts - 1) {
        throw error;
      }
      console.warn(`OpenAI Sora 查询任务状态失败 (尝试 ${i + 1}/${maxAttempts}):`, error);
    }
  }

  throw new Error("OpenAI Sora 视频生成超时");
};
