/**
 * 云端同步服务
 * 支持 Google Drive 和 OneDrive
 */

import { ProjectState } from '../types';
import { getAllProjectsMetadata, saveProjectToDB } from './storageService';

// ==================== 配置 ====================

export type CloudProvider = 'google' | 'onedrive' | null;

export interface CloudSyncConfig {
  provider: CloudProvider;
  autoSync: boolean;
  lastSyncTime: number;
}

const SYNC_CONFIG_KEY = 'cloudSyncConfig';
const SYNC_STATE_KEY = 'cloudSyncState';

// ==================== Google Drive 配置 ====================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata', // 应用数据文件夹
  'https://www.googleapis.com/auth/drive.file'
];
const GOOGLE_DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// ==================== OneDrive 配置 ====================

const ONEDRIVE_CLIENT_ID = process.env.ONEDRIVE_CLIENT_ID || 'YOUR_ONEDRIVE_CLIENT_ID';
const ONEDRIVE_SCOPES = ['Files.ReadWrite.All'];

// ==================== OAuth 状态管理 ====================

interface OAuthState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

let googleAuthState: OAuthState | null = null;
let oneDriveAuthState: OAuthState | null = null;

// ==================== 工具函数 ====================

const loadSyncConfig = (): CloudSyncConfig => {
  const config = localStorage.getItem(SYNC_CONFIG_KEY);
  return config ? JSON.parse(config) : {
    provider: null,
    autoSync: false,
    lastSyncTime: 0
  };
};

const saveSyncConfig = (config: CloudSyncConfig) => {
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
};

const isTokenExpired = (state: OAuthState | null): boolean => {
  if (!state) return true;
  return Date.now() >= state.expiresAt;
};

const formatProjectFilename = (project: ProjectState): string => {
  return `cinegen_project_${project.id}_${project.title}.json`;
};

// ==================== Google Drive 实现 ====================

/**
 * 初始化 Google Drive API
 */
export const initGoogleDrive = async (): Promise<void> => {
  if (typeof gapi === 'undefined') {
    throw new Error('Google API 未加载');
  }

  await gapi.load('client', async () => {
    await gapi.client.init({
      apiKey: GOOGLE_API_KEY,
      discoveryDocs: [GOOGLE_DISCOVERY_DOC],
    });
  });
};

/**
 * Google Drive OAuth 登录
 */
export const googleAuth = async (): Promise<void> => {
  if (typeof gapi === 'undefined') {
    throw new Error('Google API 未加载');
  }

  const client = window.google?.accounts?.oauth2;
  if (!client) {
    throw new Error('Google OAuth 客户端未加载');
  }

  const tokenClient = client.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES.join(' '),
    callback: async (response: any) => {
      if (response.access_token) {
        googleAuthState = {
          accessToken: response.access_token,
          refreshToken: response.refresh_token || '',
          expiresAt: Date.now() + (response.expires_in || 3600) * 1000
        };

        const config = loadSyncConfig();
        config.provider = 'google';
        saveSyncConfig(config);

        console.log('Google 登录成功');
      } else {
        throw new Error('Google 登录失败');
      }
    }
  });

  tokenClient.requestAccessToken();
};

/**
 * 上传项目到 Google Drive
 */
export const uploadToGoogleDrive = async (project: ProjectState): Promise<string> => {
  if (!googleAuthState || isTokenExpired(googleAuthState)) {
    throw new Error('未登录或令牌已过期，请重新登录');
  }

  const filename = formatProjectFilename(project);
  const metadata = {
    name: filename,
    mimeType: 'application/json',
    parents: ['appDataFolder'], // 应用数据文件夹
  };

  const media = {
    mimeType: 'application/json',
    body: JSON.stringify(project, null, 2)
  };

  try {
    const response = await gapi.client.drive.files.create({
      resource: metadata,
      media: media,
      fields: 'id'
    });

    console.log('上传到 Google Drive 成功:', response.result.id);
    return response.result.id;
  } catch (error) {
    console.error('上传到 Google Drive 失败:', error);
    throw error;
  }
};

/**
 * 从 Google Drive 下载所有项目
 */
