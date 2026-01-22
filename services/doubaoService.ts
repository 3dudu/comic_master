// services/doubaoService.ts

import { Character, Scene, ScriptData, Shot } from "../types";
import { getEnabledConfigByType } from "./modelConfigService";

// 火山引擎配置
const DOUBAO_CONFIG = {
  // 文本生成模型（替代 gemini-2.5-flash）
  TEXT_MODEL: "doubao-1-5-pro-32k-250115", // 或 "doubao-pro-128k"
  
  // 图片生成模型（替代 gemini-2.5-flash-image）
  IMAGE_MODEL: "doubao-seedream-4-5-251128", // 火山引擎的图片生成模型
  
  // 视频生成模型（替代 veo-3.1-fast-generate-preview）
  //VIDEO_MODEL: "doubao-seedance-1-5-pro-251215", // 火山引擎的视频生成模型
  //VIDEO_MODEL: "doubao-seedance-1-0-pro-250528", // 火山引擎的视频生成模型
  VIDEO_MODEL: "doubao-seedance-1-0-lite-i2v-250428", // 火山引擎的视频生成模型
  
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

export const setGlobalApiKey = (key: string) => {
  runtimeApiKey = key?key : process.env.VOLCENGINE_API_KEY;
};

export const setRegion = (r: string) => {
  region = r;
};

export const setDoubaoApiUrl = (url: string) => {
  runtimeApiUrl = url || DOUBAO_CONFIG.API_ENDPOINT;
};

export const setDoubaoModel = (modelType: 'text' | 'image' | 'video', modelName: string) => {
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
  return {
    "Authorization": `Bearer ${runtimeApiKey}`,
    "Content-Type": "application/json",
  };
};

// Helper for retry logic
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
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
  retries: number = 3
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

  const prompt = `
    分析文本并以 ${language} 语言输出一个 JSON 对象。

    任务：
    提取title:标题、genre:类型、logline:故事梗概（以 ${language} 语言呈现）。
    提取characters:人物信息（id:编号、name:姓名、gender:性别、age:年龄、personality:性格）。
    提取scenes:场景信息（id:编号、location:地点、time:时间、atmosphere:氛围）。
    storyParagraphs:故事段落（id:编号、sceneRefId:引用场景编号、text:内容）。

    输入：
    "${rawText.slice(0, 30000)}"
  `;

  const response = await retryOperation(async () => {
    return await fetchWithRetry(endpoint, {
      method: "POST",
      body: JSON.stringify({
        model: runtimeTextModel,
        messages: [
          {
            role: "system",
            content:
              "你是一名专业的剧本分析员。请始终以有效的 JSON 格式进行回复。",
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
    genre: parsed.genre || "通用",
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
export const generateShotListDoubaoForScene = async (
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

  const prompt = `
    担任专业摄影师，为第${index + 1}场戏制作一份详尽的镜头清单（镜头调度设计）。
    文本输出语言: ${lang}。

    场景细节:
    地点: ${scene.location}
    时间: ${scene.time}
    氛围: ${scene.atmosphere}

    场景动作:
    "${paragraphs.slice(0, 5000)}"

    创作背景:
    题材类型: ${scriptData.genre}
    剧本整体目标时长: ${scriptData.targetDuration || "Standard"}

    角色:
    ${JSON.stringify(
      scriptData.characters.map((c) => ({
        id: c.id,
        name: c.name,
        desc: c.visualPrompt || c.personality,
      }))
    )}

    说明：
    1. 设计一组覆盖全部情节动作的镜头序列。
    2. 重要提示：每场戏镜头数量上限为 6-8 个，避免出现 JSON 截断错误。
    3. 镜头运动：请使用专业术语（如：前推、右摇、固定、手持、跟拍）。
    4. 景别：明确取景范围（如：大特写、中景、全景）。
    5. 镜头情节概述：详细描述该镜头内发生的情节（使用 ${lang} 指定语言）。
    6. 视觉提示语：用于图像生成的详细英文描述，字数控制在 40 词以内。
    7. 转场动画：包含起始帧，结束帧，时长，运动强度（取值为 0-100）。
    8. 视频提示词：visualPrompt 使用 ${lang} 指定语言。

    输出格式：JSON 数组，数组内对象包含以下字段：
    - id（字符串类型）
    - sceneId（字符串类型）
    - actionSummary（字符串类型）
    - dialogue（字符串类型，可选）
    - cameraMovement（字符串类型）
    - shotSize（字符串类型）
    - characters（字符串数组类型）
    - keyframes（对象数组类型，对象包含 id、type（取值为 ["start", "end"]）、visualPrompt（使用 ${lang} 指定语言） 字段）
    - interval（对象类型，包含 id、startKeyframeId、endKeyframeId、duration、motionStrength、status（取值为 ["pending", "completed"]） 字段）
  `;

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
              "你是一名专业的摄影师，请始终以有效的 JSON 数组格式进行回复。",
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
      batch.map((scene, idx) => generateShotListDoubaoForScene(scriptData, scene, i + idx))
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

  const generationPrompt = `
    你是一名专业的编剧。请根据以下提示词创作一个完整的影视剧本。

    创作要求：
    1. 目标时长：${targetDuration}
    2. 题材类型：${genre}
    3. 输出语言：${language}
    4. 剧本结构清晰，包含场景标题、时间、地点、人物、动作描述、对白
    5. 情节紧凑，画面感强
    6. 人物性格鲜明，对话自然

    用户提示词：
    "${prompt}"

    请以Markdown格式输出剧本结构，不要使用 JSON 格式，直接输出可阅读的剧本文本。
  `;

  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify({
      model: DOUBAO_CONFIG.TEXT_MODEL,
      messages: [
        {
          role: "system",
          content: "你是一名专业的编剧，擅长创作各种类型的影视剧本。"
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
  type: "character" | "scene",
  data: Character | Scene,
  genre: string
): Promise<string> => {
  const prompt = `为电影${genre}的${type}生成高还原度视觉提示词。 
  内容: ${JSON.stringify(data)}. 
  中文输出提示词，以逗号分隔，聚焦视觉细节（光线、质感、外观）。`;

  const endpoint = `${runtimeApiUrl}/chat/completions`;
  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify({
      model: DOUBAO_CONFIG.TEXT_MODEL,
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
  ischaracter: boolean = false,
  localStyle: string = "写实",
  imageSize: string = "2560x1440",
  imageCount: number = 1
): Promise<string> => {
  const endpoint = `${runtimeApiUrl}/images/generations`;
  const requestBody: any = {
    model: runtimeImageModel,
    prompt:  prompt,
    size: ischaracter?"1728x2304":imageSize,
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
  if(response.data){
    if(response.data.length>1){
      let imagesGroup = [];
      for(let i=0;i<response.data.length;i++){
        imagesGroup.push(response.data[i].url)
      }
      return joinImage(imagesGroup,imageSize,imageCount)
    }else{
      return response.data[0].url;
    }
  }else{
    throw new Error("图片生成失败");
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
  if(imageCount==1){
    return referenceImages[0];
  }
  const requestBody: any = {
    model: runtimeImageModel,
    prompt:  "请将这些图片拼成一张"+imageCount+"宫格图片，图片直接留有1个像素的间隔，最终图片大小为" + imageSize + "。" ,
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
  full_frame: boolean = false
): Promise<string> => {
  const endpoint = `${runtimeApiUrl}/contents/generations/tasks`;

  const requestBody: any = {
    model: runtimeVideoModel,
    duration: duration,
    watermark: false,
    content: [{
      type: "text",
      text: prompt
    }]
  };

  if(runtimeVideoModel.indexOf("1-5")>0){
    requestBody.generate_audio = true;
  }
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
