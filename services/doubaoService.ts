// services/doubaoService.ts

import { ScriptData, Shot } from "../types";
import { getEnabledConfigByType } from "./modelConfigService";
import { PROMPT_TEMPLATES } from "./promptTemplates";

// 火山引擎配置
const DOUBAO_CONFIG = {
  // 文本生成模型（替代 gemini-2.5-flash）
  TEXT_MODEL: "doubao-seed-1-8-251228", // 或 "doubao-pro-128k"

  // 图片生成模型（替代 gemini-2.5-flash-image）
  IMAGE_MODEL: "doubao-seedream-4-5-251128", // 火山引擎的图片生成模型

  // 视频生成模型（替代 veo-3.1-fast-generate-preview）
  //VIDEO_MODEL: "doubao-seedance-1-5-pro-251215", // 火山引擎的视频生成模型
  //VIDEO_MODEL: "doubao-seedance-1-0-pro-250528", // 火山引擎的视频生成模型
  VIDEO_MODEL: "doubao-seedance-1-0-pro-250528", // 火山引擎的视频生成模型

  // API 端点
  API_ENDPOINT: "https://ark.cn-beijing.volces.com/api/v3",
};

// Module-level variable to store the key at runtime
let runtimeApiKey: string = process.env.VOLCENGINE_API_KEY || "";
let runtimeApiUrl: string = DOUBAO_CONFIG.API_ENDPOINT;
let region: string = process.env.VOLCENGINE_REGION || "cn-beijing";

// Runtime model names (can be overridden by config)
let runtimeTextModel: string = DOUBAO_CONFIG.TEXT_MODEL;
let runtimeImageModel: string = DOUBAO_CONFIG.IMAGE_MODEL;
let runtimeVideoModel: string = DOUBAO_CONFIG.VIDEO_MODEL;

export const setApiKey = (key: string) => {
  runtimeApiKey = key?key : process.env.VOLCENGINE_API_KEY;
};
export const setGlobalApiKey = (key: string) => {
  runtimeApiKey = key?key : process.env.VOLCENGINE_API_KEY;
};

export const setRegion = (r: string) => {
  region = r;
};

export const setApiUrl = (url: string) => {
  runtimeApiUrl = url || DOUBAO_CONFIG.API_ENDPOINT;
};

export const setModel = (modelType: 'text' | 'image' | 'video', modelName: string) => {
  switch (modelType) {
    case 'text':
      runtimeTextModel = modelName || DOUBAO_CONFIG.TEXT_MODEL;
      break;
    case 'image':
      runtimeImageModel = modelName || DOUBAO_CONFIG.IMAGE_MODEL;
      break;
    case 'video':
      runtimeVideoModel = modelName || DOUBAO_CONFIG.VIDEO_MODEL;
      break;
  }
};

// 从配置服务加载启用的配置
export const initializeDoubaoConfig = async () => {
  try {
    // 加载 LLM 配置
    const llmConfig = await getEnabledConfigByType('llm');
    if (llmConfig && llmConfig.provider === 'doubao' && llmConfig.model) {
      runtimeTextModel = llmConfig.model;
      console.log('Doubao LLM 模型已加载:', runtimeTextModel);
    }

    // 加载图片生成配置
    const imageConfig = await getEnabledConfigByType('text2image');
    if (imageConfig && imageConfig.provider === 'doubao' && imageConfig.model) {
      runtimeImageModel = imageConfig.model;
      console.log('Doubao Image 模型已加载:', runtimeImageModel);
    }

    // 加载视频生成配置
    const videoConfig = await getEnabledConfigByType('image2video');
    if (videoConfig && videoConfig.provider === 'doubao' && videoConfig.model) {
      runtimeVideoModel = videoConfig.model;
      console.log('Doubao Video 模型已加载:', runtimeVideoModel);
    }
  } catch (error) {
    console.error('加载 Doubao 配置失败:', error);
  }
};

