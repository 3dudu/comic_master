// services/cozeService.ts

// Coze API 配置
const COZE_CONFIG = {
  API_ENDPOINT: "https://api.coze.cn/v1/workflow/run",
  WORKFLOW_ID: "7597429093042929707",
  API_KEY: "pat_UyN3EKu0my3NDq9O2tXxLVoznCgABYRdrUtEkb4X83NUU24gmDCh4h5ZTpzkiqQX",
};

// Helper for authentication headers
const getAuthHeaders = () => {
  return {
    "Authorization": `Bearer ${COZE_CONFIG.API_KEY}`,
    "Content-Type": "application/json",
  };
};

// Helper for retry logic
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
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
  retries: number = 3
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
    workflow_id: COZE_CONFIG.WORKFLOW_ID,
    parameters: {
      video_url: videoUrls
    },
  };

  try {
    const response = await fetchWithRetry(endpoint, {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    console.log("Coze workflow response:", JSON.stringify(response));

    // Coze workflow 返回的数据结构：{code:0, data:"{\"output\":\"...\"}"}
    // data 字段是 JSON 字符串，需要解析后再获取 output
    if (response?.data) {
      try {
        const parsedData = JSON.parse(response.data);
        if (parsedData.output) {
          console.log("视频合并成功:", parsedData.output);
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
