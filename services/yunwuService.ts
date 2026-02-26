// services/yunwuService.ts

import { ScriptData, Shot } from "../types";
import { PROMPT_TEMPLATES } from "./promptTemplates";

// 云雾API配置
const YUNWU_CONFIG = {
  // 文本生成模型
  TEXT_MODEL: "gemini-2.5-pro",

  // 图片生成模型（待添加）
  IMAGE_MODEL: "gemini-2.5-flash-image",

  // 视频生成模型（待添加）
  VIDEO_MODEL: "veo-3.1-fast-generate-preview",

  // API 端点
  API_ENDPOINT: "https://yunwu.ai",
};

// Module-level variable to store the key at runtime
let runtimeApiKey: string = process.env.YUNWU_API_KEY || "";
let runtimeApiUrl: string = YUNWU_CONFIG.API_ENDPOINT;

// Runtime model names (can be overridden by config)
let runtimeTextModel: string = YUNWU_CONFIG.TEXT_MODEL;
let runtimeImageModel: string = YUNWU_CONFIG.IMAGE_MODEL;
let runtimeVideoModel: string = YUNWU_CONFIG.VIDEO_MODEL;

export const setApiKey = (key: string) => {
  runtimeApiKey = key ? key : process.env.YUNWU_API_KEY;
};

export const setApiUrl = (url: string) => {
  runtimeApiUrl = url || YUNWU_CONFIG.API_ENDPOINT;
};

