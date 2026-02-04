// services/modelService.ts
// 模型调用包装类，根据启用的配置动态选择模型提供商

import { AIModelConfig, ScriptData, Shot } from "../types";
import { uploadFileToService } from "../utils/fileUploadUtils";
import { imageUrlToBase64 } from "../utils/imageUtils";
import { getEnabledConfigByType } from "./modelConfigService";
import { PROMPT_TEMPLATES } from "./promptTemplates";
import { getAllModelConfigs } from "./storageService";

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

// OpenAI 方法
import {
  generateImage as generateImageOpenai,
  generateScript as generateScriptOpenai,
  generateShotListForScene as generateShotListForSceneOpenai,
  generateShotList as generateShotListOpenai,
  generateVideo as generateVideoOpenai,
  generateVisualPrompts as generateVisualPromptsOpenai,
  parseScriptToData as parseScriptToDataOpenai,
  setApiKey as setOpenaiApiKey,
  setModel as setOpenaiModel
} from "./openaiService";

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

// Baidu TTS 方法
import {
  blobToBase64,
  setApiKey as setBaiduApiKey,
  setApiUrl as setBaiduApiUrl,
  textToSpeech as textToSpeechBaidu
} from "./baiduTtsService";

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
          setOpenaiApiKey(config.apiKey);
          if (config.model) {
            switch (config.modelType) {
              case 'llm':
                setOpenaiModel('text', config.model);
                break;
              case 'text2image':
                setOpenaiModel('image', config.model);
                break;
              case 'image2video':
                setOpenaiModel('video', config.model);
                break;
            }
          }
          console.log(`已更新 OpenAI ${config.modelType} 配置`);
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

        case 'baidu':
          if (config.modelType === 'tts') {
            // 对于百度 TTS，apiKey 是 API Key，apiUrl 是 Secret Key
            setBaiduApiKey(config.apiKey);
          }
          if (config.apiUrl) {
            setBaiduApiUrl(config.apiUrl);
          }
          console.log(`已更新 Baidu ${config.modelType} 配置`);
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
  private static async getEnabledLLMProvider(projectModelProviders?: { llm?: string }): Promise<AIModelConfig> {
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
      return {
        id: 'doubao-llm',
        provider: 'doubao',
        modelType: 'llm',
        model: '',
        apiKey: '',
        apiUrl: '',
        enabled: false,
        description: 'Doubao LLM'
      }
    }

    // 立即更新对应服务的配置参数
    await this.updateServiceConfig(config);

    return config;
  }

  /**
   * 获取当前启用的文生图提供商
   * @param projectModelProviders - 项目级别的模型供应商配置
   */
  private static async getEnabledImageProvider(projectModelProviders?: { text2image?: string }): Promise<AIModelConfig> {
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
      return {
        id: 'doubao-text2image',
        provider: 'doubao',
        modelType: 'text2image',
        model: '',
        apiKey: '',
        apiUrl: '',
        enabled: false,
        description: 'Doubao text2image'
      };
    }

    // 立即更新对应服务的配置参数
    await this.updateServiceConfig(config);

    return config;
  }

  /**
   * 获取当前启用的语音合成提供商
   * @param projectModelProviders - 项目级别的模型供应商配置
   */
  private static async getEnabledAudioProvider(projectModelProviders?: { tts?: string }): Promise<'baidu'> {
    let config;

    // 优先使用项目级别的供应商配置
    if (projectModelProviders?.tts) {
      const allConfigs = await getAllModelConfigs();
      config = allConfigs.find(c => c.id === projectModelProviders.tts);
      console.log(`使用项目配置的语音合成供应商: ${config?.provider}`);
    }

    // 如果项目没有配置，使用系统默认的启用配置
    if (!config) {
      config = await getEnabledConfigByType('tts');
    }

    if (!config) {
      console.warn('未找到语音合成配置，使用默认的 baidu');
      return 'baidu';
    }

    // 立即更新对应服务的配置参数
    await this.updateServiceConfig(config);

    return config.provider as 'baidu';
  }

  /**
   * 获取当前启用的图生视频提供商
   * @param projectModelProviders - 项目级别的模型供应商配置
   */
  private static async getEnabledVideoProvider(projectModelProviders?: { image2video?: string }): Promise<AIModelConfig> {
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
      return {
        id: 'doubao-image2video',
        provider: 'doubao',
        modelType: 'image2video',
        model: '',
        apiKey: '',
        apiUrl: '',
        enabled: false,
        description: 'Doubao image2video'
      };
    }

    // 立即更新对应服务的配置参数
    await this.updateServiceConfig(config);

    return config;
  }

  /**
   * 分析剧本并结构化数据
   * @param rawText - 剧本文本
   * @param language - 输出语言
   */
  static async parseScriptToData(rawText: string, language: string = "中文"): Promise<ScriptData> {
    const provider = await this.getEnabledLLMProvider(this.currentProjectModelProviders);
    console.log(`使用 ${provider} 进行剧本分析`);

    switch (provider.provider) {
      case 'deepseek':
        return await parseScriptToDataDeepseek(rawText, language);
      case 'doubao':
        return await parseScriptToDataDoubao(rawText, language);
      case 'gemini':
        return await parseScriptToDataGemini(rawText, language);
      case 'yunwu':
        return await parseScriptToDataYunwu(rawText, language);
      case 'openai':
        return await parseScriptToDataOpenai(rawText, language);
      default:
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

    switch (provider.provider) {
      case 'deepseek':
        return await generateShotListDeepseek(scriptData);
      case 'doubao':
        return await generateShotListDoubao(scriptData);
      case 'gemini':
        return await generateShotListGemini(scriptData);
      case 'yunwu':
        return await generateShotListYunwu(scriptData);
      case 'openai':
        return await generateShotListOpenai(scriptData);
      default:
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

    if(scene.referenceImage){
      scene.referenceImage=null;
    }
    switch (provider.provider) {
      case 'deepseek':
        return await generateShotListDeepseekForScene(scriptData, scene, sceneIndex);
      case 'doubao':
        return await generateShotListDoubaoForScene(scriptData, scene, sceneIndex);
      case 'gemini':
        return await generateShotListForSceneGemini(scriptData, scene, sceneIndex);
      case 'yunwu':
        return await generateShotListForSceneYunwu(scriptData, scene, sceneIndex);
      case 'openai':
        return await generateShotListForSceneOpenai(scriptData, scene, sceneIndex);
      default:
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

    switch (provider.provider) {
      case 'deepseek':
        return await generateScriptDeepseek(prompt, genre, targetDuration, language);
      case 'doubao':
        return await generateScriptDoubao(prompt, genre, targetDuration, language);
      case 'gemini':
        return await generateScriptGemini(prompt, genre, targetDuration, language);
      case 'yunwu':
        return await generateScriptYunwu(prompt, genre, targetDuration, language);
      case 'openai':
        return await generateScriptOpenai(prompt, genre, targetDuration, language);
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

    if(data.referenceImage){
      data.referenceImage=null;
    }
    if(data.variations){
      data.variations=[];
    }

    switch (provider.provider) {
      case 'deepseek':
        return await generateVisualPromptsDeepseek(type, data, genre);
      case 'doubao':
        return await generateVisualPromptsDoubao(type, data, genre);
      case 'gemini':
        return await generateVisualPromptsGemini(type, data, genre);
      case 'yunwu':
        return await generateVisualPromptsYunwu(type, data, genre);
      case 'openai':
        return await generateVisualPromptsOpenai(type, data, genre);
      default:
        throw new Error(`暂不支持 ${provider} 提供商的视觉提示词生成`);
    }
  }

  /**
   * 设置模型配置（用于动态配置更新）
   * @param provider - 提供商
   * @param apiKey - API 密钥
   */
  static setApiKey(provider: 'doubao' | 'deepseek' | 'openai' | 'gemini' | 'yunwu' | 'minimax' | 'kling' | 'baidu', apiKey: string): void {
    switch (provider) {
      case 'deepseek':
        setDeepseekApiKey(apiKey);
        break;
      case 'doubao':
        setDoubaoApiKey(apiKey);
        break;
      case 'openai':
        setOpenaiApiKey(apiKey);
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
      case 'baidu':
        setBaiduApiKey(apiKey);
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
  static setApiUrl(provider: 'doubao' | 'deepseek' | 'openai' | 'gemini' | 'yunwu' | 'minimax' | 'kling' | 'baidu', apiUrl: string): void {
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
      case 'baidu':
        // baidu 使用固定配置
        break;
    }
  }

  /**
   * 文本转语音并返回音频 URL
   * @param text - 要合成的文本
   * @param options - 可选参数
   * @param projectId - 项目 ID，用于文件上传
   * @returns - 音频的 URL
   */
  static async generateSpeechUrl(
    text: string,
    shotprovider: any = null,
    options: {
      spd?: number; // 语速 0-15，默认5
      pit?: number; // 音调 0-15，默认5
      vol?: number; // 音量，基础音库0-9，精品音库0-15，默认5
      per?: number; // 发音人，默认0（度小美）
      aue?: number; // 音频格式，3=mp3(默认)，4=pcm-16k，5=pcm-8k，6=wav
    } = {},
    projectId: string = ""
  ): Promise<string> {
    try {
      const provider = await this.getEnabledAudioProvider(shotprovider || this.currentProjectModelProviders);
      console.log(`使用 ${provider} 合成语音`);

      let audioBlob: Blob;

      switch (provider) {
        case 'baidu':
          audioBlob = await textToSpeechBaidu(text, options);
          break;
        default:
          throw new Error(`暂不支持 ${provider} 提供商的文生图`);
    }

      // 将 Blob 转换为 Base64 格式以便上传
      const audioBase64 = await blobToBase64(audioBlob);
      const audioDataUrl = `data:audio/mp3;base64,${audioBase64}`;
      console.log('audioDataUrl:', audioDataUrl);
      // 上传到文件服务器
      const uploadResponse = await uploadFileToService({
        fileType: projectId + '_audio_tts',
        base64Data: audioBase64,
        fileName: 's.mp3'
      });

      if (uploadResponse.success && uploadResponse.data?.fileUrl) {
        console.log(`音频已上传到本地服务器: ${uploadResponse.data.fileUrl}`);
        return uploadResponse.data.fileUrl;
      } else {
        console.error(`音频上传失败: ${uploadResponse.error}`);
        // 上传失败时，返回 Base64 data URL
        return audioDataUrl;
      }
    } catch (error) {
      console.error('语音合成失败:', error);
      throw error;
    }
  }
  /**
   * 获取当前使用的提供商信息
   */
  static async getProviderInfo(): Promise<{
    provider: 'doubao' | 'deepseek' | 'openai' | 'gemini' | 'yunwu' | 'minimax' | 'kling' | 'baidu';
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
    imageType: string = "character",
    localStyle: string = "写实",
    imageSize: string = "2560x1440",
    imageCount: number = 1,
    shotprovider: any = null,
    projectid: string = "",
  ): Promise<string> {
    const provider = await this.getEnabledImageProvider(shotprovider || this.currentProjectModelProviders);
    console.log(`使用 ${provider} 生成图片`);

    // 处理参考图片：将HTTP/HTTPS URL转换为Base64
    let processedReferenceImages = [];
    if (referenceImages && referenceImages.length > 0) {
      for(let i=0;i<referenceImages.length;i++){
        try{
          const baseurl = await imageUrlToBase64(referenceImages[i]);
          processedReferenceImages.push(baseurl);
        }catch(error){
          console.error('转换参考图片为Base64失败:', error);
          processedReferenceImages.push(referenceImages[i]);
        }
      }
    }else{
      processedReferenceImages = referenceImages;
    }

    const image_rate = imageSize=="2560x1440" ? "16:9" : "9:16";
    let new_prompt = prompt;
    if(imageType=='start' || imageType=='end' || imageType=='full' ){
      new_prompt = prompt + (imageCount > 1 ? " \n 连环画规格："+IMAGE_X[imageCount]+"连环画图，包含 "+imageCount+" 张连续且风格统一的图片，每张长宽比 "+image_rate+"，白色背景，铺满整张图。" : "");
      new_prompt = PROMPT_TEMPLATES.IMAGE_GENERATION_WITH_REFERENCE(new_prompt,localStyle);
    }

    if(imageType=='character'){
      new_prompt = "生成符合下面要求的角色图片。\n" + new_prompt;
      new_prompt = new_prompt + "\n 生成三视图加大头照，在同一张图中生成丰富细节的角色展示风格图片，图片比例3:4，具体要求：排版布局左上1/4为从头部到肩膀的清晰正面大头照，右上和下部3/4为人物的站立全身三视图（正视、侧视、背视）；所有视图必须为同一角色，五官、发型、服装、体型、风格、比例与细节完全一致，不改变人物特征；三视图比例统一、姿态自然；纯白色背景、无阴影、无道具、无文字。"
    }

    if(imageType=='scene'){
      new_prompt = "生成符合下面要求的场景图片。\n" + new_prompt;
      new_prompt += "\n 图片比例16:9，具体要求：图中无角色、无文字";
    }

    let imageUrlOrBase64: string;

    // 调用各个模型服务生成图片
    switch (provider.provider) {
      case 'doubao':
        imageUrlOrBase64 = await generateImageDoubao(new_prompt, processedReferenceImages, imageType, localStyle, imageSize,imageCount);
        break;
      case 'gemini':
        imageUrlOrBase64 = await generateImageGemini(new_prompt, processedReferenceImages,imageType, localStyle, imageSize,imageCount);
        break;
      case 'yunwu':
        imageUrlOrBase64 = await generateImageYunwu(new_prompt, processedReferenceImages, imageType, localStyle, imageSize,imageCount);
        break;
      case 'openai':
        imageUrlOrBase64 = await generateImageOpenai(new_prompt, processedReferenceImages, imageType, localStyle, imageSize, imageCount);
        break;
      default:
        throw new Error(`暂不支持 ${provider} 提供商的文生图`);
    }

    // 将模型返回的 URL 或 Base64 转换成本地服务器文件
    try {
      // 判断是否是 Base64 格式
      const isBase64 = imageUrlOrBase64.startsWith('data:');

      const uploadResponse = await uploadFileToService({
        fileType: projectid+'_'+imageType+'_'+provider,
        fileUrl: isBase64 ? undefined : imageUrlOrBase64,
        base64Data: isBase64 ? imageUrlOrBase64 : undefined
      });

      if (uploadResponse.success && uploadResponse.data?.fileUrl) {
        console.log(`图片已上传到本地服务器: ${uploadResponse.data.fileUrl}`);
        return uploadResponse.data.fileUrl;
      } else {
        console.error(`图片上传失败: ${uploadResponse.error}`);
        // 上传失败时返回原始图片
        return imageUrlOrBase64;
      }
    } catch (error) {
      console.error(`处理生成图片时出错:`, error);
      // 出错时返回原始图片
      return imageUrlOrBase64;
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
    shotprovider: any = null,
    projectid: string = "",
  ): Promise<string> {
    const provider = await this.getEnabledVideoProvider(shotprovider || this.currentProjectModelProviders);
    console.log(`使用 ${provider} 生成视频`);

    // 处理起始图片：如果是HTTP/HTTPS URL则转换为Base64
    let processedStartImageBase64 = startImageBase64;
    try {
      processedStartImageBase64 = await imageUrlToBase64(startImageBase64);
      console.log('已将起始图片转换为Base64格式');
    } catch (error) {
      console.error('转换起始图片为Base64失败:', error);
      // 转换失败时继续使用原始图片
      processedStartImageBase64 = startImageBase64;
    }

    // 处理结束图片：如果是HTTP/HTTPS URL则转换为Base64
    let processedEndImageBase64 = endImageBase64;
    try {
      processedEndImageBase64 = await imageUrlToBase64(endImageBase64);
      console.log('已将结束图片转换为Base64格式');
    } catch (error) {
      console.error('转换结束图片为Base64失败:', error);
      // 转换失败时继续使用原始图片
      processedEndImageBase64 = endImageBase64;
    }

    let videoUrl: string;

    // 调用各个模型服务生成视频
    switch (provider.provider) {
      case 'doubao':
        const generate_audio = provider.description.indexOf("sound")>-1;
        videoUrl = await generateVideoDoubao(prompt, processedStartImageBase64, processedEndImageBase64, duration,full_frame,generate_audio);
        break;
      case 'gemini':
        videoUrl = await generateVideoGemini(prompt, processedStartImageBase64, processedEndImageBase64,full_frame);
        break;
      case 'yunwu':
        videoUrl = await generateVideoYunwu(prompt, processedStartImageBase64, processedEndImageBase64, duration,full_frame);
        break;
      case 'minimax':
        videoUrl = await generateVideoMinimax(prompt, processedStartImageBase64, processedEndImageBase64, duration, full_frame);
        break;
      case 'kling':
        videoUrl = await generateVideoKling(prompt, processedStartImageBase64, processedEndImageBase64, duration, full_frame);
        break;
      case 'openai':
        videoUrl = await generateVideoOpenai(prompt, processedStartImageBase64, processedEndImageBase64, duration, full_frame);
        break;
      default:
        throw new Error(`暂不支持 ${provider} 提供商的图生视频`);
    }

    // 将模型返回的视频 URL 转换成本地服务器文件
    try {
      const uploadResponse = await uploadFileToService({
        fileType: projectid+'_video_'+provider,
        fileUrl: videoUrl
      });

      if (uploadResponse.success && uploadResponse.data?.fileUrl) {
        console.log(`视频已上传到本地服务器: ${uploadResponse.data.fileUrl}`);
        return uploadResponse.data.fileUrl;
      } else {
        console.error(`视频上传失败: ${uploadResponse.error}`);
        // 上传失败时返回原始 URL
        return videoUrl;
      }
    } catch (error) {
      console.error(`处理生成视频时出错:`, error);
      // 出错时返回原始 URL
      return videoUrl;
    }
  }
}
