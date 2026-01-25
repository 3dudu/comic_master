# CineGen-AI 前后端分离改造方案

> **AI 漫剧工场 - 企业级架构升级文档**  
> *Enterprise Architecture Upgrade Plan*

---

## 目录

- [项目背景与目标](#项目背景与目标)
- [技术选型](#技术选型)
- [架构设计](#架构设计)
- [数据模型设计](#数据模型设计)
- [API 接口设计](#api-接口设计)
- [文件存储方案](#文件存储方案)
- [安全设计](#安全设计)
- [开发计划](#开发计划)
- [迁移方案](#迁移方案)

---

## 项目背景与目标

### 当前架构

**纯前端架构**：
- 所有数据存储在浏览器 IndexedDB
- API 调用直接在浏览器端发起
- 无后端服务，无多用户支持
- 大模型返回的文件 URL 存在浏览器本地

### 痛点分析

1. **数据安全风险**
   - API Key 存储在 localStorage，易泄露
   - 项目数据本地存储，设备丢失无法恢复
   - 无权限控制，任何人可访问设备

2. **文件过期问题**
   - 大模型返回的图片/视频 URL 有有效期（通常 7-30 天）
   - URL 过期后项目无法正常使用
   - 无法永久保存生成资源

3. **多用户支持缺失**
   - 无法区分不同用户的项目
   - 无法实现团队协作
   - 无法追踪用户使用情况

4. **扩展性限制**
   - 无法实现用户订阅计费
   - 无法做使用量统计
   - 无法做服务监控和限流

### 改造目标

✅ **核心目标**：
1. 实现完整的多用户系统
2. 大模型调用转移到后台，保护 API Key
3. 持久化存储图片/视频到云存储
4. 前端功能基本保持不变
5. 支持用户权限和协作（可选）

---

## 技术选型

### 后端技术栈

#### 方案对比

| 技术栈 | 优势 | 劣势 | 推荐度 |
|---------|--------|--------|---------|
| **Node.js + NestJS** | 与前端技术栈统一、TypeScript 支持、企业级框架 | AI 生态相对较弱 | ⭐⭐⭐⭐ |
| **Python + FastAPI** | AI 生态丰富、异步性能强、Python 在 AI 领域成熟 | 需要跨语言协作 | ⭐⭐⭐⭐⭐⭐ |
| **Go + Gin** | 性能最强、部署轻量 | 学习曲线陡峭、生态较小 | ⭐⭐⭐ |

#### 推荐方案：**Python + FastAPI**

**理由**：
1. AI 领域最成熟，LangChain、OpenAI SDK 完美支持
2. 异步性能强，适合处理大模型并发请求
3. 自动生成 API 文档（Swagger/OpenAPI）
4. Python 包管理简单，依赖清晰
5. 团队技术栈统一（如果团队有 Python 背景）

### 前端技术栈

**保持现有技术**：
- React 19 + TypeScript
- Tailwind CSS
- Vite

**新增依赖**：
- Axios（HTTP 请求）
- Zustand 或 Redux Toolkit（状态管理，可选）

### 数据库

| 数据库 | 用途 | 推荐度 |
|---------|--------|---------|
| **PostgreSQL** | 主数据库（用户、项目、配置） | ⭐⭐⭐⭐⭐ |
| **Redis** | 缓存、会话、限流 | ⭐⭐⭐⭐⭐ |

**推荐：PostgreSQL 14+**

**理由**：
- 强大的 JSON 支持（存储 shot 数据）
- 优秀的全文搜索能力（项目搜索）
- 企业级可靠性
- 免费开源，成本低

### 文件存储

#### 方案对比

| 存储方案 | 优势 | 劣势 | 推荐度 |
|-----------|--------|--------|---------|
| **腾讯云 COS** | 国内稳定、价格低、CDN 加速 | 厂商绑定 | ⭐⭐⭐⭐⭐ |
| **阿里云 OSS** | 国内稳定、生态完善 | 价格较高 | ⭐⭐⭐⭐⭐ |
| **AWS S3** | 全球最稳定、生态最强 | 国内访问慢 | ⭐⭐⭐ |
| **MinIO** | 开源、自建、无厂商绑定 | 需要运维成本 | ⭐⭐⭐ |

**推荐方案：腾讯云 COS（国内） + MinIO（备选/私有化）**

#### 存储策略

**图片/视频存储**：
```
/cinegen/
  /users/{userId}/
    /projects/{projectId}/
      /characters/          # 角色图
      /scenes/               # 场景图
      /keyframes/start/      # 起始帧
      /keyframes/end/        # 结束帧
      /keyframes/full/       # 宫格图
      /videos/               # 视频文件
      /exports/              # 导出文件
```

**URL 签名**：
- 使用预签名 URL（Presigned URL）
- 设置合理过期时间（1-7 天）
- 下载限流控制

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  React App (现有前端)                    │  │
│  │  - Dashboard, Script, Assets, Director    │  │
│  │  - Export                                  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         ↕ HTTPS (REST API)
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway (Nginx)              │
└─────────────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────────┐
│                 Backend Services                   │
│                                                     │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │  Auth Service   │  │  Project Service│    │
│  │  - 用户认证      │  │  - 项目CRUD     │    │
│  │  - 权限管理      │  │  - 权限控制      │    │
│  └──────────────────┘  └──────────────────┘    │
│                                                     │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │  AI Service     │  │  Storage Service│    │
│  │  - 模型调度     │  │  - 文件上传     │    │
│  │  - API调用      │  │  - URL签名      │    │
│  │  - 结果处理     │  │  - 缓存管理     │    │
│  └──────────────────┘  └──────────────────┘    │
│                     ↕                             │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │  Queue Service  │  │  Cache Service  │    │
│  │  - 任务队列     │  │  - Redis缓存    │    │
│  │  - 进度追踪     │  │  - 会话管理     │    │
│  └──────────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
          ↕                 ↕              ↕
┌────────────────┐  ┌─────────────────┐  ┌─────────────┐
│ PostgreSQL  │  │ 腾讯云 COS     │  │ Redis       │
└────────────────┘  └─────────────────┘  └─────────────┘
          ↕                 ↕              ↕
┌─────────────────────────────────────────────────────┐
│          External AI Services                   │
│  - OpenAI, Gemini, Doubao, DeepSeek        │
│  - Yunwu, MiniMax, Kling                   │
└─────────────────────────────────────────────────────┘
```

### 后端服务模块

#### 1. 认证服务 (Auth Service)

**功能**：
- 用户注册/登录/登出
- JWT Token 生成和验证
- 密码加密存储（bcrypt）
- Token 刷新机制
- 权限验证中间件

**API 端点**：
```
POST   /api/v1/auth/register    # 用户注册
POST   /api/v1/auth/login       # 用户登录
POST   /api/v1/auth/logout      # 用户登出
POST   /api/v1/auth/refresh     # Token 刷新
GET    /api/v1/auth/me          # 获取当前用户信息
```

#### 2. 项目服务 (Project Service)

**功能**：
- 项目 CRUD（创建、读取、更新、删除）
- 项目权限管理（所有者、协作者）
- 项目列表分页查询
- 项目搜索（标题、类型）

**API 端点**：
```
GET    /api/v1/projects              # 获取项目列表
POST   /api/v1/projects              # 创建项目
GET    /api/v1/projects/{id}         # 获取项目详情
PUT    /api/v1/projects/{id}         # 更新项目
DELETE /api/v1/projects/{id}         # 删除项目
POST   /api/v1/projects/{id}/share  # 分享项目
```

#### 3. AI 服务 (AI Service)

**功能**：
- 大模型 API 调用封装
- 模型配置动态加载
- 请求队列管理
- 限流和重试
- 结果存储到云存储

**AI 提供商适配器**：
```
providers/
  ├── base.py              # 基础适配器
  ├── openai.py            # OpenAI 适配器
  ├── gemini.py            # Gemini 适配器
  ├── doubao.py            # Doubao 适配器
  ├── deepseek.py          # DeepSeek 适配器
  ├── yunwu.py             # Yunwu 适配器
  ├── minimax.py           # MiniMax 适配器
  └── kling.py             # Kling 适配器
```

**API 端点**：
```
POST   /api/v1/ai/script/parse          # 剧本解析
POST   /api/v1/ai/script/generate       # 剧本生成
POST   /api/v1/ai/shots/generate        # 分镜生成
POST   /api/v1/ai/visual-prompt       # 视觉提示词生成
POST   /api/v1/ai/image/generate        # 图片生成
POST   /api/v1/ai/video/generate        # 视频生成
GET    /api/v1/ai/tasks/{taskId}       # 查询任务状态
```

#### 4. 存储服务 (Storage Service)

**功能**：
- 文件上传（分块上传）
- URL 预签名生成
- 文件删除
- CDN 加速配置
- 存储配额管理

**API 端点**：
```
POST   /api/v1/storage/upload           # 文件上传（返回预签名URL）
POST   /api/v1/storage/upload/chunk    # 分块上传
GET    /api/v1/storage/url/{fileId}    # 获取下载URL
DELETE /api/v1/storage/file/{fileId}    # 删除文件
GET    /api/v1/storage/usage          # 存储使用量
```

#### 5. 任务队列服务 (Queue Service)

**功能**：
- 异步任务处理
- 任务进度追踪
- WebSocket 实时推送
- 任务失败重试

**任务类型**：
```
- script_parse      # 剧本解析
- shot_generate     # 分镜生成
- image_generate   # 图片生成
- video_generate   # 视频生成
- video_merge      # 视频合并
```

**WebSocket 端点**：
```
WS     /api/v1/ws/tasks                # 任务进度推送
```

---

## 数据模型设计

### 数据库 ER 图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Users     │─────│   Projects  │─────│   Files     │
│             │     │             │     │             │
│ - id        │     │ - id        │     │ - id        │
│ - email     │─────│ - userId     │     │ - projectId  │
│ - password  │     │ - title      │     │ - type      │
│ - name      │     │ - settings  │     │ - key       │
│ - createdAt │     │ - createdAt │     │ - url       │
│ - updatedAt │     │ - updatedAt │     │ - size      │
│ - quota     │     │ - stage      │     │ - createdAt │
│ - status    │     └─────────────┘     │ - expiresAt │
└─────────────┘                           └─────────────┘
    │
    └──────────────────┐
                     │
              ┌─────────────┐
              │   Tasks     │
              │             │
              │ - id        │
              │ - userId     │
              │ - projectId  │
              │ - type      │
              │ - status    │
              │ - progress  │
              │ - result    │
              │ - createdAt │
              │ - updatedAt │
              └─────────────┘
```

### 表结构设计

#### users 表

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',  -- active, suspended, deleted
  quota_total INTEGER DEFAULT 0,           -- 总配额（字节）
  quota_used INTEGER DEFAULT 0,            -- 已用配额
  api_config JSONB,                      -- 用户API配置（加密）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

#### projects 表

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  stage VARCHAR(50) DEFAULT 'script',    -- script, assets, director, export
  raw_script TEXT,
  target_duration VARCHAR(20),
  language VARCHAR(10) DEFAULT 'zh',
  visual_style VARCHAR(50),
  image_size VARCHAR(20),
  image_count INTEGER DEFAULT 1,
  
  -- JSONB 字段存储复杂数据
  script_data JSONB,
  shots JSONB,
  settings JSONB,
  
  merged_video_url VARCHAR(500),
  
  status VARCHAR(20) DEFAULT 'active',     -- active, archived, deleted
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created ON projects(created_at DESC);
```

#### files 表

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- 文件分类
  file_type VARCHAR(20) NOT NULL,          -- character, scene, keyframe, video, export
  file_subtype VARCHAR(20),                -- start, end, full
  
  -- 存储信息
  storage_provider VARCHAR(20),            -- cos, minio, s3
  storage_key VARCHAR(500) NOT NULL,        -- 存储路径 key
  storage_url VARCHAR(500),                -- 临时 URL（如需）
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100),
  
  -- 元数据
  metadata JSONB,                          -- 宽、高、生成参数等
  
  -- URL 签名
  presigned_url VARCHAR(1000),
  presigned_expires_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP                      -- 文件过期时间（大模型返回的URL）
);

CREATE INDEX idx_files_project ON files(project_id, file_type);
CREATE INDEX idx_files_storage ON files(storage_key);
CREATE INDEX idx_files_expires ON files(expires_at);
```

#### tasks 表

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  task_type VARCHAR(50) NOT NULL,          -- script_parse, shot_generate, etc.
  task_status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
  
  progress INTEGER DEFAULT 0,                -- 0-100
  error_message TEXT,
  result JSONB,                             -- 任务结果数据
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_tasks_user ON tasks(user_id, created_at DESC);
CREATE INDEX idx_tasks_status ON tasks(task_status);
```

---

## API 接口设计

### 通用规范

**Base URL**: `https://api.cinegen.com/api/v1`

**请求格式**：
```json
{
  "data": { /* 业务数据 */ },
  "meta": { /* 元数据 */ }
}
```

**响应格式**：
```json
{
  "success": true,
  "data": { /* 业务数据 */ },
  "message": "操作成功",
  "code": 0,
  "timestamp": 1234567890
}
```

**错误格式**：
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token 无效或已过期",
    "details": {}
  },
  "timestamp": 1234567890
}
```

### 认证相关接口

#### 用户注册
```http
POST /auth/register
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123",
  "name": "张三"
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "张三"
    },
    "token": {
      "access": "eyJhbGciOiJIUzI1NiIs...",
      "refresh": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 86400
    }
  }
}
```

#### 用户登录
```http
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "token": { /* 同注册 */ },
    "user": { /* 同注册 */ }
  }
}
```

#### 获取当前用户
```http
GET /auth/me
Authorization: Bearer {access_token}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "张三",
      "quota_total": 10737418240,  // 10GB
      "quota_used": 536870912,    // 5GB
      "quota_percent": 50
    }
  }
}
```

### 项目相关接口

#### 获取项目列表
```http
GET /projects?page=1&size=20&search=keyword&status=active
Authorization: Bearer {access_token}