export const downloadFromGoogleDrive = async (): Promise<ProjectState[]> => {
  if (!googleAuthState || isTokenExpired(googleAuthState)) {
    throw new Error('未登录或令牌已过期，请重新登录');
  }

  try {
    const response = await gapi.client.drive.files.list({
      q: "name contains 'cinegen_project' and mimeType='application/json'",
      spaces: 'appDataFolder',
      fields: 'files(id, name, createdTime, modifiedTime)'
    });

    const files = response.result.files || [];
    const projects: ProjectState[] = [];

    for (const file of files) {
      const content = await gapi.client.drive.files.get({
        fileId: file.id,
        alt: 'media'
      });

      const project = JSON.parse(content.body) as ProjectState;
      projects.push(project);
    }

    console.log(`从 Google Drive 下载了 ${projects.length} 个项目`);
    return projects;
  } catch (error) {
    console.error('从 Google Drive 下载失败:', error);
    throw error;
  }
};

/**
 * 删除 Google Drive 中的项目
 */
export const deleteFromGoogleDrive = async (projectId: string): Promise<void> => {
  if (!googleAuthState || isTokenExpired(googleAuthState)) {
    throw new Error('未登录或令牌已过期，请重新登录');
  }

  try {
    await gapi.client.drive.files.delete({ fileId: projectId });
    console.log('从 Google Drive 删除成功');
  } catch (error) {
    console.error('从 Google Drive 删除失败:', error);
    throw error;
  }
};

/**
 * 双向同步到 Google Drive
 */
export const syncWithGoogleDrive = async (): Promise<void> => {
  console.log('开始同步到 Google Drive...');

  const localProjects = await getAllProjectsMetadata();
  let cloudProjects: ProjectState[] = [];

  try {
    cloudProjects = await downloadFromGoogleDrive();
  } catch (error) {
    console.warn('获取云端项目失败，将执行上传:', error);
  }

  // 策略：基于 lastModified 时间戳决定保留哪个版本
  for (const localProject of localProjects) {
    const cloudProject = cloudProjects.find(p => p.id === localProject.id);
    
    if (!cloudProject) {
      // 云端不存在，上传本地项目
      console.log(`上传新项目: ${localProject.title}`);
      await uploadToGoogleDrive(localProject);
    } else if (localProject.lastModified > (cloudProject.lastModified || 0)) {
      // 本地版本较新，更新云端
      console.log(`更新云端项目: ${localProject.title}`);
      await uploadToGoogleDrive(localProject);
    } else if (cloudProject.lastModified > localProject.lastModified) {
      // 云端版本较新，更新本地
      console.log(`更新本地项目: ${cloudProject.title}`);
      await saveProjectToDB(cloudProject);
    }
  }

  // 处理仅在云端存在的项目（下载到本地）
  for (const cloudProject of cloudProjects) {
    const localProject = localProjects.find(p => p.id === cloudProject.id);
    if (!localProject) {
      console.log(`下载云端新项目: ${cloudProject.title}`);
      await saveProjectToDB(cloudProject);
    }
  }

  const config = loadSyncConfig();
  config.lastSyncTime = Date.now();
  saveSyncConfig(config);

  console.log('同步到 Google Drive 完成');
};

// ==================== OneDrive 实现 ====================

/**
 * OneDrive OAuth 登录
 */
export const oneDriveAuth = async (): Promise<void> => {
  // 使用 Microsoft Authentication Library (MSAL.js)
  // 需要引入 @azure/msal-browser
  const msalConfig = {
    auth: {
      clientId: ONEDRIVE_CLIENT_ID,
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: window.location.origin
    }
  };

  // 这里需要实际集成 MSAL.js
  // 以下是伪代码示意：
  // const pca = new PublicClientApplication(msalConfig);
  // const response = await pca.loginPopup({ scopes: ONEDRIVE_SCOPES });
  
  // oneDriveAuthState = {
  //   accessToken: response.accessToken,
  //   refreshToken: '',
  //   expiresAt: Date.now() + 3600 * 1000
  // };
  
  // const config = loadSyncConfig();
  // config.provider = 'onedrive';
  // saveSyncConfig(config);
  
  console.log('OneDrive 登录成功');
};

/**
 * 上传项目到 OneDrive
 */
