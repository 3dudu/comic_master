// services/modelService.ts
// 模型调用包装类，根据启用的配置动态选择模型提供商

import { ScriptData, Shot } from "../types";
import { getAllModelConfigs, getEnabledConfigByType } from "./modelConfigService";

// DeepSeek 方法
import {
  generateScript as generateScriptDeepseek,
  generateShotList as generateShotListDeepseek,
  generateShotListForScene as generateShotListDeepseekForScene,
  generateVisualPrompts as generateVisualPromptsDeepseek,
  parseScriptToData as parseScriptToDataDeepseek,
  setApiKey as setDeepseekApiKey,
  setApiUrl as setDeepseekApiUrl,
  setModel as setDeepseekModel
} from "./deepseekService";

// Gemini 方法
import {
  generateImage as generateImageGemini,
  generateScript as generateScriptGemini,
  generateShotListForScene as generateShotListForSceneGemini,
  generateShotList as generateShotListGemini,
  generateVideo as generateVideoGemini,
  generateVisualPrompts as generateVisualPromptsGemini,
  parseScriptToData as parseScriptToDataGemini,
  setApiKey as setGeminiApiKey
} from "./geminiService";

// Yunwu 方法
import {
  generateImage as generateImageYunwu,
  generateScript as generateScriptYunwu,
  generateShotListForScene as generateShotListForSceneYunwu,
  generateShotList as generateShotListYunwu,
  generateVideo as generateVideoYunwu,
  generateVisualPrompts as generateVisualPromptsYunwu,
  parseScriptToData as parseScriptToDataYunwu,
  setApiKey as setYunwuApiKey,
  setApiUrl as setYunwuApiUrl,
  setModel as setYunwuModel
} from "./yunwuService";

// Doubao 方法
import {
  generateImage as generateImageDoubao,
  generateScript as generateScriptDoubao,
  generateShotList as generateShotListDoubao,
  generateShotListForScene as generateShotListDoubaoForScene,
  generateVideo as generateVideoDoubao,
  generateVisualPrompts as generateVisualPromptsDoubao,
  parseScriptToData as parseScriptToDataDoubao,
  setApiKey as setDoubaoApiKey,
  setApiUrl as setDoubaoApiUrl,
  setModel as setDoubaoModel
} from "./doubaoService";

// MiniMax 方法
import {
  generateVideo as generateVideoMinimax,
  setApiKey as setMinimaxApiKey,
  setApiUrl as setMinimaxApiUrl,
  setModel as setMinimaxModel
} from "./minimaxService";

// Kling 方法
import {
  generateVideo as generateVideoKling,
  setApiKey as setKlingApiKey,
  setApiUrl as setKlingApiUrl,
  setModel as setKlingModel
} from "./klingService";

const IMAGE_X = [
  '1','1x1','1x2','1x3','2x2','2x3','2x3','3x3','3x3','3x3'
];
/**
 * 模型包装服务
 * 根据启用的配置自动选择模型提供商
 */
export class ModelService {
  private static initialized = false;
  private static currentProjectModelProviders: any = null;

  /**
   * 设置当前项目的模型供应商
   * @param modelProviders - 项目级别的模型供应商配置
   */
  static setCurrentProjectProviders(modelProviders: any) {
    this.currentProjectModelProviders = modelProviders;
    console.log('已设置项目模型供应商:', modelProviders);
  }

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
          if (config.model) {
            setDeepseekModel(config.model);
          }
          console.log(`已更新 DeepSeek ${config.modelType} 配置`);
          break;

        case 'doubao':
          setDoubaoApiKey(config.apiKey);
          if (config.apiUrl) {
            setDoubaoApiUrl(config.apiUrl);
          }
          if (config.model) {
            switch (config.modelType) {
              case 'llm':
                setDoubaoModel('text', config.model);
                break;
              case 'text2image':
                setDoubaoModel('image', config.model);
                break;
              case 'image2video':
                setDoubaoModel('video', config.model);
                break;
            }
          }
          console.log(`已更新 Doubao ${config.modelType} 配置`);
          break;

        case 'openai':
          // TODO: 实现 OpenAI 的配置更新
          console.log(`${config.provider} 配置暂不支持`);
          break;

