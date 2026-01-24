// services/klingService.ts
// Kling 可灵视频生成服务

const KLING_CONFIG = {
  // 视频生成模型
  VIDEO_MODEL: "kling-v1",

  // API 端点
  API_ENDPOINT: "https://yunwu.ai/kling/v1/videos/image2video",
};

// Module-level variable to store key at runtime
let runtimeApiKey: string = "";
let runtimeApiUrl: string = KLING_CONFIG.API_ENDPOINT;

// Runtime model name (can be overridden by config)
let runtimeVideoModel: string = KLING_CONFIG.VIDEO_MODEL;

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
  runtimeApiUrl = url || KLING_CONFIG.API_ENDPOINT;
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
  runtimeVideoModel = modelName || KLING_CONFIG.VIDEO_MODEL;
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
  fullFrame: boolean = false
): Promise<string> {
  if (!runtimeApiKey) {
    throw new Error('Kling API Key 未设置');
  }

  if (!startImageBase64) {
    throw new Error('Kling 可灵需要起始图片');
  }

  try {
    // 构建请求参数
    const requestBody: any = {
      model_name: runtimeVideoModel,
      image: startImageBase64,
      prompt: prompt,
      negative_prompt: '',
      cfg_scale: 0.5,
      mode: 'std',
      duration: duration
    };
    if(runtimeVideoModel.indexOf("2-6")>0){
      requestBody.sound = 'on';
    }

    const match = startImageBase64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (match) {
      requestBody.image =  match[2];
    }else {
      requestBody.image = startImageBase64;
    }

    // 处理结束图片（如果不是宫格模式）
    if (endImageBase64 && !fullFrame) {
      const match = endImageBase64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (match) {
        requestBody.image_tail =  match[2];
      }else {
        requestBody.image_tail = endImageBase64;
      }
    }

    console.log('调用 Kling 可灵视频生成:', requestBody);

    // 发送生成请求
    const generateResponse = await fetch(runtimeApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${runtimeApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      throw new Error(`Kling 生成请求失败: ${generateResponse.status} - ${errorText}`);
    }

    const generateData = await generateResponse.json();
    const taskId = generateData.task_id;

    if (!taskId) {
      throw new Error('Kling 未返回任务ID');
    }

    console.log('Kling 任务ID:', taskId);

    // 轮询任务状态
    return await pollTaskStatus(taskId);

  } catch (error) {
    console.error('Kling 视频生成失败:', error);
    throw error;
  }
}

/**
 * 查询任务状态
 * @param taskId - 任务ID
 * @returns 任务状态
 */
async function getTaskStatus(taskId: string): Promise<any> {
  // 从生成URL推断查询URL
  const queryUrl = runtimeApiUrl;

  const response = await fetch(`${queryUrl}/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${runtimeApiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Kling 查询任务状态失败: ${response.status}`);
  }

  return await response.json();
}

/**
 * 轮询任务状态直到完成
 * @param taskId - 任务ID
 * @returns 视频URL
 */
async function pollTaskStatus(taskId: string): Promise<string> {
  const maxAttempts = 120; // 最多等待2分钟（每次1秒）
  const pollInterval = 1000; // 1秒

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const taskData = await getTaskStatus(taskId);

      // 检查任务状态
      // 根据云雾API的响应格式，状态可能在 data.data.status 或 data.status
      const status = taskData.data?.data?.status || taskData.data?.status;

      if (status === 'Succeeded' || status === 'Success') {
        // 任务完成
        const videoUrl = taskData.data?.data?.file?.download_url || taskData.data?.file?.download_url || taskData.data?.data?.video_url || taskData.data?.video_url;
        if (videoUrl) {
          console.log('Kling 视频生成成功:', videoUrl);
          return videoUrl;
        }
      } else if (status === 'Failed' || status === 'Error') {
        // 任务失败
        const errorMsg = taskData.error_msg || taskData.message || taskData.data?.error_msg || '未知错误';
        throw new Error(`Kling 视频生成失败: ${errorMsg}`);
      } else if (status === 'Processing' || status === 'Running' || status === 'Pending') {
        // 任务进行中，继续等待
        console.log(`Kling 任务进行中... (${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else {
        // 其他状态，继续等待
        console.log(`Kling 任务状态: ${status}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      console.warn(`Kling 查询任务状态失败 (尝试 ${attempt + 1}/${maxAttempts}):`, error);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error('Kling 视频生成超时，请稍后重试');
}