Response:
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "我的第一个项目",
        "stage": "director",
        "status": "active",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-02T00:00:00Z",
        "thumbnail": "https://cdn.cinegen.com/..."  // 首图
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

#### 创建项目
```http
POST /projects
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "title": "新项目",
  "target_duration": "60s",
  "language": "zh",
  "visual_style": "写实",
  "image_size": "2560x1440",
  "image_count": 1
}

Response:
{
  "success": true,
  "data": {
    "project": {
      "id": "uuid",
      "title": "新项目",
      "stage": "script",
      "created_at": "2024-01-01T00:00:00Z",
      "settings": { /* ... */ }
    }
  }
}
```

#### 更新项目
```http
PUT /projects/{id}
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "title": "更新后的标题",
  "stage": "assets",
  "script_data": { /* ... */ },
  "shots": [ /* ... */ ]
}

Response:
{
  "success": true,
  "data": {
    "project": { /* 更新后的项目对象 */ }
  }
}
```

### AI 服务接口

#### 剧本解析
```http
POST /ai/script/parse
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "project_id": "uuid",
  "raw_text": "完整的剧本文本...",
  "language": "zh",
  "provider": "doubao",
  "model_config": {
    "text_model": "doubao-1.5-pro-32k"
  }
}

Response:
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "status": "pending",
    "message": "剧本解析任务已提交，请稍候..."
  }
}
```

