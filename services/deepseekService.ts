// services/deepseekService.ts

import { ScriptData, Shot } from "../types";
import { getEnabledConfigByType } from "./modelConfigService";
import { PROMPT_TEMPLATES } from "./promptTemplates";

// DeepSeek 配置
const DEEPSEEK_CONFIG = {
  // 文本生成模型
  TEXT_MODEL: "deepseek-chat",
  // API 端点（默认使用官方 API）
  API_ENDPOINT: "https://api.deepseek.com/v1",
};

// Module-level variable to store key at runtime
let runtimeApiKey: string = "";
let runtimeApiUrl: string = DEEPSEEK_CONFIG.API_ENDPOINT;
let runtimeTextModel: string = DEEPSEEK_CONFIG.TEXT_MODEL;

export const setApiKey = (key: string) => {
  runtimeApiKey = key;
};

export const setApiUrl = (url: string) => {
  runtimeApiUrl = url || DEEPSEEK_CONFIG.API_ENDPOINT;
};

export const setModel = (modelName: string) => {
  runtimeTextModel = modelName || DEEPSEEK_CONFIG.TEXT_MODEL;
};

// 从配置服务加载启用的配置
export const initializeDeepseekConfig = async () => {
  try {
    const enabledConfig = await getEnabledConfigByType('llm');
    if (enabledConfig && enabledConfig.provider === 'deepseek') {
      runtimeApiKey = enabledConfig.apiKey;
      runtimeApiUrl = enabledConfig.apiUrl || DEEPSEEK_CONFIG.API_ENDPOINT;
      if (enabledConfig.model) {
        runtimeTextModel = enabledConfig.model;
        //console.log('DeepSeek 模型已加载:', runtimeTextModel);
      }
      //console.log('DeepSeek 配置已加载');
    }
  } catch (error) {
    console.error('加载 DeepSeek 配置失败:', error);
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
  throw lastError || new Error("Operation failed");
};

// Helper to make HTTP requests to DeepSeek API
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
 * DeepSeek: Script Structuring & Breakdown
 * 分析剧本并结构化数据
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
          content: PROMPT_TEMPLATES.SYSTEM_SCRIPT_ANALYZER,
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
 * DeepSeek: Shot List Generation
 * 为剧本生成镜头清单
 */
/**
 * DeepSeek: 为单个场景生成镜头清单
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
 * DeepSeek: Script Generation from simple prompt
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
          content: PROMPT_TEMPLATES.SYSTEM_SCREENWRITER,
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
 * DeepSeek: Visual Design (Prompt Generation)
 * 生成视觉提示词
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
