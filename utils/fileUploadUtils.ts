/**
 * 文件上传工具类
 * 支持远程URL和Base64格式文件上传到本地服务
 */

/**
 * 上传参数接口
 */
export interface UploadFileParams {
  fileType: string; // 文件类型，如 'char', 'image', 'video' 等
  fileUrl?: string; // 远程文件URL
  base64Data?: string; // Base64格式的文件数据（包含或不包含data URL前缀）
  fileName?: string; // 可选的文件名，如不提供则自动生成
}

/**
 * 获取文件上传服务配置
 * @returns 文件上传服务地址，如果没有配置则返回 null
 */
function getFileUploadServiceConfig(): string | null {
  const uploadServiceUrl = localStorage.getItem('cinegen_file_upload_service_url');
  return uploadServiceUrl || null;
}

/**
 * 获取文件访问域名配置
 * @returns 文件访问域名，如果没有配置则返回 null
 */
function getFileAccessDomainConfig(): string | null {
  const accessDomain = localStorage.getItem('cinegen_file_access_domain');
  return accessDomain || null;
}

/**
 * 处理文件URL，替换域名并移除查询参数
 * @param originalUrl - 原始URL
 * @returns 处理后的URL
 */
function processFileUrl(originalUrl: string): string {
  try {
    // 创建 URL 对象
    const url = new URL(originalUrl);

    // 获取路径部分（不包含查询参数）
    const path = url.pathname;

    // 从配置获取目标域名
    const targetDomain = getFileAccessDomainConfig();

    if (targetDomain) {
      // 使用配置的域名
      if(targetDomain.startsWith('http')){
        return `${targetDomain}${path}`;
      }else{
        return `//${targetDomain}${path}`;
      }
    } else {
      // 默认使用 ofs.good365.net:6443
      return `//ofs.good365.net:6443${path}`;
    }
  } catch (error) {
    console.error('处理URL失败:', error);
    // 如果URL解析失败，尝试简单处理：移除查询参数
    const pathWithoutParams = originalUrl.split('?')[0];
    return pathWithoutParams;
  }
}

/**
 * 上传响应接口
 */
export interface UploadFileResponse {
  success: boolean;
  data?: {
    url?: string;
    fileName?: string;
    fileSize?: number;
    fileUrl?: string;
    fileType?: string;
    [key: string]: any;
  };
  message?: string;
  error?: string;
}

/**
 * 上传文件到本地服务
 * @param params - 上传参数
 * @returns Promise<UploadFileResponse> - 上传响应
 */
export async function uploadFileToService(params: UploadFileParams): Promise<UploadFileResponse> {
  const { fileType, fileUrl, base64Data, fileName } = params;

  // 检查是否配置了上传服务地址
  const uploadServiceUrl = getFileUploadServiceConfig();
  if (!uploadServiceUrl) {
    //console.log('未配置文件上传服务地址，跳过文件上传');

    // 如果是 Base64 数据，返回原始数据
    if (base64Data) {
      return {
        success: true,
        data: {
          url: base64Data,
          fileUrl: base64Data,
          fileName: fileName || 'image',
          fileType: fileType || 'image'
        }
      };
    }

    // 如果是远程 URL，返回原始 URL
    if (fileUrl) {
      return {
        success: true,
        data: {
          url: fileUrl,
          fileUrl: fileUrl,
          fileName: fileName || 'file',
          fileType: fileType || 'image'
        }
      };
    }

    return {
      success: false,
      error: '未配置文件上传服务地址且未提供有效文件数据'
    };
  }

  // 验证参数
  if (!fileUrl && !base64Data) {
    throw new Error('必须提供 fileUrl 或 base64Data 其中之一');
  }

  if (fileUrl && base64Data) {
    throw new Error('不能同时提供 fileUrl 和 base64Data');
  }

  try {
    // 构建请求参数
    const formData: Record<string, string> = {
      fileType: fileType || 'image'
    };

    // 如果提供的是base64数据，直接传递fileBase64和fileName参数
    if (base64Data) {
      const pureBase64 = extractPureBase64(base64Data);
      const fileExtension = detectFileExtensionFromBase64(base64Data);
      const finalFileName = fileName || `${Date.now()}.${fileExtension}`;

      formData.fileBase64 = pureBase64;
      formData.fileName = finalFileName;
    } else {
      formData.fileUrl = fileUrl!;
    }

    // 使用配置的上传服务地址
    const response = await fetch(uploadServiceUrl, {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(formData).toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`上传失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const apiResponse = await response.json();

    // 检查API返回的code
    if (apiResponse.code !== 200) {
      throw new Error(apiResponse.message || '上传失败');
    }

    // 处理fileUrl：替换域名并移除查询参数
    const originalFileUrl = apiResponse.data?.fileUrl || '';
    const processedFileUrl = originalFileUrl ? processFileUrl(originalFileUrl) : '';

    // 提取fileUrl并返回
    return {
      success: true,
      data: {
        url: processedFileUrl,
        fileUrl: processedFileUrl,
        fileName: apiResponse.data?.fileName,
        fileSize: apiResponse.data?.fileSize,
        fileType: apiResponse.data?.fileType
      },
      message: apiResponse.message
    };
  } catch (error) {
    console.error('文件上传失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 从Base64字符串中提取纯数据部分（不包含data URL前缀）
 * @param base64Data - Base64格式的数据（可能包含data URL前缀）
 * @returns 纯Base64字符串
 */
function extractPureBase64(base64Data: string): string {
  // 如果包含data URL前缀，提取纯base64部分
  const match = base64Data.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/);
  return match ? match[1] : base64Data;
}

/**
 * 从Base64数据检测文件扩展名
 * @param base64Data - Base64数据（可能包含data URL前缀）
 * @returns 文件扩展名
 */
function detectFileExtensionFromBase64(base64Data: string): string {
  // 检查是否有MIME类型前缀
  const mimeMatch = base64Data.match(/^data:image\/([a-zA-Z]+);/);
  if (mimeMatch) {
    return mimeMatch[1];
  }

  // 如果没有MIME类型，默认使用png
  return 'png';
}

/**
 * 批量上传文件
 * @param fileList - 文件参数数组
 * @returns Promise<UploadFileResponse[]> - 上传响应数组
 */
export async function uploadFilesToService(
  fileList: UploadFileParams[]
): Promise<UploadFileResponse[]> {
  const promises = fileList.map(params => uploadFileToService(params));
  return Promise.all(promises);
}

/**
 * 上传单个远程URL文件
 * @param fileUrl - 远程文件URL
 * @param fileType - 文件类型
 * @returns Promise<UploadFileResponse>
 */
export async function uploadRemoteFile(
  fileUrl: string,
  fileType: string = 'image'
): Promise<UploadFileResponse> {
  return uploadFileToService({
    fileType,
    fileUrl
  });
}

/**
 * 上传单个Base64文件
 * @param base64Data - Base64格式的文件数据
 * @param fileType - 文件类型
 * @param fileName - 可选的文件名
 * @returns Promise<UploadFileResponse>
 */
export async function uploadBase64File(
  base64Data: string,
  fileType: string = 'image',
  fileName?: string
): Promise<UploadFileResponse> {
  return uploadFileToService({
    fileType,
    base64Data,
    fileName
  });
}