#### 图片生成
```http
POST /ai/image/generate
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "project_id": "uuid",
  "shot_id": "uuid",
  "keyframe_type": "start",  // start, end, full
  "prompt": "一个穿着古装的少女...",
  "provider": "gemini",
  "model_config": {
    "image_model": "gemini-2.5-flash-image"
  },
  "reference_images": [
    "https://cdn.cinegen.com/users/.../ref1.jpg"
  ]
}

Response:
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "status": "pending",
    "estimated_time": 30  // 预计完成时间（秒）
  }
}
```

#### 视频生成
```http
POST /ai/video/generate
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "project_id": "uuid",
  "shot_id": "uuid",
  "prompt": "镜头运动：推近；取景：中景...",
  "provider": "yunwu",
  "model_config": {
    "video_model": "veo-3.1-fast"
  },
  "start_image_url": "https://cdn.cinegen.com/.../start.jpg",
  "end_image_url": "https://cdn.cinegen.com/.../end.jpg",
  "duration": 5,
  "full_frame": false
}

Response:
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "status": "pending"
  }
}
```

#### 查询任务状态
```http
GET /ai/tasks/{taskId}
Authorization: Bearer {access_token}

Response:
{
  "success": true,
  "data": {
    "task": {
      "id": "uuid",
      "type": "image_generate",
      "status": "running",
      "progress": 45,
      "result": {
        "url": "https://cdn.cinegen.com/...",
        "file_id": "uuid"
      }
    }
  }
}
```