export const setModel = (modelType: 'text' | 'image' | 'video', modelName: string) => {
  switch (modelType) {
    case 'text':
      runtimeTextModel = modelName || YUNWU_CONFIG.TEXT_MODEL;
      break;
    case 'image':
      runtimeImageModel = modelName || YUNWU_CONFIG.IMAGE_MODEL;
      break;
    case 'video':
      runtimeVideoModel = modelName || YUNWU_CONFIG.VIDEO_MODEL;
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

// Helper to make HTTP requests to Yunwu API
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
        `API Error (${response.status}): ${error.error?.message || error.message || response.statusText}`
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
 * 使用云雾API的Gemini模型进行剧本结构化分析
 */
export const parseScriptToData = async (
  rawText: string,
  language: string = "中文"
): Promise<ScriptData> => {
  const endpoint = `${runtimeApiUrl}/v1beta/models/${runtimeTextModel}:generateContent`;

  const prompt = PROMPT_TEMPLATES.PARSE_SCRIPT(rawText, language);

  const requestBody = {
    systemInstruction: {
      parts: [
        {
          text: PROMPT_TEMPLATES.SYSTEM_SCRIPT_ANALYZER,
        },
      ],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
    },
  };

  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  // 从云雾API的响应格式中提取内容
  const content =
    response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

  let parsed: any = {};
  try {
    const text = cleanJsonString(content);
    console.log("Parsed JSON:", text);
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
 * Agent 8: Video Generation
 * 使用云雾API生成视频
 * 支持图生视频和首尾帧视频
 */
export const generateVideo = async (
  prompt: string,
  startImageBase64?: string,
  endImageBase64?: string,
  duration: number = 5,
  full_frame: boolean = false
): Promise<string> => {
  const endpoint = `${runtimeApiUrl}/v1/video/create`;

  // 构建请求体
  const requestBody: any = {
    model: runtimeVideoModel || "veo3-fast-frames",
    prompt: prompt,
    images: [],
  };

  if(runtimeVideoModel.indexOf("veo") !== -1) {
    requestBody.enhance_prompt=true;
    requestBody.enable_upsample=true;
    requestBody.aspect_ratio="16:9";
  }
  if(runtimeVideoModel.indexOf("sora") !== -1) {
    requestBody.size = "small";
    requestBody.orientation="portrait";
    requestBody.watermark=false;
  }
  if(runtimeVideoModel.indexOf("grok") !== -1) {
    requestBody.size = "720P";
    requestBody.aspect_ratio="3:2";
  }

  // 处理起始图片
  if (startImageBase64) {
    requestBody.images.push(startImageBase64);;
  }

  // 处理结束图片（云雾API支持首尾帧）
  if (endImageBase64 && !full_frame && runtimeVideoModel.indexOf("grok") === -1) {
    requestBody.images.push(endImageBase64);
  }

  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  // 获取任务ID
  const taskId = response.id;
  if (!taskId) {
    throw new Error("视频生成失败 (No task ID returned)");
  }

  console.log(`视频任务已创建: ${taskId}, 状态: ${response.status}`);

  // 轮询任务状态直到完成
  const videoUrl = await pollVideoTask(taskId);
  return videoUrl;
};

/**
 * 轮询视频生成任务
 * @param taskId - 任务ID
 * @returns - 视频URL
 */
const pollVideoTask = async (taskId: string): Promise<string> => {
  const endpoint = `${runtimeApiUrl}/v1/video/query`;
  const maxAttempts = 240; // 最多轮询10分钟（每5秒一次）
  const pollInterval = 5000; // 5秒

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const response =  await fetchWithRetry(`${endpoint}?id=${taskId}`, {
      method: "GET",
    });

    const status = response.status;

    if (status === "completed" || status === "succeeded" || status === "video_upsampling" || status === "video_generation_completed") {
      console.log(`视频生成完成: ${taskId}`);
      return response.video_url || response.content?.video_url || response.detail?.video_url || "";
    } else if (status === "failed") {
      throw new Error(`视频生成失败: ${response.error || "未知错误"}`);
    } else if (status === "pending" || status === "processing" || status === "video_generating" || status === "image_downloading" || status === "queued") {
      console.log(`视频生成中... (${i + 1}/${maxAttempts})`);
      continue;
    } else {
      throw new Error(`未知任务状态: ${status}`);
    }
  }

  throw new Error("视频生成超时");
};

/**
 * Agent 4 & 6: Image Generation
 * 使用云雾API的Gemini图片生成模型
 */
export const generateImage = async (
  prompt: string,
  referenceImages: string[] = [],
  ischaracter: string = "character",
  localStyle: string = "真人写实",
  imageSize: string = "2560x1440",
  imageCount: number = 1
): Promise<string> => {
  const endpoint = `${runtimeApiUrl}/v1beta/models/${runtimeImageModel}:generateContent`;

  // 构建提示词
  let finalPrompt = prompt;

  const parts: any[] = [{ text: finalPrompt }];

  // 添加参考图片
  referenceImages.forEach((imgUrl) => {
    const match = imgUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (match) {
      parts.push({
        inline_data: {
          mime_type: match[1],
          data: match[2]
        }
      });
    }
  });

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: parts
      }
    ]
  };

  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  // 提取图片 base64 数据
  // 云雾 API 返回的格式可能使用驼峰命名或下划线命名
  const responseParts = response.candidates?.[0]?.content?.parts || [];
  for (const part of responseParts) {
    // 兼容两种命名格式: inlineData (驼峰) 或 inline_data (下划线)
    const inlineData = part.inlineData || part.inline_data;
    if (inlineData) {
      const mimeType = inlineData.mime_type || inlineData.mimeType || 'image/png';
      return `data:${mimeType};base64,${inlineData.data}`;
    }
  }
  throw new Error("图片生成失败 (No image data returned)");
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
  const endpoint = `${runtimeApiUrl}/v1beta/models/${runtimeTextModel}:generateContent`;

  const generationPrompt = PROMPT_TEMPLATES.GENERATE_SCRIPT(prompt, targetDuration, genre, language);

  const requestBody = {
    systemInstruction: {
      parts: [
        {
          text: PROMPT_TEMPLATES.SYSTEM_SCREENWRITER,
        },
      ],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: generationPrompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.8,
      topP: 0.95,
    },
  };

  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  const content = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return content.trim();
};

/**
 * Agent 3: Visual Design (Prompt Generation)
 */
export const generateVisualPrompts = async (
  prompt: string
): Promise<string> => {
  const endpoint = `${runtimeApiUrl}/v1beta/models/${runtimeTextModel}:generateContent`;
  const requestBody = {
    systemInstruction: {
      parts: [
        {
          text: PROMPT_TEMPLATES.SYSTEM_VISUAL_DESIGNER,
        },
      ],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.8,
      topP: 0.95,
    },
  };

  const response =  await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
    const endpoint = `${runtimeApiUrl}/v1beta/models/${runtimeTextModel}:generateContent`;
    const requestBody = {
      systemInstruction: {
        parts: [
          {
            text: PROMPT_TEMPLATES.SYSTEM_PHOTOGRAPHER,
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
      },
    };

    const response =  await fetchWithRetry(endpoint, {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    const content = response.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
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

/**
 * 为剧本生成镜头清单
 */
export const generateShotList = async (scriptData: ScriptData): Promise<Shot[]> => {
  if (!scriptData.scenes || scriptData.scenes.length === 0) {
    return [];
  }

  // Process scenes sequentially
  const BATCH_SIZE = 1;
  const allShots: Shot[] = [];

  for (let i = 0; i < scriptData.scenes.length; i += BATCH_SIZE) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 1500));

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

