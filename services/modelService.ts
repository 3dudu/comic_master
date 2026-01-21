// services/modelService.ts
// 模型调用包装类，根据启用的配置动态选择模型提供商

import { ScriptData, Shot } from "../types";
import { getEnabledConfigByType, getAllModelConfigs } from "./modelConfigService";

// DeepSeek 方法
import {
  parseScriptToDataDeepseek,
  generateShotListDeepseek,
  generateScriptDeepseek,
  generateVisualPromptsDeepseek,
  setDeepseekApiKey,
  setDeepseekApiUrl
} from "./deepseekService";

// Gemini 方法
import {
  generateImage as generateImageGemini,
  generateVideo as generateVideoGemini
} from "./geminiService";

// Doubao 方法
import {
  parseScriptToData as parseScriptToDataDoubao,
  generateShotList as generateShotListDoubao,
  generateScript as generateScriptDoubao,
  generateVisualPrompts as generateVisualPromptsDoubao,
  generateImage as generateImageDoubao,
  generateVideo as generateVideoDoubao,
  setGlobalApiKey as setDoubaoApiKey,
  setDoubaoApiUrl
} from "./doubaoService";

/**
 * 模型包装服务
 * 根据启用的配置自动选择模型提供商
 */
export class ModelService {
  private static initialized = false;

  /**
   * 初始化模型配置
   * 在应用启动时调用，加载启用的模型配置
   */
  static async initialize() {
    if (this.initialized) return;

    try {
      // 获取所有启用的配置并更新对应的服务
      const allConfigs = await getAllModelConfigs();
      const enabledConfigs = allConfigs.filter(c => c.enabled);

      for (const config of enabledConfigs) {
        await this.updateServiceConfig(config);
      }

      this.initialized = true;
      console.log('模型服务初始化完成，已加载配置:', enabledConfigs.map(c => c.provider + ':' + c.modelType));
    } catch (error) {
      console.error('模型服务初始化失败:', error);
    }
  }

  /**
   * 根据配置更新对应服务的参数
   * @param config - 模型配置
   */
  private static async updateServiceConfig(config: any): Promise<void> {
    try {
      switch (config.provider) {
        case 'deepseek':
          setDeepseekApiKey(config.apiKey);
          if (config.apiUrl) {
            setDeepseekApiUrl(config.apiUrl);
          }
          console.log(`已更新 DeepSeek ${config.modelType} 配置`);
          break;

        case 'doubao':
          setDoubaoApiKey(config.apiKey);
          if (config.apiUrl) {
            setDoubaoApiUrl(config.apiUrl);
          }
          console.log(`已更新 Doubao ${config.modelType} 配置`);
          break;

        case 'openai':
        case 'gemini':
          // TODO: 实现其他提供商的配置更新
          console.log(`${config.provider} 配置暂不支持`);
          break;
      }
    } catch (error) {
      console.error(`更新 ${config.provider} 配置失败:`, error);
    }
  }

  /**
   * 获取当前启用的 LLM 提供商
   */
  private static async getEnabledLLMProvider(): Promise<'doubao' | 'deepseek' | 'openai' | 'gemini'> {
    const config = await getEnabledConfigByType('llm');

    if (!config) {
      console.warn('未找到启用的 LLM 配置，使用默认的 doubao');
      return 'doubao';
    }

    // 立即更新对应服务的配置参数
    await this.updateServiceConfig(config);

    return config.provider;
  }

  /**
   * 获取当前启用的文生图提供商
   */
  private static async getEnabledImageProvider(): Promise<'doubao' | 'gemini' | 'openai'> {
    const config = await getEnabledConfigByType('text2image');

    if (!config) {
      console.warn('未找到启用的文生图配置，使用默认的 doubao');
      return 'doubao';
    }

    // 立即更新对应服务的配置参数
    await this.updateServiceConfig(config);

    return config.provider as 'doubao' | 'gemini' | 'openai';
  }

  /**
   * 获取当前启用的图生视频提供商
   */
  private static async getEnabledVideoProvider(): Promise<'doubao' | 'gemini' | 'openai'> {
    const config = await getEnabledConfigByType('image2video');

    if (!config) {
      console.warn('未找到启用的图生视频配置，使用默认的 doubao');
      return 'doubao';
    }

    // 立即更新对应服务的配置参数
    await this.updateServiceConfig(config);

    return config.provider as 'doubao' | 'gemini' | 'openai';
  }

  /**
   * 分析剧本并结构化数据
   * @param rawText - 剧本文本
   * @param language - 输出语言
   */
  static async parseScriptToData(rawText: string, language: string = "中文"): Promise<ScriptData> {
    const provider = await this.getEnabledLLMProvider();
    console.log(`使用 ${provider} 进行剧本分析`);

    switch (provider) {
      case 'deepseek':
        return await parseScriptToDataDeepseek(rawText, language);
      case 'doubao':
      default:
        return await parseScriptToDataDoubao(rawText, language);
      case 'openai':
      case 'gemini':
        // TODO: 实现其他提供商
        throw new Error(`暂不支持 ${provider} 提供商的剧本分析`);
    }
  }

  /**
   * 为剧本生成镜头清单
   * @param scriptData - 剧本数据
   */
  static async generateShotList(scriptData: ScriptData): Promise<Shot[]> {
    const provider = await this.getEnabledLLMProvider();
    console.log(`使用 ${provider} 生成镜头清单`);

    switch (provider) {
      case 'deepseek':
        return await generateShotListDeepseek(scriptData);
      case 'doubao':
      default:
        return await generateShotListDoubao(scriptData);
      case 'openai':
      case 'gemini':
        // TODO: 实现其他提供商
        throw new Error(`暂不支持 ${provider} 提供商的镜头生成`);
    }
  }