### 存储接口

#### 获取上传 URL（预签名）
```http
POST /storage/upload
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "file_name": "character_001.jpg",
  "file_type": "character",
  "file_size": 1024000,
  "project_id": "uuid",
  "content_type": "image/jpeg"
}

Response:
{
  "success": true,
  "data": {
    "upload_url": "https://cos.ap-beijing.myqcloud.com/...",
    "upload_headers": {
      "Content-Type": "image/jpeg",
      "Authorization": "q-sign-algorithm=..."
    },
    "file_id": "uuid",
    "storage_key": "users/{userId}/projects/{projectId}/characters/{fileId}.jpg"
  }
}
```

#### 文件上传回调
```http
POST /storage/upload/callback
Content-Type: application/json

Request:
{
  "file_id": "uuid",
  "upload_status": "success",  // success, failed
  "actual_size": 1024000,
  "md5": "d41d8cd98f00b204e9800998ecf8427e"
}

Response:
{
  "success": true,
  "data": {
    "file": {
      "id": "uuid",
      "url": "https://cdn.cinegen.com/...",
      "presigned_url": "https://cdn.cinegen.com/...",
      "presigned_expires_at": "2024-01-08T00:00:00Z"
    }
  }
}
```

---

## 文件存储方案

### 腾讯云 COS 集成

#### 配置
```python
# config/cos_config.py
COS_CONFIG = {
    "secret_id": "your_secret_id",
    "secret_key": "your_secret_key",
    "region": "ap-beijing",
    "bucket": "cinegen-production",
    "cdn_domain": "cdn.cinegen.com"
}
```

#### 上传流程

