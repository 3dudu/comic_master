// services/soraService.ts
// Sora 视频生成服务

import { mapStyleToEnglish } from '../utils/styleMapping';

const SORA_CONFIG = {
  // 视频生成模型
  VIDEO_MODEL: "sora-2",

  // API 端点
  API_ENDPOINT: "https://yunwu.ai/v1/videos",
};

// Module-level variable to store key at runtime
let runtimeApiKey: string = "";
let runtimeApiUrl: string = SORA_CONFIG.API_ENDPOINT;

// Runtime model name (can be overridden by config)
let runtimeVideoModel: string = SORA_CONFIG.VIDEO_MODEL;

/**
 * 设置 API Key
 */
export function setApiKey(key: string): void {
  runtimeApiKey = key ? key : "";
}

/**
 * 设置 API URL
 */
export function setApiUrl(url: string): void {
  runtimeApiUrl = url || SORA_CONFIG.API_ENDPOINT;
}

/**
 * 获取 API Key
 */
export function getApiKey(): string {
  return runtimeApiKey;
}

/**
 * 获取 API URL
 */
export function getApiUrl(): string {
  return runtimeApiUrl;
}

/**
 * 设置模型名称
 */
export function setModel(modelName: string): void {
  runtimeVideoModel = modelName || SORA_CONFIG.VIDEO_MODEL;
}

/**
 * 获取当前模型名称
 */
export function getModel(): string {
  return runtimeVideoModel;
}

/**
 * 生成视频（图生视频）
 * @param prompt - 视频提示词
 * @param startImageBase64 - 起始图片的URL或base64
 * @param endImageBase64 - 结束图片的URL或base64（可选）
 * @param duration - 视频时长（秒）
 * @param fullFrame - 是否为完整宫格模式
 * @returns 视频URL
 */
export async function generateVideo(
  prompt: string,
  startImageBase64?: string,
  endImageBase64?: string,
  duration: number = 5,
  fullFrame: boolean = false,
  imageSize: string = '720x1280',
  visualStyle: string = '真人写实'
): Promise<string> {
  if (!runtimeApiKey) {
    throw new Error('Sora API Key 未设置');
  }

  try {
    let seconds = duration;
    if(seconds<4){
      seconds = 4;
    }else if(seconds<8){
      seconds = 8;
    }else{
      seconds = 12;
    }

    // 根据 imageSize 判断横竖屏
    const [width, height] = imageSize.split('x').map(Number);
    const isLandscape = width > height;
    const size = isLandscape ? '1280x720' : '720x1280';

    // 映射中文风格到英文标签
    const englishStyle = mapStyleToEnglish(visualStyle);

    // 构建 FormData
    const formData = new FormData();
    formData.append('model', runtimeVideoModel);
    formData.append('prompt', prompt);
    formData.append('seconds', String(seconds));
    formData.append('size', size);
    formData.append('watermark', "false");
    formData.append('private', "false");
    formData.append('style', englishStyle);
    
    // 处理起始图片 - 如果是 base64 需要转换为 Blob
    if (startImageBase64) {
      const match = startImageBase64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (match) {
        // base64 格式
        const mimeType = match[1];
        const base64Data = match[2];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        formData.append('input_reference', blob, 'input.png');
      } else if (startImageBase64.startsWith('http')) {
        // URL 格式，需要下载
        const response = await fetch(startImageBase64);
        const blob = await response.blob();
        formData.append('input_reference', blob, 'input.png');
      }
    }

    // console.log('调用 Sora 视频生成:', formData);

    // 发送生成请求
    const generateResponse = await fetch(runtimeApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runtimeApiKey}`
      },
      body: formData
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      throw new Error(`Sora 生成请求失败: ${generateResponse.status} - ${errorText}`);
    }

    const generateData = await generateResponse.json();
    const taskId = generateData.id || generateData.task_id;

    if (!taskId) {
      throw new Error('Sora 未返回任务ID');
    }

    // console.log('Sora 任务ID:', taskId);

    // 轮询任务状态
    return await pollTaskStatus(taskId);

  } catch (error) {
    console.error('Sora 视频生成失败:', error);
    throw error;
  }
}

/**
 * 查询任务状态
 * @param taskId - 任务ID
 * @returns 任务状态
 */
async function getTaskStatus(taskId: string): Promise<any> {
  const statusUrl = `${runtimeApiUrl}/${taskId}`;

  const response = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${runtimeApiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Sora 查询任务状态失败: ${response.status}`);
  }

  return await response.json();
}

/**
 * 获取视频内容URL
 * @param taskId - 任务ID
 * @returns 视频URL
 */
async function getVideoContentUrl(taskId: string): Promise<string> {
  const contentUrl = `${runtimeApiUrl}/${taskId}/content`;

  const response = await fetch(contentUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${runtimeApiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Sora 获取视频内容失败: ${response.status}`);
  }

  const data = await response.json();
  // 根据接口返回格式获取视频URL
  return data.url || data.video_url || data.data?.url || data.data?.video_url;
}

/**
 * 轮询任务状态直到完成
 * @param taskId - 任务ID
 * @returns 视频URL
 */
async function pollTaskStatus(taskId: string): Promise<string> {
  const maxAttempts = 120; // 最多等待3分钟（每次1秒）
  const pollInterval = 10000; // 1秒

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const taskData = await getTaskStatus(taskId);

      // 检查任务状态
      // Sora 可能的状态: 'processing', 'succeeded', 'failed', 'canceled'
      const status = taskData.status || taskData.data?.status;

      if (status === 'succeeded' || status === 'completed' || status === 'Success') {
        // 任务完成，调用 content 接口获取视频URL
        try {
          const videoUrl = await getVideoContentUrl(taskId);
          if (videoUrl) {
            // console.log('Sora 视频生成成功:', videoUrl);
            return videoUrl;
          }
        } catch (contentError) {
          console.error('获取视频内容URL失败:', contentError);
          // 如果 content 接口失败，尝试从状态接口返回的数据中获取
          const fallbackUrl = taskData?.video_url;
          if (fallbackUrl) {
            return fallbackUrl;
          }
          throw contentError;
        }
      } else if (status === 'failed' || status === 'error' || status === 'Failed' || status === 'canceled' || status === 'Cancelled') {
        // 任务失败
        const errorMsg = taskData.error?.message ||
                      taskData.error_msg ||
                      taskData.message ||
                      '未知错误';
        throw new Error(`Sora 视频生成失败: ${errorMsg}`);
      } else if (status === 'processing' || status === 'in_progress' || status === 'pending' || status === 'Pending' || status === 'Running' || status === 'Waiting') {
        // 任务进行中，继续等待
        // console.log(`Sora 任务进行中... (${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else {
        // 其他状态，继续等待
        // console.log(`Sora 任务状态: ${status}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      console.warn(`Sora 查询任务状态失败 (尝试 ${attempt + 1}/${maxAttempts}):`, error);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error('Sora 视频生成超时，请稍后重试');
}