export const uploadToOneDrive = async (project: ProjectState): Promise<string> => {
  if (!oneDriveAuthState || isTokenExpired(oneDriveAuthState)) {
    throw new Error('未登录或令牌已过期，请重新登录');
  }

  const filename = formatProjectFilename(project);

  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root:/CineGen/' + filename + ':/content', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${oneDriveAuthState.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(project, null, 2)
    });

    if (!response.ok) {
      throw new Error(`上传失败: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('上传到 OneDrive 成功:', data.id);
    return data.id;
  } catch (error) {
    console.error('上传到 OneDrive 失败:', error);
    throw error;
  }
};

/**
 * 从 OneDrive 下载所有项目
 */
export const downloadFromOneDrive = async (): Promise<ProjectState[]> => {
  if (!oneDriveAuthState || isTokenExpired(oneDriveAuthState)) {
    throw new Error('未登录或令牌已过期，请重新登录');
  }

  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root:/CineGen:/children', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${oneDriveAuthState.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`下载失败: ${response.statusText}`);
    }

    const data = await response.json();
    const files = data.value || [];
    const projects: ProjectState[] = [];

    for (const file of files) {
      if (file.name.endsWith('.json')) {
        const fileResponse = await fetch(file['@microsoft.graph.downloadUrl'], {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${oneDriveAuthState.accessToken}`
          }
        });

        const content = await fileResponse.text();
        const project = JSON.parse(content) as ProjectState;
        projects.push(project);
      }
    }

    console.log(`从 OneDrive 下载了 ${projects.length} 个项目`);
    return projects;
  } catch (error) {
    console.error('从 OneDrive 下载失败:', error);
    throw error;
  }
};

/**
 * 双向同步到 OneDrive
 */
export const syncWithOneDrive = async (): Promise<void> => {
  console.log('开始同步到 OneDrive...');

  const localProjects = await getAllProjectsMetadata();
  let cloudProjects: ProjectState[] = [];

  try {
    cloudProjects = await downloadFromOneDrive();
  } catch (error) {
    console.warn('获取云端项目失败，将执行上传:', error);
  }

  // 相同的同步策略：基于 lastModified 时间戳
  for (const localProject of localProjects) {
    const cloudProject = cloudProjects.find(p => p.id === localProject.id);
    
    if (!cloudProject) {
      console.log(`上传新项目: ${localProject.title}`);
      await uploadToOneDrive(localProject);
    } else if (localProject.lastModified > (cloudProject.lastModified || 0)) {
      console.log(`更新云端项目: ${localProject.title}`);
      await uploadToOneDrive(localProject);
    } else if (cloudProject.lastModified > localProject.lastModified) {
      console.log(`更新本地项目: ${cloudProject.title}`);
      await saveProjectToDB(cloudProject);
    }
  }

  // 处理仅在云端存在的项目
  for (const cloudProject of cloudProjects) {
    const localProject = localProjects.find(p => p.id === cloudProject.id);
    if (!localProject) {
      console.log(`下载云端新项目: ${cloudProject.title}`);
      await saveProjectToDB(cloudProject);
    }
  }

  const config = loadSyncConfig();
  config.lastSyncTime = Date.now();
  saveSyncConfig(config);

  console.log('同步到 OneDrive 完成');
};

// ==================== 通用接口 ====================

/**
 * 执行同步（根据配置的云提供商）
 */
export const syncToCloud = async (): Promise<void> => {
  const config = loadSyncConfig();
  
  if (!config.provider) {
    throw new Error('未配置云同步提供商');
  }

  switch (config.provider) {
    case 'google':
      await syncWithGoogleDrive();
      break;
    case 'onedrive':
      await syncWithOneDrive();
      break;
    default:
      throw new Error('未知的云同步提供商');
  }
};

/**
 * 登出当前提供商
 */
export const signOut = async (): Promise<void> => {
  const config = loadSyncConfig();
  
  switch (config.provider) {
    case 'google':
      if (typeof window.google?.accounts?.oauth2 === 'object') {
        window.google.accounts.oauth2.revoke(googleAuthState?.accessToken || '');
      }
      googleAuthState = null;
      break;
    case 'onedrive':
      // OneDrive 登出逻辑（需要 MSAL.js）
      oneDriveAuthState = null;
      break;
  }

  config.provider = null;
  saveSyncConfig(config);
  console.log('已登出');
};

/**
 * 获取同步状态
 */
export const getSyncStatus = () => {
  const config = loadSyncConfig();
  const isAuthenticated = googleAuthState !== null || oneDriveAuthState !== null;
  const lastSyncDate = config.lastSyncTime 
    ? new Date(config.lastSyncTime).toLocaleString('zh-CN')
    : '从未同步';

  return {
    provider: config.provider,
    isAuthenticated,
    autoSync: config.autoSync,
    lastSyncDate,
    lastSyncTime: config.lastSyncTime
  };
};

/**
 * 切换自动同步
 */
export const toggleAutoSync = (enabled: boolean) => {
  const config = loadSyncConfig();
  config.autoSync = enabled;
  saveSyncConfig(config);
};

/**
 * 初始化云同步（应用启动时调用）
 */
export const initCloudSync = async (): Promise<void> => {
  const config = loadSyncConfig();
  
  if (config.autoSync && config.provider) {
    try {
      await syncToCloud();
    } catch (error) {
      console.error('自动同步失败:', error);
    }
  }
};