```python
from qcloud_cos_v3 import CosS3Client, CosConfig

class COSService:
    def __init__(self):
        self.config = CosConfig(
            Region=COS_CONFIG['region'],
            SecretId=COS_CONFIG['secret_id'],
            SecretKey=COS_CONFIG['secret_key']
        )
        self.client = CosS3Client(self.config)
        self.bucket = COS_CONFIG['bucket']
    
    def generate_presigned_url(self, key, expires=3600):
        """生成预签名 URL（1小时有效）"""
        return self.client.get_presigned_url(
            Method=HttpVerb.PUT,
            Bucket=self.bucket,
            Key=key,
            Expired=expires
        )
    
    def upload_file(self, key, file_path):
        """上传文件"""
        self.client.upload_file(
            Bucket=self.bucket,
            Key=key,
            LocalFilePath=file_path
        )
        return self._get_public_url(key)
    
    def delete_file(self, key):
        """删除文件"""
        self.client.delete_object(
            Bucket=self.bucket,
            Key=key
        )
    
    def _get_public_url(self, key):
        """获取公开访问 URL"""
        return f"https://{COS_CONFIG['cdn_domain']}/{key}"
```

### 存储配额管理

#### 配额模型

```python
class QuotaService:
    def check_quota(self, user_id, required_bytes):
        """检查用户是否有足够配额"""
        user = db.get_user(user_id)
        available = user.quota_total - user.quota_used
        return available >= required_bytes
    
    def update_quota(self, user_id, used_bytes):
        """更新配额"""
        db.increase_quota_used(user_id, used_bytes)
    
    def get_quota_info(self, user_id):
        """获取配额信息"""
        user = db.get_user(user_id)
        return {
            "total": user.quota_total,
            "used": user.quota_used,
            "available": user.quota_total - user.quota_used,
            "percent": round(user.quota_used / user.quota_total * 100, 2)
        }
```

### 文件过期处理

#### 定期清理任务

```python
from apscheduler.schedulers.background import BackgroundScheduler

def cleanup_expired_files():
    """清理过期文件"""
    expired_files = db.get_expired_files()
    for file in expired_files:
        try:
            storage_service.delete_file(file.storage_key)
            db.delete_file(file.id)
            logger.info(f"Deleted expired file: {file.id}")
        except Exception as e:
            logger.error(f"Failed to delete file {file.id}: {e}")

# 每天执行一次
scheduler = BackgroundScheduler()
scheduler.add_job(cleanup_expired_files, 'interval', hours=24)
scheduler.start()
```

---

## 安全设计

### 认证安全

#### JWT Token 设计

```python
import jwt
from datetime import datetime, timedelta

class AuthService:
    SECRET_KEY = "your-secret-key"
    ACCESS_TOKEN_EXPIRE = timedelta(hours=24)
    REFRESH_TOKEN_EXPIRE = timedelta(days=7)
    
    def create_tokens(self, user_id):
        """创建 access_token 和 refresh_token"""
        access_payload = {
            "user_id": str(user_id),
            "type": "access",
            "exp": datetime.utcnow() + self.ACCESS_TOKEN_EXPIRE
        }
        refresh_payload = {
            "user_id": str(user_id),
            "type": "refresh",
            "exp": datetime.utcnow() + self.REFRESH_TOKEN_EXPIRE
        }
        
        return {
            "access": jwt.encode(access_payload, self.SECRET_KEY, algorithm="HS256"),
            "refresh": jwt.encode(refresh_payload, self.SECRET_KEY, algorithm="HS256"),
            "expires_in": int(self.ACCESS_TOKEN_EXPIRE.total_seconds())
        }
    
    def verify_token(self, token):
        """验证 token"""
        try:
            payload = jwt.decode(token, self.SECRET_KEY, algorithms=["HS256"])
            return payload
        except jwt.ExpiredSignatureError:
            raise AuthError("Token 已过期")
        except jwt.InvalidTokenError:
            raise AuthError("Token 无效")
```

#### 密码安全

```python
import bcrypt

class UserService:
    def hash_password(self, password: str) -> str:
        """使用 bcrypt 加密密码"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """验证密码"""
        return bcrypt.checkpw(
            password.encode('utf-8'),
            hashed.encode('utf-8')
        )
```

### API Key 保护

#### 后端存储

```python
from cryptography.fernet import Fernet

class APIKeyService:
    # 使用环境变量加密密钥
    CIPHER_KEY = os.getenv('ENCRYPTION_KEY').encode()
    CIPHER = Fernet(CIPHER_KEY)
    
    def encrypt_api_key(self, api_key: str) -> str:
        """加密 API Key"""
        return self.CIPHER.encrypt(api_key.encode()).decode()
    
    def decrypt_api_key(self, encrypted_key: str) -> str:
        """解密 API Key"""
        return self.CIPHER.decrypt(encrypted_key.encode()).decode()
    
    def get_user_api_key(self, user_id: str, provider: str) -> str:
        """获取用户的 API Key"""
        user = db.get_user(user_id)
        if not user or not user.api_config:
            raise NotFoundError("API Key 未配置")
        
        provider_key = user.api_config.get(provider)
        if not provider_key:
            raise NotFoundError(f"{provider} API Key 未配置")
        
        return self.decrypt_api_key(provider_key)
```

### 权限控制

#### 项目权限

