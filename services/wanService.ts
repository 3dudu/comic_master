// services/wanService.ts
// Wan 视频生成服务 (通义万象)

const WAN_CONFIG = {
  // 视频生成模型
  VIDEO_MODEL: "wan2.5-i2v-preview",

  // API 端点
  API_ENDPOINT: "https://yunwu.ai/alibailian/api/v1/services/aigc/video-generation/video-synthesis",
};

// Module-level variable to store key at runtime
let runtimeApiKey: string = "";
let runtimeApiUrl: string = WAN_CONFIG.API_ENDPOINT;

// Runtime model name (can be overridden by config)
let runtimeVideoModel: string = WAN_CONFIG.VIDEO_MODEL;

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
  runtimeApiUrl = url || WAN_CONFIG.API_ENDPOINT;
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
  runtimeVideoModel = modelName || WAN_CONFIG.VIDEO_MODEL;
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
    throw new Error('Wan API Key 未设置');
  }

  try {
    // 构建请求参数
    const requestBody: any = {
      model: runtimeVideoModel,
      input: {
        prompt: prompt,
      },
      parameters: {
        resolution: '720P',
        prompt_extend: true,
        audio: true
      }
    };

    // 处理起始图片
    if (startImageBase64) {
      if (startImageBase64.startsWith('http')) {
        // URL 格式
        requestBody.input.img_url = startImageBase64;
      } else {
        // base64 格式，需要上传到图床或直接使用（根据API支持情况）
        // 这里假设 API 支持 base64 或需要转换为 URL
        requestBody.input.img_url = startImageBase64;
      }
    }

    // 处理结束图片（如果不是宫格模式）
    if (endImageBase64 && !fullFrame) {
      if (endImageBase64.startsWith('http')) {
        requestBody.input.end_img_url = endImageBase64;
      } else {
        requestBody.input.end_img_url = endImageBase64;
      }
    }

    // 设置时长（如果 API 支持）
    if (duration) {
      requestBody.parameters.duration = duration >= 10 ? 10 : 5;
    }

    // console.log('调用 Wan 视频生成:', requestBody);

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
      throw new Error(`Wan 生成请求失败: ${generateResponse.status} - ${errorText}`);
    }

    const generateData = await generateResponse.json();
    const taskId = generateData.output?.task_id;

    if (!taskId) {
      throw new Error('Wan 未返回任务ID');
    }

    // console.log('Wan 任务ID:', taskId);

    // 轮询任务状态
    return await pollTaskStatus(taskId);

  } catch (error) {
    console.error('Wan 视频生成失败:', error);
    throw error;
  }
}

/**
 * 查询任务状态
 * @param taskId - 任务ID
 * @returns 任务状态
 */
async function getTaskStatus(taskId: string): Promise<any> {
  const statusUrl = `${runtimeApiUrl.replace('/video-synthesis', '')}/video-synthesis/${taskId}`;

  const response = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${runtimeApiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Wan 查询任务状态失败: ${response.status}`);
  }

  return await response.json();
}

/**
 * 轮询任务状态直到完成
 * @param taskId - 任务ID
 * @returns 视频URL
 */
async function pollTaskStatus(taskId: string): Promise<string> {
  const maxAttempts = 180; // 最多等待3分钟（每次1秒）
  const pollInterval = 1000; // 1秒

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const taskData = await getTaskStatus(taskId);

      // 检查任务状态
      // Wan 可能的状态: 'PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'
      const status = taskData.output?.task_status || taskData.task_status;

      if (status === 'SUCCEEDED' || status === 'SUCCESS' || status === 'Success') {
        // 任务完成
        const videoUrl = taskData.output?.video_url ||
                      taskData.output?.url ||
                      taskData.video_url ||
                      taskData.url;
        if (videoUrl) {
          // console.log('Wan 视频生成成功:', videoUrl);
          return videoUrl;
        }
      } else if (status === 'FAILED' || status === 'Failed' || status === 'CANCELLED' || status === 'Cancelled') {
        // 任务失败
        const errorMsg = taskData.message || taskData.error?.message || '未知错误';
        throw new Error(`Wan 视频生成失败: ${errorMsg}`);
      } else if (status === 'PENDING' || status === 'RUNNING' || status === 'Pending' || status === 'Running') {
        // 任务进行中，继续等待
        // console.log(`Wan 任务进行中... (${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else {
        // 其他状态，继续等待
        // console.log(`Wan 任务状态: ${status}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      console.warn(`Wan 查询任务状态失败 (尝试 ${attempt + 1}/${maxAttempts}):`, error);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error('Wan 视频生成超时，请稍后重试');
}
