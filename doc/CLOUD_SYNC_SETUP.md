# 云同步配置指南

本指南将帮助你配置 CineGen-AI 的云同步功能，支持 Google Drive 和 OneDrive。

## 功能概述

云同步功能可以将你的项目数据在多设备之间同步，备份到云端，并在离线编辑后自动上传。

**主要特性：**
- ✅ 支持 Google Drive 和 OneDrive
- ✅ 基于时间戳的智能冲突解决
- ✅ 自动同步选项
- ✅ 离线支持
- ✅ 安全的 OAuth 2.0 认证

## 快速开始

### 1. Google Drive 配置

#### 步骤 1: 创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 进入 **API 和服务** > **凭据**
4. 点击 **创建凭据** > **OAuth 客户端 ID**
5. 应用类型选择 **Web 应用**
6. 配置已授权的 JavaScript 来源：
   - 开发环境: `http://localhost:5173`
   - 生产环境: `https://your-domain.com`
7. 点击 **创建**

#### 步骤 2: 启用 Google Drive API

1. 在 API 和服务中，搜索并启用 **Google Drive API**
2. 配额限制保持默认即可（免费用户每天 100,000 次请求）

#### 步骤 3: 获取 API 密钥

1. 在凭据页面创建 **API 密钥**
2. 复制客户端 ID 和 API 密钥

#### 步骤 4: 配置环境变量

在项目根目录创建 `.env` 文件：

```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_API_KEY=your_api_key_here
```

#### 步骤 5: 加载 Google API SDK

在 `index.html` 的 `<head>` 中添加：

```html
<script src="https://apis.google.com/js/api.js"></script>
<script src="https://accounts.google.com/gsi/client"></script>
```

### 2. OneDrive 配置

#### 步骤 1: 注册 Microsoft Azure 应用