```python
from functools import wraps

def require_project_access(permission='read'):
    """项目访问权限装饰器"""
    def decorator(f):
        @wraps(f)
        async def wrapper(*args, **kwargs):
            user_id = get_current_user_id()
            project_id = kwargs.get('project_id')
            
            if not project_id:
                raise BadRequestError("缺少 project_id")
            
            # 检查项目归属
            project = db.get_project(project_id)
            if project.user_id != user_id:
                # TODO: 检查是否是协作者
                raise ForbiddenError("无权访问该项目")
            
            return await f(*args, **kwargs)
        return wrapper
    return decorator

# 使用示例
@router.get("/projects/{id}")
@require_project_access('read')
async def get_project(project_id: str):
    """获取项目详情"""
    project = db.get_project(project_id)
    return {"success": True, "data": project}
```

### 限流保护

#### Redis 限流

```python
import redis
from fastapi import HTTPException

class RateLimiter:
    def __init__(self):
        self.redis = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=0
        )
    
    def check_rate_limit(self, user_id: str, endpoint: str, limit: int, window: int):
        """
        检查速率限制
        user_id: 用户ID
        endpoint: API端点
        limit: 窗口内最大请求数
        window: 时间窗口（秒）
        """
        key = f"rate_limit:{user_id}:{endpoint}"
        
        # 获取当前计数
        current = self.redis.incr(key)
        
        # 设置过期时间
        if current == 1:
            self.redis.expire(key, window)
        
        if current > limit:
            raise HTTPException(
                status_code=429,
                detail=f"请求过于频繁，{window}秒内最多{limit}次请求"
            )
        
        return True

# 使用示例
@router.post("/ai/video/generate")
async def generate_video(...):
    rate_limiter.check_rate_limit(user_id, "video_generate", limit=10, window=3600)
    # ... 业务逻辑
```

---

## 开发计划

### Phase 1: 基础设施搭建（2周）

**目标**：完成后端基础架构，可运行 Hello World

#### 任务清单

**Week 1:**
- [ ] 初始化 FastAPI 项目
- [ ] 配置 PostgreSQL 数据库连接
- [ ] 配置 Redis 连接
- [ ] 配置腾讯云 COS SDK
- [ ] 搭建 Docker 开发环境

**Week 2:**
- [ ] 实现数据库模型（SQLAlchemy）
- [ ] 编写数据库迁移脚本
- [ ] 实现 JWT 认证中间件
- [ ] 实现用户注册/登录接口
- [ ] 编写 API 文档（Swagger）
- [ ] 部署测试环境

#### 交付物

- 可运行的后端服务
- 数据库初始化脚本
- API 文档
- 测试用例（认证相关）

### Phase 2: AI 服务集成（3周）

**目标**：实现所有 AI 提供商适配器

#### 任务清单

**Week 3-4:**
- [ ] 设计 AI Provider 基础适配器接口
- [ ] 实现 OpenAI 适配器
- [ ] 实现 Gemini 适配器
- [ ] 实现 Doubao 适配器
- [ ] 实现 DeepSeek 适配器
- [ ] 实现 Yunwu 适配器
- [ ] 实现 MiniMax 适配器
- [ ] 实现 Kling 适配器

**Week 5:**
- [ ] 实现任务队列服务
- [ ] 实现 WebSocket 进度推送
- [ ] 实现 API Key 加密存储
- [ ] 编写 AI 服务集成测试

#### 交付物

- 8 个 AI Provider 适配器
- 任务队列服务
- WebSocket 服务
- AI 服务 API 接口

### Phase 3: 项目与存储服务（2周）

**目标**：实现项目管理和文件存储

#### 任务清单

**Week 6:**
- [ ] 实现项目 CRUD 接口
- [ ] 实现文件上传/下载接口
- [ ] 实现 COS 预签名 URL 生成
- [ ] 实现存储配额管理
- [ ] 实现文件过期清理任务

**Week 7:**
- [ ] 实现权限控制中间件
- [ ] 实现项目搜索/筛选
- [ ] 编写存储服务测试
- [ ] 优化文件上传性能（分块上传）

#### 交付物

- 项目管理 API
- 文件存储 API
- 配额管理系统
- 自动清理任务

### Phase 4: 前端改造（3周）

**目标**：前端对接后端 API

#### 任务清单

**Week 8:**
- [ ] 创建 API Client 封装（Axios）
- [ ] 实现用户登录/注册页面
- [ ] 实现用户状态管理（Context/Zustand）
- [ ] 修改 Dashboard 支持用户项目列表
- [ ] 修改项目创建接口

**Week 9:**
- [ ] 修改所有 AI 调用对接后端
- [ ] 实现任务进度监听（WebSocket）
- [ ] 修改文件上传逻辑（预签名 URL）
- [ ] 修改图片/视频显示逻辑
- [ ] 实现错误处理和重试

