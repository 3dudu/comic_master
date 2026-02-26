# AI漫剧工场 - 项目说明文档

> **工业级 AI 漫剧与视频生成工作台**  
> *Industrial AI Motion Comic & Video Workbench*

---

## 目录

- [项目概述](#项目概述)
- [核心设计理念](#核心设计理念)
- [页面功能清单](#页面功能清单)
- [封装的大模型能力](#封装的大模型能力)
- [技术架构](#技术架构)
- [数据结构](#数据结构)
- [快速开始](#快速开始)

---

## 项目概述

**AI漫剧工场** 是一个专为 **AI 漫剧 (Motion Comics)**、**动态漫画** 及 **影视分镜 (Animatic)** 设计的专业生产力工具。

项目摒弃了传统的"抽卡式"生成，采用 **"Script-to-Asset-to-Keyframe"** 的工业化工作流。通过深度集成多个大模型，实现了对角色一致性、场景连续性以及镜头运动的精准控制。

### 技术栈

- **前端框架**: React 19 + TypeScript
- **样式方案**: Tailwind CSS (索尼工业设计风格)
- **数据存储**: IndexedDB (本地浏览器数据库，数据隐私安全，无后端依赖)
- **构建工具**: Vite

---

## 核心设计理念

### 关键帧驱动 (Keyframe-Driven)

传统的 Text-to-Video 往往难以控制具体的运镜和起止画面。CineGen 引入了动画制作中的 **关键帧 (Keyframe)** 概念：

1. **先画后动**：先生成精准的起始帧 (Start) 和结束帧 (End)
2. **插值生成**：利用 Veo/豆包 模型在两帧之间生成平滑的视频过渡
3. **资产约束**：所有画面生成均受到"角色定妆照"和"场景概念图"的强约束，杜绝角色变形

---

## 页面功能清单

### 仪表盘 (Dashboard)

**文件位置**: `components/Dashboard.tsx`

**核心功能**:
- 📋 项目列表展示与管理
- 🆕 创建新项目
- ✏️ 编辑项目标题
- 🗑️ 删除项目
- 📅 显示项目创建时间和最后修改时间
- 🔄 快速加载已保存的项目

**UI 特性**:
- 卡片式项目展示
- 悬浮操作按钮
- 工业风格设计

---

### Phase 01: 剧本与故事 (Script & Storyboard)

**文件位置**: `components/StageScript.tsx`

**核心功能**:

#### 剧本输入与编辑
- 📝 原始剧本输入 (支持长文本)
- 📄 剧本解析进度提示
- 📊 剧本分析结果展示

#### 智能剧本分析
- 🤖 AI 自动拆解剧本为标准结构
  - 故事梗概 (Logline)
  - 类型选择 (Genre) - 支持14种影视类型
  - 目标时长设定
  - 输出语言选择

#### 角色管理
- 👥 角色列表展示
- ➕ 添加新角色
  - 姓名、性别、年龄、性格设定
  - 视觉提示词编辑
- ✏️ 编辑角色信息
- 🗑️ 删除角色

#### 场景管理
- 📍 场景列表展示
- ➕ 添加新场景
  - 场地名称、时间设定、氛围描述
  - 视觉提示词编辑
- ✏️ 编辑场景信息
- 🗑️ 删除场景

#### 故事段落管理
- 📜 段落卡片展示
- 📝 段落与场景关联
- 🎬 为场景添加镜头

#### 分镜列表生成
- 🎞 AI 自动生成分镜清单 (Shots)
  - 场景编号、动作描述
  - 运镜方式、景别设定
  - 角色关联、对白内容
- ✏️ 编辑镜头详情
- 🗑️ 删除镜头

**AI 能力集成**:
- 剧本结构化解析 (LLM)
- 镜头清单生成 (LLM)
- 视觉提示词生成 (LLM)

---

### Phase 02: 资产与选角 (Assets & Casting)

**文件位置**: `components/StageAssets.tsx`

**核心功能**:

#### 角色定妆 (Casting)
- 📸 角色参考图展示 (3:4 竖屏)
- ✨ 一键生成所有角色图片
- 🔄 单个角色重新生成
- 👤 角色预览 (点击放大查看)

#### 场景概念 (Set Design)
- 🖼️ 场景概念图展示 (16:9 横屏)
- ✨ 一键生成所有场景图片
- 🔄 单个场景重新生成
- 🎭 场景预览

#### 衣橱系统 (Wardrobe System)
- 👔 为每个角色管理多套造型
  - 添加新造型 (名称 + 描述)
  - 生成造型图片 (基于 Base Look 保持面部一致)
  - 删除造型
- 🎨 造型图片展示
- 🔄 重新生成单个造型

**批量操作**:
- ⚡ 批量生成所有角色/场景
- 🎯 智能过滤 (只生成未完成的资产)
- 📊 实时进度显示

---

### Phase 03: 导演工作台 (Director Workbench)

**文件位置**: `components/StageDirector.tsx`

**核心功能**:

#### 镜头网格视图
- 🎞 网格化分镜表展示
- 📊 完成度统计 (已完成/总数)
- 🎬 点击镜头进入详情视图
- 缩略图展示 (视频 > 图片)

#### 上下文面板 (Scene Context)
- 📍 当前场景信息展示
  - 场地名称、时间、氛围
  - 场景参考图预览
- 👥 场内角色列表
  - 角色头像展示
  - 造型选择下拉框 (切换不同服装)
  - 👔 一键打开造型管理 (新增)
- 🎞 添加镜头按钮 (新增)

#### 视觉制作 (Visual Production)

**一键制作**:
- ⚡ 一键生成图片 + 视频
- 🔄 智能判断 (已生成时显示"重新制作")
- 📊 实时进度提示

**起始帧 (Start Frame)**:
- 🖼️ 起始帧图片展示
- ✨ 生成/重新生成按钮
- ✏️ 实时编辑视觉提示词
- 🗑️ 删除图片按钮 (新增)

**结束帧 (End Frame)**:
- 🖼️ 结束帧图片展示
- ✨ 生成/重新生成按钮
- ✏️ 实时编辑视觉提示词
- 🗑️ 删除图片按钮 (新增)

**宫格图模式**:
- 📊 支持生成1-9张连续宫格图
- 🖼️ 宫格图展示
- ✨ 生成/重新生成
- ✏️ 视觉提示词编辑

#### 批量操作
- ⚡ 批量生成所有帧图片
- 🎬 批量生成所有视频 (新增)
  - 智能判断 (需要图片时先生成)
  - 实时进度显示
  - 单个镜头失败不影响其他
  - 镜头间延迟防API限流

#### 视频生成 (Video Generation)
- 🎥 Veo 视频生成
  - 支持起始帧 → 结束帧模式
  - 支持宫格图连续帧模式
  - 可设置视频时长
- 📹 视频预览播放器
- 🔄 重新生成视频

#### 叙事动作 (Action & Dialogue)
- 📝 动作摘要展示
- 💬 对白内容展示 (带样式)

---

### Phase 04: 成片与导出 (Export)

**文件位置**: `components/StageExport.tsx`

**核心功能**:

#### 镜头选择与预览
- 📋 倾斜列表展示
- ✅ 多选支持 (复选框)
- 🎬 视频缩略图预览
- 🎞 图片缩略图展示
- 📊 选中数量统计

#### 批量操作
- ✅ 全选已完成的镜头
- ❌ 取消所有选择

#### 视频合并
- 🔗 Coze 工作流 API 集成
  - 视频片段顺序合并
  - 时间轴同步
  - 元数据保留
- 📹 合并进度实时显示
- ✅ 合并完成预览
- 📥 下载合并视频
- 📤 导出所有资源 (关键帧 + 视频)

#### 项目设置
- ⚙️ 配置 API 密钥
- 🔄 重新渲染工作流

---

### 侧边栏 (Sidebar)

**文件位置**: `components/Sidebar.tsx`

**核心功能**:
- 🏷️ 项目标识展示 (Logo + 名称)
- 📋 四阶段导航
  - 剧本与故事 (Script)
  - 角色与场景 (Assets)
  - 导演工作台 (Director)
  - 成片与导出 (Export)
- ⚙️ 项目设置
  - 项目标题编辑
  - 输出语言选择
  - 画面风格选择 (9种风格)
  - 图片尺寸选择 (横屏/竖屏)
  - 组图数量选择 (1-9张)
  - 目标时长设定
- 🔧 大模型配置
- 🌐 系统设置
- 🔄 侧边栏折叠/展开
- 🏠 返回项目列表

---

## 封装的大模型能力

### LLM 提供商 (文本理解与生成)

#### 1. DeepSeek

**配置文件**: `services/deepseekService.ts`

**能力**:
- 📝 剧本生成 (从提示词)
- 📋 镜头清单生成 (完整或单场景)
- 🎨 视觉提示词生成 (角色/场景)
- 📖 剧本结构化解析

**优势**:
- 高性价比
- 优秀中文理解能力
- 稳定可靠

#### 2. 豆包 (Doubao / 豆包大模型)

**配置文件**: `services/doubaoService.ts`

**能力**:
- 📝 剧本生成
- 📋 镜头清单生成
- 🎨 视觉提示词生成
- 📖 剧本结构化解析

**优势**:
- 中文优化
- 多模态支持 (文本/图像)
- 企业级稳定性

#### 3. 云雾 (Yunwu)

**配置文件**: `services/yunwuService.ts`

**能力**:
- 📝 剧本生成
- 📋 镜头清单生成
- 🎨 视觉提示词生成
- 📖 剧本结构化解析
- 🎬 视频生成 (Veo)

**优势**:
- 视频生成能力强
- 运镜控制精准
- 国内访问友好

#### 4. Gemini (Google)

**配置文件**: `services/geminiService.ts`

**能力**:
- 🎨 文生图 (Nano Banana - 高速)
- 🎬 图生视频 (首尾帧插值)

**优势**:
- 全球领先模型
- 速度快
- 质量稳定

#### 5. OpenAI (计划中)

**状态**: 待实现

**计划能力**:
- GPT-4 文本理解
- DALL-E 图像生成
- Sora 视频生成

---

### 文生图 提供商 (Text-to-Image)

#### 1. 豆包

**支持特性**:
- 🎨 高质量图像生成
- 📏️ 多尺寸支持 (16:9 / 9:16)
- 👤 角色一致性 (支持参考图)
- 🖼️ 场景一致性
- 🎭 支持连续宫格图生成 (1-9张)
- 🎨 风格控制 (真人写实、卡通、水墨等)

#### 2. Gemini

**支持特性**:
- ⚡ Nano Banana (超高速生成)
- 🎨 高质量图像
- 📏️ 自定义尺寸
- 🖼️ 参考图支持

---

### 图生视频 提供商 (Image-to-Video)

#### 1. 豆包

**支持特性**:
- 🎬 首尾帧视频生成
- 🔄 参考图驱动
- ⏱️ 可设置视频时长
- 📊 宫格图连续帧模式
- 🎞️ 起始帧 → 结束帧插值
- 🔄 重新生成支持

**技术模式**:
- Start Frame Only (仅起始帧)
- Start + End Frame (首尾帧插值)
- Full Grid Mode (连续宫格帧)

#### 2. 云雾

**支持特性**:
- 🎬 高质量视频生成
- 🎞️ 起始帧驱动
- 🎞️ 首尾帧插值
- ⏱️ 时长控制

---

### 智能工作流

#### Coze 工作流集成

**配置文件**: `services/cozeService.ts`

**能力**:
- 🔗 视频片段智能合并
- 📊 时间轴同步
- 🎯 端到端视频处理
- 📥 一键导出

**优势**:
- 无需后端服务器
- 浏览器端处理
- 保护用户数据隐私

---

## 技术架构

### 前端架构

```
App.tsx (主应用)
├── Sidebar.tsx (侧边导航)
├── Dashboard.tsx (项目列表)
├── StageScript.tsx (剧本与故事)
├── StageAssets.tsx (资产与选角)
├── StageDirector.tsx (导演工作台)
└── StageExport.tsx (成片与导出)

Modal Components
├── ApiKeyModal.tsx (API密钥配置)
├── ModalSettings.tsx (项目设置)
├── SceneEditModal.tsx (场景编辑)
└── ShotEditModal.tsx (镜头编辑)
```

### 服务层架构

```
ModelService (统一模型服务层)
├── deepseekService.ts (DeepSeek API)
├── doubaoService.ts (豆包 API)
├── geminiService.ts (Gemini API)
├── yunwuService.ts (云雾 API)
└── openaiService.ts (OpenAI API - 计划中)

其他服务
├── cozeService.ts (Coze 工作流)
├── modelConfigService.ts (模型配置管理)
├── storageService.ts (IndexedDB 数据存储)
└── mockData.ts (测试数据)
```

### 状态管理

**React Hooks**:
- `useState`: 组件本地状态
- `useEffect`: 副作用处理
- `useRef`: 引用管理 (防抖、定时器)

**数据流**:
```
ProjectState (全局项目状态)
├── 基础信息 (id, title, createdAt, lastModified)
├── 阶段状态 (stage: 'script' | 'assets' | 'director' | 'export')
├── 项目设置
│   ├── rawScript (原始剧本)
│   ├── targetDuration (目标时长)
│   ├── language (输出语言)
│   ├── visualStyle (画面风格)
│   ├── imageSize (图片尺寸)
│   └── imageCount (组图数量)
├── 剧本数据 (scriptData)
│   ├── title, genre, logline
│   ├── characters[]
│   ├── scenes[]
│   └── storyParagraphs[]
└── 分镜数据 (shots[])
    ├── 镜头信息 (actionSummary, cameraMovement, shotSize)
    ├── 对白 (dialogue)
    ├── 角色关联 (characters)
    ├── 造型映射 (characterVariations)
    ├── 关键帧 (keyframes[])
    │   ├── 起始帧 (start)
    │   ├── 结束帧 (end)
    │   └── 宫格图 (full)
    └── 视频间隔 (interval)
```

---

## 数据结构

### 核心类型定义

```typescript
// 项目状态
interface ProjectState {
  id: string;
  title: string;
  createdAt: number;
  lastModified: number;
  stage: 'script' | 'assets' | 'director' | 'export';
  
  // 项目设置
  rawScript: string;
  targetDuration: string;
  language: string;
  visualStyle: string;
  imageSize: string;
  imageCount: number;
  
  // 数据
  scriptData: ScriptData | null;
  shots: Shot[];
  
  // 导出数据
  mergedVideoUrl?: string;
}

// 剧本数据
interface ScriptData {
  title: string;
  genre: string;
  logline: string;
  targetDuration?: string;
  language?: string;
  characters: Character[];
  scenes: Scene[];
  storyParagraphs: { id: number; text: string; sceneRefId: string }[];
}

// 角色
interface Character {
  id: string;
  name: string;
  gender: string;
  age: string;
  personality: string;
  visualPrompt?: string;
  referenceImage?: string;
  variations: CharacterVariation[]; // 造型列表
}

// 造型
interface CharacterVariation {
  id: string;
  name: string;
  visualPrompt: string;
  referenceImage?: string;
}

// 场景
interface Scene {
  id: string;
  location: string;
  time: string;
  atmosphere: string;
  visualPrompt?: string;
  referenceImage?: string;
}

// 镜头
interface Shot {
  id: string;
  sceneId: string;
  actionSummary: string;
  dialogue?: string;
  cameraMovement: string;
  shotSize?: string;
  characters: string[];
  characterVariations?: { [characterId: string]: string };
  keyframes: Keyframe[];
  interval?: VideoInterval;
}

// 关键帧
interface Keyframe {
  id: string;
  type: 'start' | 'end' | 'full';
  visualPrompt: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

// 视频间隔
interface VideoInterval {
  id: string;
  startKeyframeId: string;
  endKeyframeId: string;
  duration: number;
  motionStrength: number;
  videoUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}
```

---

## 快速开始

### 1. 环境准备

**必需工具**:
- Node.js (v18+)
- npm 或 yarn

**安装依赖**:
```bash
npm install
```

**启动开发服务器**:
```bash
npm run dev
```

### 2. 配置 API 密钥

#### Google Gemini (推荐)
1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 创建项目并获取 API Key
3. 在应用首页配置页面输入密钥

#### 豆包 (Doubao)
1. 访问 [豆包官网](https://www.doubao.com/)
2. 注册并获取 API Key
3. 配置到应用

#### 云雾 (Yunwu)
1. 访问 [云雾官网](https://yunwu.com/)
2. 注册并获取 API Key
3. 配置到应用

#### DeepSeek
1. 访问 [DeepSeek 官网](https://www.deepseek.com/)
2. 获取 API Key
3. 配置到应用

### 3. 创建项目

1. 点击"创建新项目"
2. 输入项目名称
3. 点击"创建"按钮

### 4. 剧本创作

**方式一：AI 生成剧本**
1. 输入故事创意提示词
2. 选择类型 (如：剧情片、动作片)
3. 设定目标时长 (如：60s)
4. 点击"生成分镜脚本"

**方式二：直接输入剧本**
1. 直接粘贴完整剧本文本
2. 点击"生成分镜脚本"

**生成的结果**:
- 结构化剧本数据
- 角色列表 (含基本信息)
- 场景列表 (含时间、地点、氛围)
- 完整的分镜清单

### 5. 生成资产

**角色定妆**:
1. 进入"角色与场景"阶段
2. 点击"一键生成所有角色"
3. 等待图片生成完成

**场景概念**:
1. 点击"一键生成所有场景"
2. 等待环境图生成完成

**衣橱系统**:
1. 点击角色卡片上的服装图标
2. 添加新造型 (如：战斗装、日常装)
3. 生成造型图片

### 6. 分镜制作

**单个镜头制作**:
1. 进入"导演工作台"
2. 选择要制作的镜头
3. 点击"一键制作"按钮
   - 自动生成起始帧和结束帧
   - 自动生成视频片段

**批量制作**:
1. 点击工具栏"批量生成视频"
2. 等待所有镜头视频生成完成
3. 实时查看进度 (显示当前镜头编号)

**修改关键帧**:
1. 点击帧图片下方输入框
2. 修改视觉提示词
3. 实时保存 (自动更新)
4. 重新生成图片

**删除关键帧**:
1. 点击结束帧右侧垃圾桶图标
2. 删除已生成的图片URL
3. 可重新生成

### 7. 成片导出

**选择要导出的镜头**:
1. 进入"成片与导出"阶段
2. 勾选需要合并的镜头
3. 或点击"全选已完成的镜头"

**合并视频**:
1. 点击"开始合并"按钮
2. 等待合并进度
3. 预览合并后的视频
4. 下载视频

**导出所有资源**:
1. 点击"导出所有资源"
2. 下载所有关键帧图片
3. 下载所有视频片段

---

## 高级功能

### 项目配置

**可配置项**:
- 🎨 画面风格
  - 仙侠古装、可爱卡通、古典水墨
  - 赛博朋克、未来机甲、二次元
  - 真人写实、蜡笔画风格、现代城市风

- 📏️ 图片尺寸
  - 竖屏 9:16 (1440x2560)
  - 横屏 16:9 (2560x1440)

- 🎲 组图数量
  - 1-9张连续宫格图
  - 用于文生图一次性生成多张画面

- ⏱️ 目标时长
  - 30秒 (广告)
  - 60秒 (预告)
  - 2分钟 (片花)
  - 5分钟 (短片)
  - 自定义

- 🌐 输出语言
  - 中文
  - English (US)
  - 日本語
  - Français
  - Español

- 🎭 类型选择
  - 剧情片、动作片、科幻片、悬疑片、恐怖片
  - 喜剧片、爱情片、历史片、战争片
  - 动画片、纪录片、短片、微电影、广告

### 角色造型管理

**功能特性**:
- 👔 多套服装造型
- 🎨 基于基础造型保持面部一致
- 🔄 单独重新生成造型
- 🗑️ 删除不需要的造型
- 📋 在导演台中为每个镜头选择特定造型

### 批量操作优化

**防API限流**:
- 镜头间 2-3秒延迟
- 智能跳过已生成内容
- 实时进度提示
- 错误隔离 (单个失败不影响整体)

**智能判断**:
- 自动检测缺失的资产
- 优先生成未完成项
- 已完成时显示"重新生成"

### 数据安全

**隐私保护**:
- 所有数据存储在浏览器本地 (IndexedDB)
- 无后端服务器依赖
- API 密钥仅存储在本地
- 用户完全控制数据导出

**自动保存**:
- 项目数据 1 秒防抖自动保存
- 实时显示保存状态
- 避免数据丢失

---

## 故障排查

### 常见问题

**Q: API 密钥配置后不生效?**  
A: 确保点击了"保存配置"按钮，密钥会存储到浏览器 localStorage

**Q: 图片/视频生成失败?**  
A: 检查以下几点:
- API 密钥是否正确且已开通相应服务权限
- 网络连接是否正常
- 是否有足够的 API 配额
- 查看浏览器控制台错误信息

**Q: 角色在不同镜头中变形?**  
A: 确保使用"角色定妆"生成的参考图作为约束，或在导演台选择一致的角色造型

**Q: 连续宫格图生成失败?**  
A: 检查组图数量设置 (1-9)，确保文生图模型支持该数量

**Q: 视频合并失败?**  
A: 确保:
- 已成功生成所有需要的视频片段
- Coze 工作流 ID 配置正确
- 网络连接正常

---

## 技术支持

### 模型服务配置

应用支持动态模型配置，可通过修改模型服务进行扩展。

**配置文件**: `services/modelConfigService.ts`

**支持的提供商**:
- `doubao` - 豆包大模型
- `deepseek` - DeepSeek
- `gemini` - Google Gemini
- `yunwu` - 云雾
- `openai` - OpenAI (计划中)

**支持的模型类型**:
- `llm` - 大语言模型
- `text2image` - 文生图
- `image2video` - 图生视频

### 组件开发规范

所有组件遵循统一的设计规范:

**样式**:
- 使用 Tailwind CSS
- 颜色方案: 深色主题 (#0e1229 背景)
- 一致的间距和圆角

**交互**:
- 加载状态处理
- 错误边界
- 实时反馈
- 操作确认

**数据流**:
- Props 数据传递
- updateProject 回调更新
- useEffect 同步状态

---

## 版本信息

- **当前版本**: 1.0.0
- **构建工具**: Vite
- **React 版本**: 19.x
- **TypeScript 版本**: 5.x

---

## 许可证

Built for Creators, by CineGen.

---

## 联系与支持

如有问题或建议，请通过以下方式联系：

- 📧 提交 Issue
- 📖 查看 README (多语言支持)
  - [中文](./README.md)

---

**祝您创作愉快！🎬✨**