// Helper for authentication headers
const getAuthHeaders = () => {
  if (!runtimeApiKey || runtimeApiKey.trim() === "") {
    throw new Error("API Key 未配置或为空，请先设置有效的 API Key");
  }
  
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

// Helper to make HTTP requests to Volcengine API
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
 * Uses Doubao for fast, structured text generation.
 */
export const parseScriptToData = async (
  rawText: string,
  language: string = "中文"
): Promise<ScriptData> => {
  const endpoint = `${runtimeApiUrl}/chat/completions`;

  const prompt = PROMPT_TEMPLATES.PARSE_SCRIPT(rawText, language);

    const response = await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify({
      model: runtimeTextModel,
      messages: [
        {
          role: "system",
          content:
            PROMPT_TEMPLATES.SYSTEM_SCRIPT_ANALYZER,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 8192,
      response_format: { type: "json_object" }, // 结构化输出
    }),
  });

  const content = response.choices?.[0]?.message?.content || "{}";

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
            content:
              PROMPT_TEMPLATES.SYSTEM_PHOTOGRAPHER,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 8192,
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

  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify({
      model: runtimeTextModel,
      messages: [
        {
          role: "system",
          content: PROMPT_TEMPLATES.SYSTEM_SCREENWRITER
        },
        {
          role: "user",
          content: generationPrompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 8192,
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
 * 使用火山引擎的 Seedream 模型
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
  const requestBody: any = {
    model: runtimeImageModel,
    size: imageType=="character"?"1728x2304":imageSize,
    //sequential_image_generation: ischaracter?"disabled":"auto",
    watermark: false
  };

  /*
  if (imageCount > 1) {
    requestBody.sequential_image_generation_options = {
      max_images: imageCount
    };
  }
  */
  // 如果有参考图片，火山引擎可能需要不同的处理方式
  // 具体实现需要参考火山引擎的图片生成 API 文档
  let finalPrompt = prompt;
  if (referenceImages.length > 0) {
    // 这里需要根据实际 API 调整
    // 可能需要使用 image_url 参数或其他方式
    requestBody.image = referenceImages;
  }

  requestBody.prompt = finalPrompt;

  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  // 提取图片 URL 或 base64 数据
  if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
    throw new Error("图片生成失败: 无效的响应数据");
  }

  if (response.data.length > 1) {
    const imagesGroup = response.data
      .filter((item: any) => item && item.url)
      .map((item: any) => item.url);
    
    if (imagesGroup.length === 0) {
      throw new Error("图片生成失败: 没有有效的图片URL");
    }
    
    return joinImage(imagesGroup, imageSize, imageCount);
  } else {
    if (!response.data[0] || !response.data[0].url) {
      throw new Error("图片生成失败: 缺少图片URL");
    }
    return response.data[0].url;
  }
};



/**
 * Agent 4 & 6: Image Generation
 * 使用火山引擎的 Seedream 模型
 */
export const joinImage = async (
  referenceImages: string[] = [],
  imageSize: string = "2560x1440",
  imageCount: number = 1
): Promise<string> => {
  const endpoint = `${runtimeApiUrl}/images/generations`;
  
  // 验证输入参数
  if (!Array.isArray(referenceImages) || referenceImages.length === 0) {
    throw new Error("参考图片列表不能为空");
  }
  
  if (imageCount === 1) {
    const url = referenceImages[0];
    if (!url || typeof url !== 'string') {
      throw new Error("无效的图片URL");
    }
    return url;
  }
  const requestBody: any = {
    model: runtimeImageModel,
    prompt: PROMPT_TEMPLATES.JOIN_IMAGES(imageCount, imageSize),
    size: imageSize,
    watermark: false
  };

  if (referenceImages.length > 0) {
    // 这里需要根据实际 API 调整
    // 可能需要使用 image_url 参数或其他方式
    requestBody.image = referenceImages;
  }

  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  // 提取图片 URL 或 base64 数据
  const imageUrl = response.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("图片生成失败");
  }

  // 如果返回的是 URL，可以转换为 base64 或者直接返回 URL
  return imageUrl;
};

/**
 * Agent 8: Video Generation
 * 使用火山引擎的 Seedream 视频生成模型
 */
export const generateVideo = async (
  prompt: string,
  startImageBase64?: string,
  endImageBase64?: string,
  duration: number = 5,
  full_frame: boolean = false,
  generate_audio: boolean = false
): Promise<string> => {
  const endpoint = `${runtimeApiUrl}/contents/generations/tasks`;

  const requestBody: any = {
    model: runtimeVideoModel,
    duration: duration>6?10:5,
    watermark: false,
    content: [{
      type: "text",
      text: prompt
    }]
  };

  requestBody.generate_audio = generate_audio;
  // 处理起始图片
  if (startImageBase64) {
    requestBody.content.push({
            "type": "image_url",
            "image_url": {
                "url": startImageBase64
            },
            "role": full_frame?"reference_image":"first_frame"
    });
  }

  // 处理结束图片（如果火山引擎支持）
  if (endImageBase64 && !full_frame) {
    requestBody.content.push({
            "type": "image_url",
            "image_url": {
                "url": endImageBase64
            },
            "role": "last_frame"
    });
  }
  
  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  // 火山引擎可能返回异步任务 ID，需要轮询获取结果
  const taskId = response.id;
  if (!taskId) {
    throw new Error("视频生成失败");
  }

  // 轮询任务状态
  const videoUrl = await pollVideoTask(taskId);
  return videoUrl;
};

// 轮询视频生成任务
const pollVideoTask = async (taskId: string): Promise<string> => {
  const endpoint = `${runtimeApiUrl}/contents/generations/tasks/${taskId}`;

  let attempts = 0;
  const maxAttempts = 60; // 最多轮询 5 分钟

  while (attempts < maxAttempts) {
    const response = await fetchWithRetry(endpoint, {
      method: "GET",
    });

    const status = response.status;
    if (status === "completed" || status === "succeeded") {
      return response.video_url || response.content?.video_url;
    } else if (status === "failed") {
      throw new Error(`视频生成失败: ${response.error}`);
    }

    // 等待 5 秒后继续轮询
    await new Promise((resolve) => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error("视频生成超时");
};