**Week 10:**
- [ ] 实现用户设置页面
- [ ] 实现配额使用量展示
- [ ] 优化加载状态和提示
- [ ] 编写前端集成测试
- [ ] 性能优化

#### 交付物

- 改造后的前端应用
- 用户系统完整流程
- API Client 库
- 前端测试用例

### Phase 5: 测试与优化（2周）

**目标**：全链路测试和性能优化

#### 任务清单

**Week 11:**
- [ ] 编写单元测试（后端）
- [ ] 编写集成测试（API）
- [ ] 编写 E2E 测试（前端）
- [ ] 性能测试（压力测试）
- [ ] 安全测试（渗透测试）

**Week 12:**
- [ ] 修复发现的 Bug
- [ ] 性能优化（数据库、API、前端）
- [ ] 编写部署文档
- [ ] 准备上线清单
- [ ] 灰度发布准备

#### 交付物

- 完整测试报告
- 性能优化报告
- 部署文档
- 监控告警配置

---

## 迁移方案

### 数据迁移

#### IndexedDB 导出工具

```javascript
// scripts/export-indexeddb.js
async function exportIndexedDB() {
    const db = await openDB('CineGenDB', 1);
    const projects = await db.getAll('projects');
    
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        projects: projects.map(p => ({
            title: p.title,
            rawScript: p.rawScript,
            scriptData: p.scriptData,
            shots: p.shots,
            settings: {
                targetDuration: p.targetDuration,
                language: p.language,
                visualStyle: p.visualStyle,
                imageSize: p.imageSize,
                imageCount: p.imageCount
            }
        }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `cinegen-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
```

#### 后端导入接口

```python
@router.post("/import/legacy")
async def import_legacy_project(
    file: UploadFile,
    current_user: User = Depends(get_current_user)
):
    """导入旧版项目数据"""
    import_data = json.loads(await file.read())
    
    # 创建新项目
    project = db.create_project(
        user_id=current_user.id,
        title=import_data['title'],
        settings=import_data['settings']
    )
    
    # 迁移文件
    for shot_data in import_data.get('shots', []):
        # 上传图片到云存储
        for keyframe in shot_data.get('keyframes', []):
            if keyframe.get('imageUrl'):
                file_record = await storage_service.upload_from_url(
                    user_id=current_user.id,
                    project_id=project.id,
                    url=keyframe['imageUrl'],
                    file_type='keyframe',
                    file_subtype=keyframe['type']
                )
                keyframe['imageUrl'] = file_record['url']
                keyframe['storageFileId'] = file_record['id']
    
    # 保存项目
    project.script_data = import_data['scriptData']
    project.shots = import_data['shots']
    db.update_project(project)
    
    return {"success": True, "data": {"project_id": project.id}}
```

### 前端迁移步骤

#### 新用户流程
1. 访问应用，跳转到登录页
2. 点击"注册"，填写邮箱、密码、姓名
3. 注册成功，自动登录
4. 进入 Dashboard，显示"创建新项目"
5. 创建项目后，进入各阶段工作

#### 老用户迁移流程
1. 打开旧版应用
2. 点击"导出数据"按钮（新增）
3. 下载 JSON 文件
4. 访问新版应用，登录
5. 在 Dashboard 点击"导入旧项目"
6. 上传导出的 JSON 文件
7. 自动迁移到云存储

### 向后兼容

#### 渐进式迁移策略

```javascript
// 检测新旧版本
if (window.APP_MODE === 'legacy') {
    // 纯前端模式（旧版）
    // 使用 IndexedDB
    // 直接调用 AI API
} else {
    // 前后端分离模式（新版）
    // 调用后端 API
    // 使用云端文件
}
```

---

## 部署方案

### 开发环境

**Docker Compose 配置**：
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: cinegen_dev
      POSTGRES_USER: cinegen
      POSTGRES_PASSWORD: dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./backend:/app
    environment:
      DATABASE_URL: postgresql://cinegen:dev_password@postgres:5432/cinegen_dev
      REDIS_URL: redis://redis:6379/0
      COS_SECRET_ID: ${COS_SECRET_ID}
      COS_SECRET_KEY: ${COS_SECRET_KEY}
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    command: npm run dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      VITE_API_BASE_URL: http://localhost:8000/api/v1
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

### 生产环境

#### 架构图

```
                    ┌─────────────────┐
                    │   用户请求     │
                    └────────┬────────┘
                             │
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼────┐  ┌────▼────┐  ┌──▼─────┐
         │ Nginx  │  │  Nginx  │  │ Nginx  │
         │ (主站)  │  │ (API)  │  │ (CDN)  │
         └────┬────┘  └────┬────┘  └───┬────┘
              │            │            │
    ┌─────────┴────┐  ┌───┴───────┐  │
    │  Backend    │  │  PostgreSQL │  │
    │  (多实例)  │  │  (主从)   │  │
    └─────────────┘  └────────────┘  │
                               │     │
                        ┌────────┘  ┌──▼──────┐
                        │  Redis     │ 腾讯云COS │
                        │ (集群)     │ (多区域)  │
                        └────────────┘ └─────────────┘
