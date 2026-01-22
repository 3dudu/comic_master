import { AIModelConfig } from '../types';

const DB_NAME = 'CineGenDB';
const DB_VERSION = 2;
const MODEL_STORE_NAME = 'aiModels';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(MODEL_STORE_NAME)) {
        db.createObjectStore(MODEL_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveModelConfig = async (config: AIModelConfig): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MODEL_STORE_NAME, 'readwrite');
    const store = tx.objectStore(MODEL_STORE_NAME);
    const request = store.put(config);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const loadModelConfig = async (id: string): Promise<AIModelConfig> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MODEL_STORE_NAME, 'readonly');
    const store = tx.objectStore(MODEL_STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) resolve(request.result);
      else reject(new Error("Model config not found"));
    };
    request.onerror = () => reject(request.error);
  });
};

export const getAllModelConfigs = async (): Promise<AIModelConfig[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MODEL_STORE_NAME, 'readonly');
    const store = tx.objectStore(MODEL_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const configs = request.result as AIModelConfig[];
      resolve(configs);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteModelConfig = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MODEL_STORE_NAME, 'readwrite');
    const store = tx.objectStore(MODEL_STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const createDefaultModelConfigs = async (): Promise<void> => {
  const existing = await getAllModelConfigs();
  if (existing.length > 0) return;

  // 从 localStorage 读取 API Key
  const storedApiKey = localStorage.getItem('cinegen_api_key') || '';

  const defaultConfigs: AIModelConfig[] = [
    {
      id: 'deepseek-llm',
      provider: 'deepseek',
      modelType: 'llm',
      model: 'deepseek-chat',
      apiKey: '',
      apiUrl: 'https://api.deepseek.com/v1',
      enabled: false,
      description: 'DeepSeek LLM'
    },
    {
      id: 'doubao-llm',
      provider: 'doubao',
      modelType: 'llm',
      model: 'doubao-1-5-pro-32k-250115',
      apiKey: storedApiKey,
      apiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      enabled: true,
      description: 'Doubao LLM'
    },
    {
      id: 'doubao-image',
      provider: 'doubao',
      modelType: 'text2image',
      model: 'doubao-seedream-4-5-251128',
      apiKey: storedApiKey,
      apiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      enabled: true,
      description: 'Doubao Image'
    },
    {
      id: 'doubao-video',
      provider: 'doubao',
      modelType: 'image2video',
      model: 'doubao-seedance-1-0-lite-i2v-250428',
      apiKey: storedApiKey,
      apiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      enabled: true,
      description: 'Doubao Video'
    },
    {
      id: 'yunwu-llm',
      provider: 'yunwu',
      modelType: 'llm',
      model: 'gemini-2.5-pro',
      apiKey: '',
      apiUrl: 'https://yunwu.ai',
      enabled: false,
      description: 'Yunwu LLM'
    },
    {
      id: 'yunwu-image',
      provider: 'yunwu',
      modelType: 'text2image',
      model: 'gemini-2.5-flash-image',
      apiKey: '',
      apiUrl: 'https://yunwu.ai',
      enabled: false,
      description: 'Yunwu Image'
    },
    {
      id: 'yunwu-video',
      provider: 'yunwu',
      modelType: 'image2video',
      model: 'veo-3.1-fast-generate-preview',
      apiKey: '',
      apiUrl: 'https://yunwu.ai',
      enabled: false,
      description: 'Yunwu Video'
    }
  ];

  for (const config of defaultConfigs) {
    await saveModelConfig(config);
  }
};

export const getModelConfigByType = async (
  provider: AIModelConfig['provider'],
  modelType: AIModelConfig['modelType']
): Promise<AIModelConfig | null> => {
  const allConfigs = await getAllModelConfigs();
  return allConfigs.find(c => c.provider === provider && c.modelType === modelType) || null;
};

// 获取当前启用的配置（按模型类型）
export const getEnabledConfigByType = async (
  modelType: AIModelConfig['modelType']
): Promise<AIModelConfig | null> => {
  const allConfigs = await getAllModelConfigs();
  return allConfigs.find(c => c.modelType === modelType && c.enabled) || null;
};

// 启用/禁用配置（确保同类型只有一个启用）
export const toggleConfigEnabled = async (id: string): Promise<void> => {
  const config = await loadModelConfig(id);
  if (!config) return;

  const allConfigs = await getAllModelConfigs();

  // 如果要启用该配置，需要禁用同类型的其他配置
  if (!config.enabled) {
    const updates = allConfigs
      .filter(c => c.modelType === config.modelType && c.id !== id)
      .map(c => ({ ...c, enabled: false }));

    for (const update of updates) {
      await saveModelConfig(update);
    }
  }

  // 切换当前配置的启用状态
  await saveModelConfig({ ...config, enabled: !config.enabled });
};

// 保存配置时确保同类型只有一个启用
export const saveModelConfigWithExclusiveEnabled = async (config: AIModelConfig): Promise<void> => {
  const allConfigs = await getAllModelConfigs();

  // 如果启用了该配置，需要禁用同类型的其他配置
  if (config.enabled) {
    const updates = allConfigs
      .filter(c => c.modelType === config.modelType && c.id !== config.id)
      .map(c => ({ ...c, enabled: false }));

    for (const update of updates) {
      await saveModelConfig(update);
    }
  }

  await saveModelConfig(config);
};