        case 'gemini':
          setGeminiApiKey(config.apiKey);
          console.log(`已更新 Gemini ${config.modelType} 配置`);
          break;

        case 'yunwu':
          setYunwuApiKey(config.apiKey);
          if (config.apiUrl) {
            setYunwuApiUrl(config.apiUrl);
          }
          if (config.model) {
            switch (config.modelType) {
              case 'llm':
                setYunwuModel('text', config.model);
                break;
              case 'text2image':
                setYunwuModel('image', config.model);
                break;
              case 'image2video':
                setYunwuModel('video', config.model);
                break;
            }
          }
          console.log(`已更新 Yunwu ${config.modelType} 配置`);
          break;

        case 'minimax':
          setMinimaxApiKey(config.apiKey);
          if (config.apiUrl) {
            setMinimaxApiUrl(config.apiUrl);
          }
          if (config.model) {
            setMinimaxModel(config.model);
          }
          console.log(`已更新 MiniMax ${config.modelType} 配置`);
          break;

        case 'kling':
          setKlingApiKey(config.apiKey);
          if (config.apiUrl) {
            setKlingApiUrl(config.apiUrl);
          }
          if (config.model) {
            setKlingModel(config.model);
          }
          console.log(`已更新 Kling ${config.modelType} 配置`);
          break;
      }
    } catch (error) {
      console.error(`更新 ${config.provider} 配置失败:`, error);
    }
  }

  /**
   * 获取当前启用的 LLM 提供商
   * @param projectModelProviders - 项目级别的模型供应商配置
   */
  private static async getEnabledLLMProvider(projectModelProviders?: { llm?: string }): Promise<'doubao' | 'deepseek' | 'openai' | 'gemini' | 'yunwu'> {
    let config;

    // 优先使用项目级别的供应商配置
    if (projectModelProviders?.llm) {
      const allConfigs = await getAllModelConfigs();
      config = allConfigs.find(c => c.id === projectModelProviders.llm);
      console.log(`使用项目配置的 LLM 供应商: ${config?.provider}`);
    }

    // 如果项目没有配置，使用系统默认的启用配置
    if (!config) {
      config = await getEnabledConfigByType('llm');
    }

    if (!config) {
      console.warn('未找到 LLM 配置，使用默认的 doubao');
      return 'doubao';
    }

    // 立即更新对应服务的配置参数
    await this.updateServiceConfig(config);

    return config.provider;
  }

  /**
   * 获取当前启用的文生图提供商
   * @param projectModelProviders - 项目级别的模型供应商配置
   */
  private static async getEnabledImageProvider(projectModelProviders?: { text2image?: string }): Promise<'doubao' | 'gemini' | 'openai' | 'yunwu'> {
    let config;

    // 优先使用项目级别的供应商配置
    if (projectModelProviders?.text2image) {
      const allConfigs = await getAllModelConfigs();
      config = allConfigs.find(c => c.id === projectModelProviders.text2image);
      console.log(`使用项目配置的文生图供应商: ${config?.provider}`);
    }

    // 如果项目没有配置，使用系统默认的启用配置
    if (!config) {
      config = await getEnabledConfigByType('text2image');
    }

    if (!config) {
      console.warn('未找到文生图配置，使用默认的 doubao');
      return 'doubao';
    }

    // 立即更新对应服务的配置参数
    await this.updateServiceConfig(config);

    return config.provider as 'doubao' | 'gemini' | 'openai';
  }

  /**
   * 获取当前启用的图生视频提供商
   * @param projectModelProviders - 项目级别的模型供应商配置
   */
  private static async getEnabledVideoProvider(projectModelProviders?: { image2video?: string }): Promise<'doubao' | 'gemini' | 'openai' | 'yunwu' | 'minimax' | 'kling'> {
    let config;

    // 优先使用项目级别的供应商配置
    if (projectModelProviders?.image2video) {
      const allConfigs = await getAllModelConfigs();
      config = allConfigs.find(c => c.id === projectModelProviders.image2video);
      console.log(`使用项目配置的图生视频供应商: ${config?.provider}`);
    }

    // 如果项目没有配置，使用系统默认的启用配置
    if (!config) {
      config = await getEnabledConfigByType('image2video');
    }

    if (!config) {
      console.warn('未找到图生视频配置，使用默认的 doubao');
      const storedApiKey = localStorage.getItem('cinegen_api_key') || '';
      setDoubaoApiKey(storedApiKey);
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
    const provider = await this.getEnabledLLMProvider(this.currentProjectModelProviders);
    console.log(`使用 ${provider} 进行剧本分析`);

    switch (provider) {
      case 'deepseek':
        return await parseScriptToDataDeepseek(rawText, language);
      case 'doubao':
        return await parseScriptToDataDoubao(rawText, language);
      case 'gemini':
        return await parseScriptToDataGemini(rawText, language);
      case 'yunwu':
        return await parseScriptToDataYunwu(rawText, language);
      case 'openai':
      default:
        // TODO: 实现其他提供商
        throw new Error(`暂不支持 ${provider} 提供商的剧本分析`);
    }
  }

  /**
   * 为剧本生成镜头清单
   * @param scriptData - 剧本数据
   */
  static async generateShotList(scriptData: ScriptData): Promise<Shot[]> {
    const provider = await this.getEnabledLLMProvider(this.currentProjectModelProviders);
    console.log(`使用 ${provider} 生成镜头清单`);

    switch (provider) {
      case 'deepseek':
        return await generateShotListDeepseek(scriptData);
      case 'doubao':
        return await generateShotListDoubao(scriptData);
      case 'gemini':
        return await generateShotListGemini(scriptData);
      case 'yunwu':
        return await generateShotListYunwu(scriptData);
      case 'openai':
      default:
        // TODO: 实现其他提供商
        throw new Error(`暂不支持 ${provider} 提供商的镜头生成`);
    }
  }

  /**
   * 为单个场景生成镜头清单
   * @param scriptData - 剧本数据
   * @param scene - 场景数据
   * @param sceneIndex - 场景索引
   */
  static async generateShotListForScene(
    scriptData: ScriptData,
    scene: any,
    sceneIndex: number
  ): Promise<Shot[]> {
    const provider = await this.getEnabledLLMProvider(this.currentProjectModelProviders);
    console.log(`使用 ${provider} 生成场景 ${sceneIndex + 1} 的镜头清单`);

    switch (provider) {
      case 'deepseek':
        return await generateShotListDeepseekForScene(scriptData, scene, sceneIndex);
      case 'doubao':
        return await generateShotListDoubaoForScene(scriptData, scene, sceneIndex);
      case 'gemini':
        return await generateShotListForSceneGemini(scriptData, scene, sceneIndex);
      case 'yunwu':
        return await generateShotListForSceneYunwu(scriptData, scene, sceneIndex);
      case 'openai':
      default:   // TODO: 实现其他提供商
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
    const provider = await this.getEnabledLLMProvider(this.currentProjectModelProviders);
    console.log(`使用 ${provider} 生成剧本`);

    switch (provider) {
      case 'deepseek':
        return await generateScriptDeepseek(prompt, genre, targetDuration, language);
      case 'doubao':
        return await generateScriptDoubao(prompt, genre, targetDuration, language);
      case 'gemini':
        return await generateScriptGemini(prompt, genre, targetDuration, language);
      case 'yunwu':
        return await generateScriptYunwu(prompt, genre, targetDuration, language);
      case 'openai':
      default:
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
    const provider = await this.getEnabledLLMProvider(this.currentProjectModelProviders);
    console.log(`使用 ${provider} 生成视觉提示词`);

    switch (provider) {
      case 'deepseek':
        return await generateVisualPromptsDeepseek(type, data, genre);
      case 'doubao':
        return await generateVisualPromptsDoubao(type, data, genre);
      case 'gemini':
        return await generateVisualPromptsGemini(type, data, genre);
      case 'yunwu':
        return await generateVisualPromptsYunwu(type, data, genre);
      case 'openai':
      default:
        throw new Error(`暂不支持 ${provider} 提供商的视觉提示词生成`);
    }
  }

  /**
   * 设置模型配置（用于动态配置更新）
   * @param provider - 提供商
   * @param apiKey - API 密钥
   */
  static setApiKey(provider: 'doubao' | 'deepseek' | 'openai' | 'gemini' | 'yunwu' | 'minimax' | 'kling', apiKey: string): void {
    switch (provider) {
      case 'deepseek':
        setDeepseekApiKey(apiKey);
        break;
      case 'doubao':
        setDoubaoApiKey(apiKey);
        break;
      case 'openai':
        // TODO: 实现 OpenAI
        break;
      case 'gemini':
        setGeminiApiKey(apiKey);
        break;
      case 'yunwu':
        setYunwuApiKey(apiKey);
        break;
      case 'minimax':
        setMinimaxApiKey(apiKey);
        break;
      case 'kling':
        setKlingApiKey(apiKey);
        break;
      default:
        throw new Error(`暂不支持 ${provider} 提供商的 API 密钥设置`);
    }
  }

  /**
   * 设置 API URL（用于动态配置更新）
   * @param provider - 提供商
   * @param apiUrl - API 端点
   */
  static setApiUrl(provider: 'doubao' | 'deepseek' | 'openai' | 'gemini' | 'yunwu' | 'minimax' | 'kling', apiUrl: string): void {
    switch (provider) {
      case 'deepseek':
        setDeepseekApiUrl(apiUrl);
        break;
      case 'doubao':
        // Doubao 使用固定配置
        break;
      case 'openai':
        // TODO: 实现 OpenAI
        break;
      case 'gemini':
        // Gemini 使用 GoogleGenAI 的默认端点，不支持自定义 apiUrl
        console.log('Gemini 使用默认 API 端点');
        break;
      case 'yunwu':
        setYunwuApiUrl(apiUrl);
        break;
      case 'minimax':
        setMinimaxApiUrl(apiUrl);
        break;
      case 'kling':
        setKlingApiUrl(apiUrl);
        break;
    }
  }

  /**
   * 获取当前使用的提供商信息
   */
  static async getProviderInfo(): Promise<{
    provider: 'doubao' | 'deepseek' | 'openai' | 'gemini' | 'yunwu' | 'minimax' | 'kling';
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
    imageSize: string = "2560x1440",
    imageCount: number = 1,
    shotprovider: any = null
  ): Promise<string> {
    const provider = await this.getEnabledImageProvider(shotprovider || this.currentProjectModelProviders);
    console.log(`使用 ${provider} 生成图片`);

    const image_rate = imageSize=="2560x1440" ? "16:9" : "9:16";
    let imagex = IMAGE_X[imageCount];
    const new_prompt = "请使用 "+localStyle+" 风格创作图画，内容为" + prompt + (imageCount > 1 ? " 生成连续 "+imageCount+" 宫格，包含 "+imageCount+" 张风格统一的图片，每张长宽比 "+image_rate+"，间距 1px，白色背景，铺满整张图。" : "");

    switch (provider) {
      case 'doubao':
        return await generateImageDoubao(new_prompt, referenceImages, isCharacter, localStyle, imageSize,imageCount);
      case 'gemini':
        return await generateImageGemini(new_prompt, referenceImages,isCharacter, localStyle, imageSize,imageCount);
      case 'yunwu':
        return await generateImageYunwu(new_prompt, referenceImages, isCharacter, localStyle, imageSize,imageCount);
      default:
      case 'openai':
        throw new Error(`暂不支持 ${provider} 提供商的文生图`);
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
    duration: number = 5,
    full_frame: boolean = false,
    shotprovider: any = null
  ): Promise<string> {
    const provider = await this.getEnabledVideoProvider(shotprovider || this.currentProjectModelProviders);
    console.log(`使用 ${provider} 生成视频`);

    switch (provider) {
      case 'doubao':
        return await generateVideoDoubao(prompt, startImageBase64, endImageBase64, duration,full_frame);
      case 'gemini':
        return await generateVideoGemini(prompt, startImageBase64, endImageBase64,full_frame);
      case 'yunwu':
        return await generateVideoYunwu(prompt, startImageBase64, endImageBase64, duration,full_frame);
      case 'minimax':
        return await generateVideoMinimax(prompt, startImageBase64, endImageBase64, duration, full_frame);
      case 'kling':
        return await generateVideoKling(prompt, startImageBase64, endImageBase64, duration, full_frame);
      case 'openai':
      default:
        throw new Error(`暂不支持 ${provider} 提供商的图生视频`);
    }
  }
}
