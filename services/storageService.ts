import { AIModelConfig, ProjectState } from '../types';

const DB_NAME = 'CineGenDB';
const DB_VERSION = 2;
const STORE_NAME = 'projects';
const MODEL_STORE_NAME = 'aiModels';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(MODEL_STORE_NAME)) {
        db.createObjectStore(MODEL_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveProjectToDB = async (project: ProjectState): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const p = { ...project, lastModified: Date.now() };
    const request = store.put(p);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const loadProjectFromDB = async (id: string): Promise<ProjectState> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) resolve(request.result);
      else reject(new Error("Project not found"));
    };
    request.onerror = () => reject(request.error);
  });
};

export const getAllProjectsMetadata = async (): Promise<ProjectState[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll(); 
    request.onsuccess = () => {
       const projects = request.result as ProjectState[];
       // Sort by last modified descending
       projects.sort((a, b) => b.lastModified - a.lastModified);
       resolve(projects);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteProjectFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// ==================== AI Model Config Functions ====================

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


// Initial template for new projects
export const createNewProjectState = (): ProjectState => {
  const id = 'proj_' + Date.now().toString(36);
  return {
    id,
    title: '未命名项目',
    createdAt: Date.now(),
    lastModified: Date.now(),
    stage: 'script',
    targetDuration: '60s', // Default duration now 60s
    language: '中文', // Default language
    visualStyle: '写实',
    imageSize: '1440x2560', // Default image size (vertical)
    imageCount: 1, // Default image count (1 image per generation)
    rawScript: `标题：示例剧本

场景 1
外景。夜晚街道 - 雨夜
霓虹灯在水坑中反射出破碎的光芒。
侦探（30岁，穿着风衣）站在街角，点燃了一支烟。

侦探
这雨什么时候才会停？`,
    scriptData: null,
    shots: [],
    isParsingScript: false,
    // Default to empty providers (will be set by user)
    modelProviders: {
      llm: undefined,
      text2image: undefined,
      image2video: undefined,
    },
  };
};

// Export project to JSON file
export const exportProjectToFile = (project: ProjectState): void => {
  const dataStr = JSON.stringify(project, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.title}_${project.id}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Import project from JSON file
export const importProjectFromFile = (): Promise<ProjectState> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    let eventTriggered = false;

    input.onchange = async (e) => {
      eventTriggered = true;
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      try {
        const text = await file.text();
        const projectData = JSON.parse(text) as ProjectState;

        // Validate project data
        if (!projectData.id || !projectData.title || !projectData.createdAt) {
          reject(new Error('Invalid project file format'));
          return;
        }
        resolve(projectData);
      } catch (error) {
        reject(error);
      }
    };
    input.onabort = () => {
      if (!eventTriggered) {
        reject(new Error('Import cancelled'));
      }
    };
    input.oncancel = input.onabort;
    input.click();
  });
};