  /**
   * 根据简单提示词生成完整剧本
   * @param prompt - 用户提示词
   * @param genre - 题材类型
   * @param targetDuration - 目标时长
   * @param language - 输出语言
   */
  static async generateScript(
    prompt: string,
    genre: string = "剧情片",
    targetDuration: string = "60s",
    language: string = "中文"
  ): Promise<string> {
    const provider = await this.getEnabledLLMProvider();
    console.log(`使用 ${provider} 生成剧本`);

    switch (provider) {
      case 'deepseek':
        return await generateScriptDeepseek(prompt, genre, targetDuration, language);
      case 'doubao':
      default:
        return await generateScriptDoubao(prompt, genre, targetDuration, language);
      case 'openai':
      case 'gemini':
        // TODO: 实现其他提供商
        throw new Error(`暂不支持 ${provider} 提供商的剧本生成`);
    }
  }

  /**
   * 生成视觉提示词
   * @param type - 角色 or 场景
   * @param data - 角色或场景数据
   * @param genre - 题材类型
   */
  static async generateVisualPrompts(
    type: "character" | "scene",
    data: any,
    genre: string
  ): Promise<string> {
    const provider = await this.getEnabledLLMProvider();
    console.log(`使用 ${provider} 生成视觉提示词`);

    switch (provider) {
      case 'deepseek':
        return await generateVisualPromptsDeepseek(type, data, genre);
      case 'doubao':
      default:
        return await generateVisualPromptsDoubao(type, data, genre);
      case 'openai':
      case 'gemini':
        // TODO: 实现其他提供商
        throw new Error(`暂不支持 ${provider} 提供商的视觉提示词生成`);
    }
  }

  /**
   * 设置模型配置（用于动态配置更新）
   * @param provider - 提供商
   * @param apiKey - API 密钥
   */
  static setApiKey(provider: 'doubao' | 'deepseek' | 'openai' | 'gemini', apiKey: string): void {
    switch (provider) {
      case 'deepseek':
        setDeepseekApiKey(apiKey);
        break;
      case 'doubao':
        // Doubao 使用全局设置
        break;
      case 'openai':
      case 'gemini':
        // TODO: 实现其他提供商
        break;
    }
  }

  /**
   * 设置 API URL（用于动态配置更新）
   * @param provider - 提供商
   * @param apiUrl - API 端点
   */
  static setApiUrl(provider: 'doubao' | 'deepseek' | 'openai' | 'gemini', apiUrl: string): void {
    switch (provider) {
      case 'deepseek':
        setDeepseekApiUrl(apiUrl);
        break;
      case 'doubao':
        // Doubao 使用固定配置
        break;
      case 'openai':
      case 'gemini':
        // TODO: 实现其他提供商
        break;
    }
  }

  /**
   * 获取当前使用的提供商信息
   */
  static async getProviderInfo(): Promise<{
    provider: 'doubao' | 'deepseek' | 'openai' | 'gemini';
    enabled: boolean;
  }> {
    const config = await getEnabledConfigByType('llm');
    return {
      provider: config?.provider || 'doubao',
      enabled: !!config
    };
  }

  /**
   * 文生图
   * @param prompt - 提示词
   * @param referenceImages - 参考图片数组（可选）
   * @param isCharacter - 是否是角色图片（仅 doubao 支持）
   * @param localStyle - 本地风格（仅 doubao 支持）
   * @param imageSize - 图片尺寸（仅 doubao 支持）
   */
  static async generateImage(
    prompt: string,
    referenceImages: string[] = [],
    isCharacter: boolean = false,
    localStyle: string = "写实",
    imageSize: string = "2560x1440"
  ): Promise<string> {
    const provider = await this.getEnabledImageProvider();
    console.log(`使用 ${provider} 生成图片`);

    switch (provider) {
      case 'doubao':
        return await generateImageDoubao(prompt, referenceImages, isCharacter, localStyle, imageSize);
      case 'gemini':
        return await generateImageGemini(prompt, referenceImages);
      case 'openai':
        // TODO: 实现 OpenAI 文生图
        throw new Error(`暂不支持 ${provider} 提供商的文生图`);
      default:
        return await generateImageDoubao(prompt, referenceImages, isCharacter, localStyle, imageSize);
    }
  }

  /**
   * 图生视频
   * @param prompt - 提示词
   * @param startImageBase64 - 起始图片（可选）
   * @param endImageBase64 - 结束图片（可选，仅 gemini 支持）
   * @param duration - 视频时长，单位秒（仅 doubao 支持）
   */
  static async generateVideo(
    prompt: string,
    startImageBase64?: string,
    endImageBase64?: string,
    duration: number = 5
  ): Promise<string> {
    const provider = await this.getEnabledVideoProvider();
    console.log(`使用 ${provider} 生成视频`);

    switch (provider) {
      case 'doubao':
        return await generateVideoDoubao(prompt, startImageBase64, endImageBase64, duration);
      case 'gemini':
        return await generateVideoGemini(prompt, startImageBase64, endImageBase64);
      case 'openai':
        // TODO: 实现 OpenAI 图生视频
        throw new Error(`暂不支持 ${provider} 提供商的图生视频`);
      default:
        return await generateVideoDoubao(prompt, startImageBase64, endImageBase64, duration);
    }
  }
}
