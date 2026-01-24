/**
 * 图片工具函数
 * 提供图片URL到Base64的转换功能
 */

/**
 * 将图片URL转换为Base64格式
 * @param imageUrl - 图片URL或data URL
 * @returns Promise<string> - 返回 data:image/xxx;base64, 格式的字符串
 */
export async function imageUrlToBase64(imageUrl: string): Promise<string> {
  // 如果已经是base64格式，直接返回
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  try {
    // 获取图片
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // 转换为blob
    const blob = await response.blob();

    // 读取为base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // 移除可能的文件前缀，确保格式为 data:image/xxx;base64,
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image URL to base64:', error);
    throw new Error(`Failed to convert image URL to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 批量转换图片URL数组为Base64格式
 * @param imageUrls - 图片URL数组
 * @returns Promise<string[]> - 返回Base64格式的字符串数组
 */
export async function imageUrlsToBase64(imageUrls: string[]): Promise<string[]> {
  const promises = imageUrls.map(url => imageUrlToBase64(url));
  return Promise.all(promises);
}

/**
 * 从Base64字符串中提取MIME类型
 * @param base64String - Base64格式的图片字符串
 * @returns MIME类型 (例如: image/png, image/jpeg)
 */
export function getMimeTypeFromBase64(base64String: string): string {
  const match = base64String.match(/^data:(image\/[a-zA-Z]+);base64,/);
  return match ? match[1] : 'image/png';
}

/**
 * 从Base64字符串中提取纯数据部分（不包含前缀）
 * @param base64String - Base64格式的图片字符串
 * @returns 纯Base64数据
 */
export function getPureBase64Data(base64String: string): string {
  const match = base64String.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/);
  return match ? match[1] : base64String;
}
