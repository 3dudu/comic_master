
// 百度语音合成服务
const TTS_URL = 'https://tsn.baidu.com';

let runtimeApiKey: string = '';
let runtimeApiUrl: string = TTS_URL;


/**
 * 设置 API Key 和 Secret Key
 */
export function setApiKey(apiKeyParam: string) {
  runtimeApiKey = apiKeyParam;
}

export function setApiUrl(url: string): void {
  runtimeApiUrl = url || TTS_URL;
}

/**
 * URL 编码（RFC 3986）
 */
function encodeURIComponentRFC3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
  });
}


// Helper for retry logic
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 1,
  baseDelay: number = 2000
): Promise<T> => {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (e: any) {
      lastError = e;
      // Check for quota/rate limit errors (429)
      if (
        e.status === 429 ||
        e.code === 429 ||
        e.message?.includes("429") ||
        e.message?.includes("quota") ||
        e.message?.includes("RATE_LIMIT")
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

const getAuthHeaders = () => {
  return {
    "Authorization": `Bearer ${runtimeApiKey}`,
    "Content-Type": "application/json",
  };
};

const fetchWithRetry = async (
  endpoint: string,
  options: RequestInit,
  retries: number = 1
): Promise<any> => {
  return retryOperation(async () => {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `API Error (${response.status}): ${error.error?.message || error.message}`
      );
    }

    return response;
  }, retries);
};

/**
 * 文本转语音
 * @param text - 要合成的文本
 * @param options - 可选参数
 * @returns - 音频的 Blob 对象
 */
export async function textToSpeech(
  text: string,
  options: {
    spd?: number; // 语速 0-15，默认5
    pit?: number; // 音调 0-15，默认5
    vol?: number; // 音量，基础音库0-9，精品音库0-15，默认5
    per?: number; // 发音人，默认0（度小美）
    aue?: number; // 音频格式，3=mp3(默认)，4=pcm-16k，5=pcm-8k，6=wav
  } = {}
): Promise<Blob> {
  if (!runtimeApiKey) {
    throw new Error('请先设置百度 TTS 的 API Key');
  }

  if (!text || text.trim() === '') {
    throw new Error('文本不能为空');
  }

  try {
    // 默认参数
    const params: any = {
      tex: text,
      tok: '',
      cuid: generateCuid(),
      ctp: 1, // web端
      lan: 'zh', // 中文
      spd: options.spd || 5,
      pit: options.pit || 5,
      vol: options.vol || 5,
      per: options.per || 0, // 度小美
      aue: options.aue || 3, // mp3
    };

    // 对 tex 进行2次 URL 编码
    const encodedText = params.tex;

    // 构建 form data
    const formData = new URLSearchParams();
    formData.append('tex', encodedText);
    formData.append('tok', params.tok);
    formData.append('cuid', params.cuid);
    formData.append('ctp', params.ctp.toString());
    formData.append('lan', params.lan);
    formData.append('spd', params.spd.toString());
    formData.append('pit', params.pit.toString());
    formData.append('vol', params.vol.toString());
    formData.append('per', params.per.toString());
    formData.append('aue', params.aue.toString());

    // 发送请求
    const endpoint = `${runtimeApiUrl}/text2audio`;
    const response = await fetchWithRetry(endpoint, {
      method: "POST",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'cuid': params.cuid,
        'Authorization': `Bearer ${runtimeApiKey}`,
      },
      body: formData.toString(),
    });
    // 检查 Content-Type
    const contentType = response.headers.get('Content-Type');

    if (!contentType?.startsWith('audio/')) {
      // 如果不是音频，说明出错了
      const errorText = await response.text();
      console.error('百度 TTS 错误响应:', errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(`语音合成失败: ${errorData.err_msg || errorData.err_no || '未知错误'}`);
      } catch {
        throw new Error(`语音合成失败: ${errorText}`);
      }
    }

    // 返回音频 Blob
    const audioBlob = await response.blob();

    //console.log('百度 TTS 语音合成成功，音频大小:', audioBlob.size, 'bytes');
    return audioBlob;
  } catch (error) {
    console.error('百度 TTS 语音合成失败:', error);
    throw error;
  }
}

/**
 * 生成 cuid（用户唯一标识）
 */
function generateCuid(): string {
  // 使用机器随机数作为 cuid
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Blob 转 Base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // 移除 data URL 前缀
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 文本转语音并返回 Base64
 */
export async function textToSpeechBase64(
  text: string,
  options?: Parameters<typeof textToSpeech>[1]
): Promise<string> {
  const blob = await textToSpeech(text, options);
  return blobToBase64(blob);
}