```

#### Kubernetes 部署配置

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cinegen-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cinegen-backend
  template:
    metadata:
      labels:
        app: cinegen-backend
    spec:
      containers:
      - name: backend
        image: cinegen/backend:v1.0.0
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: cinegen-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: cinegen-secrets
              key: redis-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: cinegen-backend-service
spec:
  selector:
    app: cinegen-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
```

#### CI/CD 流程

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app tests/
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Docker image
        run: |
          docker build -t cinegen/backend:${{ github.sha }} ./backend
      
      - name: Push to Docker Hub
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push cinegen/backend:${{ github.sha }}
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to K8s
        run: |
          kubectl set image deployment/cinegen-backend cinegen/backend:${{ github.sha }}
          kubectl rollout status deployment/cinegen-backend
```

---

## 监控与运维

### 应用监控

#### 日志收集

```python
import logging
from pythonjsonlogger import jsonlogger

# 结构化日志
logger = jsonlogger.getLogger(__name__)

logger.info({
    "event": "api_request",
    "method": "POST",
    "endpoint": "/ai/video/generate",
    "user_id": user_id,
    "project_id": project_id,
    "duration_ms": 1234,
    "status": "success"
})
```

#### 性能监控

```python
from prometheus_client import Counter, Histogram

# Prometheus 指标
api_requests_total = Counter('api_requests_total', 'Total API requests', ['method', 'endpoint'])
api_request_duration = Histogram('api_request_duration_seconds', 'API request duration', ['endpoint'])

# 使用示例
@api_request_duration.labels(endpoint='/ai/video/generate').observe(1.234)
api_requests_total.labels(method='POST', endpoint='/ai/video/generate').inc()
```

### 告警配置

```yaml
# prometheus/alerts.yml
groups:
  - name: cinegen_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(api_requests_total{status="error"}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "API 错误率过高"
      
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, api_request_duration) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API 响应时间过慢"
      
      - alert: DatabaseConnectionFail
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "数据库连接失败"
```

---

## 成本估算

### 月度成本（1000 用户）

| 项目 | 规格 | 月成本（元） |
|------|--------|--------------|
| **后端服务器** | 4核 8G × 3台 | 900 |
| **PostgreSQL** | 云数据库 | 400 |
| **Redis** | 缓存服务 | 200 |
| **腾讯云 COS** | 1000用户 × 10GB/人 | 1500 |
| **CDN 流量** | 1TB 流量 | 800 |
| **负载均衡** | SLB | 300 |
| **监控服务** | Prometheus + Grafana | 200 |
| **总计** | | 4300 元/月 |

### 单用户成本

- 存储：10GB/人 = 1.5 元/月
- API 调用：约 0.1 元/次
- 平均每月 50 次调用 = 5 元/月

**单用户总成本**：约 6.5 元/月

---

## 风险与应对

### 技术风险

| 风险 | 影响 | 应对措施 |
|--------|--------|---------|
| AI API 限流 | 用户体验下降 | 实现请求队列、自动重试、多账号轮询 |
| 存储成本超支 | 运营压力 | 配额硬限制、成本告警、自动清理 |
| 并发性能瓶颈 | 响应慢 | 水平扩展、缓存优化、异步处理 |
| 数据库连接数不足 | 服务不可用 | 连接池、慢查询优化、读写分离 |

### 业务风险

| 风险 | 影响 | 应对措施 |
|--------|--------|---------|
| 用户数据丢失 | 声誉受损 | 数据库定期备份、多副本存储 |
| API Key 泄露 | 法律风险 | 加密存储、权限最小化、审计日志 |
| 文件访问未授权 | 隐私泄露 | 预签名 URL、短期有效、IP 限制 |

---

## 总结

### 核心价值

✅ **数据安全**：
- API Key 后端加密存储
- 用户数据永久保存
- 细粒度权限控制

✅ **用户体验**：
- 文件永久访问，无过期
- 多设备同步
- 实时进度反馈

✅ **商业能力**：
- 多用户支持
- 配额管理
- 使用量计费
- 团队协作（可选）

✅ **技术架构**：
- 可扩展性
- 可维护性
- 监控告警
- CI/CD 自动化

### 下一步行动

**立即开始**（Phase 1）：
1. 搭建 FastAPI 项目骨架
2. 配置 PostgreSQL + Redis
3. 实现用户认证系统
4. 编写基础 API 文档

**关键里程碑**：
- Week 2：后端 Hello World
- Week 5：所有 AI Provider 集成完成
- Week 7：文件存储完成
- Week 10：前端改造完成
- Week 12：上线发布

---

**祝改造顺利！🚀**
