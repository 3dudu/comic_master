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

  const defaultConfigs: AIModelConfig[] = [
    {
      id: 'doubao-llm',
      provider: 'doubao',
      modelType: 'llm',
      apiKey: '',
      apiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      enabled: true
    },
    {
      id: 'doubao-image',
      provider: 'doubao',
      modelType: 'text2image',
      apiKey: '',
      apiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      enabled: true
    },
    {
      id: 'doubao-video',
      provider: 'doubao',
      modelType: 'image2video',
      apiKey: '',
      apiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      enabled: true
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
