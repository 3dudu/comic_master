// services/bigmoreService.ts
// BigMore AI 视频生成服务

const BIGMORE_CONFIG = {
  // 视频生成模型
  VIDEO_MODEL: "veo3_fast",

  // API 端点
  API_ENDPOINT: "https://bigmoreai.com",
};
/**
 * 必填，模型选择：veo2_fast、veo2_quality、veo3_fast、veo3_quality、veo31_fast、veo31_quality、veo31_fast_ingredients。
 */

// Module-level variable to store key at runtime
let runtimeApiKey: string = "";
let runtimeApiUrl: string = BIGMORE_CONFIG.API_ENDPOINT;

// Runtime model name (can be overridden by config)
let runtimeVideoModel: string = BIGMORE_CONFIG.VIDEO_MODEL;

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
  runtimeApiUrl = url || BIGMORE_CONFIG.API_ENDPOINT;
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
  runtimeVideoModel = modelName || BIGMORE_CONFIG.VIDEO_MODEL;
}

/**
 * 获取当前模型名称
 */
export function getModel(): string {
  return runtimeVideoModel;
}

/**
 * 生成视频（图生视频/文生视频）
 * @param prompt - 视频提示词
 * @param startImageBase64 - 起始图片的URL或base64（可选，用于图生视频）
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
  imageSize: string = "2560x1440",
): Promise<string> {
  if (!runtimeApiKey) {
    throw new Error('BigMore API Key 未设置');
  }

    const [width, height] = imageSize.split('x').map(Number);
    const isLandscape = width > height;
    const size = isLandscape ? '1280x720' : '720x1280';
  try {
    // 构建请求参数
    const requestBody: any = {
      model: runtimeVideoModel,
      prompt: prompt,
    };
    if(runtimeVideoModel.includes('sora')){
      requestBody.orientation = isLandscape?'landscape':'portrait';
      requestBody.duration = duration>10?15:10;
      requestBody.removeWatermark = true;
    }else{
      requestBody.action = startImageBase64 ? 'image2video' : 'text2video';
      requestBody.aspectRatio = isLandscape?'16:9':'9:16';
      requestBody.translation = false;
    }
    // 处理起始图片（图生视频）
    if (startImageBase64) {
      const match = startImageBase64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if(runtimeVideoModel.includes('sora')){
        if (match) {
          // base64 格式 - 需要上传到服务器获取 URL，这里简化处理
          requestBody.imageList = [startImageBase64];
        } else if (startImageBase64.startsWith('http')) {
          // URL 格式
          requestBody.imageList = [startImageBase64];
        } else {
          requestBody.imageList = [startImageBase64];
        }
      }else{
        if (match) {
          // base64 格式 - 需要上传到服务器获取 URL，这里简化处理
          requestBody.images = [startImageBase64];
        } else if (startImageBase64.startsWith('http')) {
          // URL 格式
          requestBody.images = [startImageBase64];
        } else {
          requestBody.images = [startImageBase64];
        }
      }
    }

    // console.log('调用 BigMore 视频生成:', requestBody);

    // 发送生成请求
    let endpoint = '/ai/gemini/video/generate';
    if(runtimeVideoModel.includes('sora')){
      endpoint = '/ai/sora/video/generate';
    }
    const aikey = runtimeApiKey.split(':')[0];
    const generateResponse = await fetch(runtimeApiUrl+endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AIKey': aikey
      },
      body: JSON.stringify(requestBody)
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      throw new Error(`BigMore 生成请求失败: ${generateResponse.status} - ${errorText}`);
    }

    const generateData = await generateResponse.json();
    
    // 根据响应格式获取任务ID
    if (generateData.code !== 0) {
      throw new Error(`BigMore 生成请求失败: ${generateData.info || '未知错误'}`);
    }
    
    const taskId = generateData.result?.taskCode;

    if (!taskId) {
      throw new Error('BigMore 未返回任务ID');
    }

    // console.log('BigMore 任务ID:', taskId);

    // 轮询任务状态
    return await pollTaskStatus(taskId);

  } catch (error) {
    console.error('BigMore 视频生成失败:', error);
    throw error;
  }
}

/**
 * 查询任务状态
 * @param taskId - 任务ID
 * @returns 任务状态
 */
async function getTaskStatus(taskId: string): Promise<any> {
  // BigMore 查询接口 - 根据实际接口调整
  let endpoint = '/ai/gemini/result';
  if(runtimeVideoModel.includes('sora')){
    endpoint = '/ai/sora/result';
  }
  const accountPass = runtimeApiKey.split(':')[1];
  const aikey = runtimeApiKey.split(':')[0];

  const statusUrl = `${runtimeApiUrl}${endpoint}?accountPass=${accountPass}&code=${taskId}`;

  const response = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'AIKey': aikey
    }
  });

  if (!response.ok) {
    throw new Error(`BigMore 查询任务状态失败: ${response.status}`);
  }

  return await response.json();
}

/**
 * 轮询任务状态直到完成
 * @param taskId - 任务ID
 * @returns 视频URL
 */
async function pollTaskStatus(taskId: string): Promise<string> {
  const maxAttempts = 300; // 最多等待5分钟（每次1秒）
  const pollInterval = 10000; // 1秒

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const taskData = await getTaskStatus(taskId);

      console.log('查询任务状态:', taskData);
      // 检查响应状态码
      if (taskData.code !== 0) {
        throw new Error(`BigMore 查询失败: ${taskData.info || '未知错误'}`);
      }

      // 检查任务状态
      const result = taskData.result;
      const status = result?.status;

      if (status === 1) {
        // 任务完成
        const videoUrl = result?.videoUrl;
        if (videoUrl) {
          console.log('BigMore 视频生成成功:', videoUrl);
          return videoUrl;
        }
      } else {
        // 其他状态，继续等待
        console.log(`BigMore 任务状态: ${status}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      if (error instanceof Error){
        throw error;
      }
      console.warn(`BigMore 查询任务状态失败 (尝试 ${attempt + 1}/${maxAttempts}):`, error);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error('BigMore 视频生成超时，请稍后重试');
}
