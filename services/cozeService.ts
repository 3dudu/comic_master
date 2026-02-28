// services/cozeService.ts

// Coze API 配置
const COZE_CONFIG = {
  API_ENDPOINT: "https://api.coze.cn/v1/workflow/run",
  WORKFLOW_ID: "",
  API_KEY: "",
};

// Module-level variables to store config at runtime
let runtimeWorkflowId: string = COZE_CONFIG.WORKFLOW_ID;
let runtimeApiKey: string = COZE_CONFIG.API_KEY;

export const setCozeWorkflowId = (workflowId: string) => {
  runtimeWorkflowId = workflowId || COZE_CONFIG.WORKFLOW_ID;
};

export const setCozeApiKey = (apiKey: string) => {
  runtimeApiKey = apiKey || COZE_CONFIG.API_KEY;
};

// 从配置服务加载启用的配置
export const initializeCozeConfig = async () => {
  try {
    const storedWorkflowId = localStorage.getItem('cinegen_coze_workflow_id');
    const storedApiKey = localStorage.getItem('cinegen_coze_api_key');

    if (storedWorkflowId) {
      runtimeWorkflowId = storedWorkflowId;
      //console.log('Coze 工作流 ID 已加载');
    }
    if (storedApiKey) {
      runtimeApiKey = storedApiKey;
      //console.log('Coze API Key 已加载');
    }
  } catch (error) {
    console.error('加载 Coze 配置失败:', error);
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
  let lastError: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (e: unknown) {
      lastError = e;
      // Check for quota/rate limit errors (429)
      const error = e as { status?: number; code?: number; message?: string };
      if (
        error.status === 429 ||
        error.code === 429 ||
        error.message?.includes("429") ||
        error.message?.includes("quota") ||
        error.message?.includes("RATE_LIMIT")
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

// Helper to make HTTP requests to Coze API
const fetchWithRetry = async (
  endpoint: string,
  options: RequestInit,
  retries: number = 1
): Promise<any> => {
  return retryOperation(async () => {
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    };

    // GET 请求不应该有 body
    if (options.method === "GET") {
      delete requestOptions.body;
    }

    const response = await fetch(endpoint, requestOptions);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Coze API Error (${response.status}): ${error.error?.message || error.message || JSON.stringify(error)}`
      );
    }

    return response.json();
  }, retries);
};

/**
 * 合并视频
 * 使用 Coze workflow 将多个视频片段合并为一个完整的视频
 * @param videoUrls 视频 URL 数组
 * @returns 合并后的视频 URL
 */
export const mergeVideos = async (videoUrls: string[]): Promise<string> => {
  if (!videoUrls || videoUrls.length === 0) {
    throw new Error("视频 URL 列表不能为空");
  }

  const endpoint = COZE_CONFIG.API_ENDPOINT;

  const requestBody = {
    workflow_id: runtimeWorkflowId,
    parameters: {
      video_url: videoUrls
    },
  };

  try {
    const response = await fetchWithRetry(endpoint, {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    //console.log("Coze workflow response:", JSON.stringify(response));

    // Coze workflow 返回的数据结构：{code:0, data:"{\"output\":\"...\"}"}
    // data 字段是 JSON 字符串，需要解析后再获取 output
    if (response?.data) {
      try {
        const parsedData = JSON.parse(response.data);
        if (parsedData.output) {
          //console.log("视频合并成功:", parsedData.output);
          return parsedData.output;
        }
      } catch (e) {
        console.error("解析 data 字段失败:", e);
      }
    }

    throw new Error("未找到合并后的视频 URL");
  } catch (error: any) {
    console.error("合并视频失败:", error);
    throw error;
  }
};

/**
 * 工作流执行状态
 */
export enum WorkflowStatus {
  RUNNING = "running",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  CANCELLED = "cancelled",
  UNKNOWN = "unknown"
}

/**
 * 工作流执行结果
 */
interface WorkflowExecutionResult {
  status: WorkflowStatus;
  data?: any;
  error?: string;
}

/**
 * 提交工作流执行
 * @param workflowId 工作流 ID
 * @param parameters 工作流参数
 * @returns 执行 ID
 */
export const submitWorkflow = async (
  videoUrls: string[]
): Promise<string> => {
  const endpoint = COZE_CONFIG.API_ENDPOINT;

  const requestBody = {
    workflow_id: runtimeWorkflowId,
    parameters: {
      video_url: videoUrls
    },
    is_async: true
  };

  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  //console.log("工作流提交响应:", JSON.stringify(response));
  // Coze API 返回格式: {code: 0, data: {id: "workflow_execution_id", ...}}
  const execute_id = response.execute_id;
  if (!execute_id) {
    throw new Error("视频生成失败");
  }

  // 轮询任务状态
  const videoUrl = await pollVideoTask(execute_id);
  return videoUrl;

  throw new Error("未找到工作流执行 ID");
};

// 轮询视频生成任务
const pollVideoTask = async (executionId: string): Promise<string> => {
  const endpoint = `${COZE_CONFIG.API_ENDPOINT.replace('/workflow/run', `/workflows/${runtimeWorkflowId}/run_histories/${executionId}`)}`;

  let attempts = 0;
  const maxAttempts = 120; // 最多轮询 5 分钟

  while (attempts < maxAttempts) {
    const response = await fetchWithRetry(endpoint, {
      method: "GET",
    });

    const status = response.code;
    if (status === 0 && response?.data.length > 0) {
      if (response?.data[0].execute_status=='Success') {
        try {
          const parsedData = JSON.parse(response.data[0].output);
          //console.log("视频合并成功:", parsedData);
          if (parsedData.Output) {
            const out = JSON.parse(parsedData.Output);
            //console.log("视频合并成功:", out.output);
            return out.output;
          }
        } catch (e) {
          console.error("解析 data 字段失败:", e);
        }
      }
    } else {
      throw new Error(`视频合成失败: ${response.msg}`);
    }

    // 等待 5 秒后继续轮询
    await new Promise((resolve) => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error("视频生成超时");
};