1. 访问 [Azure Portal](https://portal.azure.com/)
2. 进入 **Azure AD** > **应用注册**
3. 点击 **新注册**
4. 配置应用：
   - 名称: `CineGen-AI`
   - 支持的账户类型: `任何组织目录中的帐户和个人 Microsoft 帐户`
   - 重定向 URI: `http://localhost:5173`（开发）或你的生产域名
5. 点击 **注册**

#### 步骤 2: 配置权限

1. 在应用页面，进入 **API 权限**
2. 添加权限：
   - Microsoft Graph: `Files.ReadWrite.All`
3. 授予管理员同意（个人账户可以自行同意）

#### 步骤 3: 配置环境变量

在 `.env` 文件中添加：

```env
ONEDRIVE_CLIENT_ID=your_client_id_here
```

#### 步骤 4: 安装 MSAL.js

```bash
npm install @azure/msal-browser
```

然后修改 `cloudSyncService.ts` 中的 OneDrive 认证部分：

```typescript
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: ONEDRIVE_CLIENT_ID,
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin
  }
};

const pca = new PublicClientApplication(msalConfig);
```

## 使用方法

### 在 React 组件中使用

```tsx
import CloudSyncSettings from '../components/CloudSyncSettings';
import { initCloudSync } from '../services/cloudSyncService';

// 在应用初始化时
useEffect(() => {
  initCloudSync();
}, []);

// 在设置页面渲染
<CloudSyncSettings 
  onSyncComplete={() => console.log('同步完成')}
  onSyncError={(error) => console.error('同步失败:', error)}
/>
```

### 手动触发同步

```typescript
import { syncToCloud } from '../services/cloudSyncService';

try {
  await syncToCloud();
  console.log('同步成功');
} catch (error) {
  console.error('同步失败:', error);
}
```

### 检查同步状态

```typescript
import { getSyncStatus } from '../services/cloudSyncService';

const status = getSyncStatus();
console.log({
  provider: status.provider,      // 'google' | 'onedrive' | null
  isAuthenticated: status.isAuthenticated,
  autoSync: status.autoSync,
  lastSyncDate: status.lastSyncDate
});
```

## 同步策略

### 冲突解决

同步使用 **基于时间戳的策略**：

1. **本地项目不存在于云端** → 上传到云端
2. **云端项目不存在于本地** → 下载到本地
3. **本地和云端都存在** → 比较 `lastModified` 时间戳：
   - 本地更新 → 更新云端
   - 云端更新 → 更新本地
   - 时间相同 → 无操作

### 数据格式

每个项目保存为独立的 JSON 文件：

```
cinegen_project_{projectId}_{projectTitle}.json
```

包含完整的 `ProjectState` 对象，包括：
- 项目元数据（标题、创建时间等）
- 剧本数据
- 角色和场景
- 镜头列表
- AI 模型配置

## API 限制

### Google Drive
- **免费配额**: 每日 100,000 次请求
- **存储**: 15 GB（Google 账户总配额）
- **文件大小**: 单个文件 5 GB

### OneDrive
- **免费配额**: 每分钟 6000 次请求
- **存储**: 5 GB（个人账户）
- **文件大小**: 单个文件 250 GB

## 安全建议

1. **不要提交 `.env` 文件到版本控制**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **使用 HTTPS**（生产环境）
   - OAuth 回调必须使用 HTTPS
   - 本地开发可以使用 HTTP

3. **限制权限范围**
   - Google Drive: 使用 `drive.appdata` 而非 `drive`（更安全）
   - OneDrive: 使用 `Files.ReadWrite.AppFolder`

4. **定期轮换密钥**
   - 每 90-180 天更新 OAuth 凭据

## 故障排除

### Google Drive 连接失败

**问题**: 点击登录没有反应或报错

**解决方案**:
1. 检查控制台错误
2. 确认 `.env` 中的 `GOOGLE_CLIENT_ID` 正确
3. 确认已授权的 JavaScript 来源包含当前域名
4. 检查浏览器是否拦截了弹窗

### OneDrive 连接失败

**问题**: 登录跳转后返回错误

**解决方案**:
1. 确认重定向 URI 与 Azure 配置匹配
2. 检查是否已授予 `Files.ReadWrite.All` 权限
3. 清除浏览器缓存并重试

### 同步失败

**问题**: 同步时出现网络错误

**解决方案**:
1. 检查网络连接
2. 检查 Token 是否过期（自动刷新机制）
3. 查看浏览器控制台获取详细错误信息
4. 确认云端存储有足够空间

### 冲突未正确解决

**问题**: 本地和云端数据不一致

**解决方案**:
1. 检查项目的 `lastModified` 字段
2. 手动导出本地项目为 JSON 文件备份
3. 断开连接后重新连接，强制完全同步
4. 联系技术支持获取数据恢复帮助

## 最佳实践

1. **定期备份**
   - 即使有云同步，也建议定期手动导出项目

2. **网络不稳定时禁用自动同步**
   - 在 `CloudSyncSettings` 中关闭自动同步
   - 在网络稳定时手动触发同步

3. **小团队协作**
   - 不同人编辑同一项目可能导致冲突
   - 建议每人有自己的项目副本
   - 使用版本控制（Git）管理项目文件

4. **监控配额使用**
   - 定期检查 API 使用情况
   - Google Cloud Console > API 和服务 > 仪表板
   - Azure Portal > 应用 > 概览

## 技术支持

如遇到问题，请：
1. 查看浏览器开发者工具的控制台日志
2. 检查 `localStorage` 中的 `cloudSyncConfig`
3. 验证 IndexedDB 中的数据完整性

## 下一步

- [ ] 添加 WebDAV 支持（支持更多云存储）
- [ ] 实现增量同步（仅传输变更部分）
- [ ] 添加冲突解决 UI（让用户手动选择版本）
- [ ] 支持多设备实时同步（WebSocket）
- [ ] 添加同步日志查看器
