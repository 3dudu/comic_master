// services/minimaxService.ts
// MiniMax 海螺视频生成服务

let apiKey = '';
let apiUrl = 'https://yunwu.ai/minimax/v1/video_generation';

/**
 * 设置 API Key
 */
export function setApiKey(key: string): void {
  apiKey = key;
}

/**
 * 设置 API URL
 */
export function setApiUrl(url: string): void {
  apiUrl = url;
}

/**
 * 获取 API Key
 */
export function getApiKey(): string {
  return apiKey;
}

/**
 * 获取 API URL
 */
export function getApiUrl(): string {
  return apiUrl;
}

/**
 * 生成视频（图生视频）
 * @param prompt - 视频提示词
 * @param startImageBase64 - 起始图片的URL
 * @param endImageBase64 - 结束图片的URL（暂不支持）
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
  if (!apiKey) {
    throw new Error('MiniMax API Key 未设置');
  }

  if (!startImageBase64) {
    throw new Error('MiniMax 海螺需要起始图片');
  }

  try {
    // 构建请求参数
    const requestBody:any = {
      model: 'MiniMax-Hailuo-2.3',
      prompt: prompt,
      duration: duration>7?10:6,
      first_frame_image: startImageBase64,
      resolution: '768P',
      prompt_optimizer: true
    };

    // 处理结束图片（如果火山引擎支持）
    if (endImageBase64 && !fullFrame) {
      requestBody.last_frame_image = endImageBase64;
    }
    console.log('调用 MiniMax 海螺视频生成:', requestBody);

    // 发送生成请求
    const generateResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      throw new Error(`MiniMax 生成请求失败: ${generateResponse.status} - ${errorText}`);
    }

    const generateData = await generateResponse.json();
    const taskId = generateData.task_id;

    if (!taskId) {
      throw new Error('MiniMax 未返回任务ID');
    }

    console.log('MiniMax 任务ID:', taskId);

    // 轮询任务状态
    return await pollTaskStatus(taskId);

  } catch (error) {
    console.error('MiniMax 视频生成失败:', error);
    throw error;
  }
}

/**
 * 查询任务状态
 * @param taskId - 任务ID
 * @returns 任务状态
 */
async function getTaskStatus(taskId: string): Promise<any> {
  const statusUrl = `${apiUrl.replace('/video_generation', '')}/query/video_generation`;

  const response = await fetch(`${statusUrl}?task_id=${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`MiniMax 查询任务状态失败: ${response.status}`);
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
      const status = taskData.data?.data?.status || taskData.data?.status;

      if (status === 'Success') {
        // 任务完成
        if (taskData.data.data.file.download_url) {
          console.log('MiniMax 视频生成成功:', taskData.data.data.file.download_url);
          return taskData.data.data.file.download_url;
        }
      } else if (status === 'Failed' || status === 'Cancelled' ) {
        // 任务失败
        const errorMsg = taskData.error_msg || taskData.base_resp?.status_msg || '未知错误';
        throw new Error(`MiniMax 视频生成失败: ${errorMsg}`);
      } else if (status === 'Running' || status === 'Waiting') {
        // 任务进行中，继续等待
        console.log(`MiniMax 任务进行中... (${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else {
        // 其他状态
        console.log(`MiniMax 任务状态: ${status}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      console.warn(`MiniMax 查询任务状态失败 (尝试 ${attempt + 1}/${maxAttempts}):`, error);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error('MiniMax 视频生成超时，请稍后重试');
}
