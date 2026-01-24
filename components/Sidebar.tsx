import { Aperture, ChevronLeft, ChevronRight, Clapperboard, FileText, Film, Github as GithubIcon, Image as ImageIcon, Key, PanelLeft, PanelRight, Settings, Sparkles, Twitter as TwitterIcon, Users, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getAllModelConfigs } from '../services/modelConfigService';
import { ProjectState } from '../types';
import ModalSettings from './ModalSettings';


const DURATION_OPTIONS = [
  { label: '30秒 (广告)', value: '30s' },
  { label: '60秒 (预告)', value: '60s' },
  { label: '2分钟 (片花)', value: '120s' },
  { label: '5分钟 (短片)', value: '300s' },
  { label: '自定义', value: 'custom' }
];

const LANGUAGE_OPTIONS = [
  { label: '中文 (Chinese)', value: '中文' },
  { label: 'English (US)', value: 'English' },
  { label: '日本語 (Japanese)', value: 'Japanese' },
  { label: 'Français (French)', value: 'French' },
  { label: 'Español (Spanish)', value: 'Spanish' }
];

const STYLE_OPTIONS = [
  { label: '仙侠古装', value: '仙侠古装' },
  { label: '可爱卡通', value: '可爱卡通' },
  { label: '古典水墨', value: '古典水墨' },
  { label: '赛博朋克', value: '赛博朋克' },
  { label: '未来机甲', value: '未来机甲' },
  { label: '二次元', value: '二次元' },
  { label: '写实', value: '写实' },
  { label: '蜡笔画风格', value: '蜡笔画风格' },
  { label: '现代城市风', value: '现代城市风' }
];

const IMAGE_SIZE_OPTIONS = [
  { label: '竖屏 9:16 (1440x2560)', value: '1440x2560' },
  { label: '横屏 16:9 (2560x1440)', value: '2560x1440' }
];

const IMAGE_COUNT_OPTIONS = [
  { label: '1 张', value: 1 },
  { label: '2 张', value: 2 },
  { label: '3 张', value: 3 },
  { label: '4 张', value: 4 },
  { label: '5 张', value: 5 },
  { label: '6 张', value: 6 },
  { label: '7 张', value: 7 },
  { label: '8 张', value: 8 },
  { label: '9 张', value: 9 }
];

interface Props {
  project: ProjectState;
  updateProject: (updates: Partial<ProjectState>) => void;
}

interface SidebarProps {
  currentStage: string;
  setStage: (stage: 'script' | 'assets' | 'director' | 'export') => void;
  onExit: () => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  collapsed?: boolean;
  projectName?: string;
  project?: ProjectState;
  updateProject?: (updates: Partial<ProjectState>) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentStage, setStage, onExit, onOpenSettings, onToggleSidebar, collapsed = false, projectName,project,updateProject }) => {
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [modelConfigs, setModelConfigs] = useState<any[]>([]);
  const navItems = [
    { id: 'script', label: '剧本与故事', icon: FileText, sub: '制作脚本' },
    { id: 'assets', label: '角色与场景', icon: Users, sub: '角色布景' },
    { id: 'director', label: '导演工作台', icon: Clapperboard, sub: '拍摄制作' },
    { id: 'export', label: '成片与导出', icon: Film, sub: '剪辑合成' },
  ];

  const [localScript, setLocalScript] = useState(project.rawScript);
  const [localTitle, setLocalTitle] = useState(project.title);
  const [localDuration, setLocalDuration] = useState(project.targetDuration || '60s');
  const [localLanguage, setLocalLanguage] = useState(project.language || '中文');
  const [localStyle, setLocalStyle] = useState(project.visualStyle || '写实');
  const [localImageSize, setLocalImageSize] = useState(project.imageSize || '1440x2560');
  const [localImageCount, setLocalImageCount] = useState(project.imageCount || 1);
  const [customDurationInput, setCustomDurationInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [localLlmProvider, setLocalLlmProvider] = useState(project.modelProviders?.llm || '');
  const [localText2imageProvider, setLocalText2imageProvider] = useState(project.modelProviders?.text2image || '');
  const [localImage2videoProvider, setLocalImage2videoProvider] = useState(project.modelProviders?.image2video || '');

  // 加载模型配置
  useEffect(() => {
    if (showSettings) {
      loadModelConfigs();
    }
  }, [showSettings]);

  const loadModelConfigs = async () => {
    try {
      const configs = await getAllModelConfigs();
      setModelConfigs(configs);
    } catch (error) {
      console.error('Failed to load model configs:', error);
    }
  };

  const openSettings = () => {
    setLocalTitle(project.title);
    setLocalDuration(project.targetDuration || '60s');
    setLocalLanguage(project.language || '中文');
    setLocalStyle(project.visualStyle || '写实');
    setLocalImageSize(project.imageSize || '1440x2560');
    setLocalImageCount(project.imageCount || 1);
    setCustomDurationInput(project.targetDuration === 'custom' ? project.targetDuration : '');
    setLocalLlmProvider(project.modelProviders?.llm || '');
    setLocalText2imageProvider(project.modelProviders?.text2image || '');
    setLocalImage2videoProvider(project.modelProviders?.image2video || '');
    setShowSettings(true);
  };

  const saveSettings = () => {
    const finalDuration = localDuration === 'custom' ? customDurationInput : localDuration;
    updateProject({
      title: localTitle,
      targetDuration: finalDuration,
      language: localLanguage,
      visualStyle: localStyle,
      imageSize: localImageSize,
      imageCount: localImageCount,
      modelProviders: {
        ...project.modelProviders,
        llm: localLlmProvider,
        text2image: localText2imageProvider,
        image2video: localImage2videoProvider
      }
    });
    setShowSettings(false);
  };

  const renderSettingsModal = () => (
    showSettings && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowSettings(false);
        }}
      >
        <div className="bg-[#0e0e28] border border-slate-800 rounded-lg w-[480px] max-w-[90vw] max-h-[85vh] overflow-y-auto shadow-2xl">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-400" />
              项目设置
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Title Input */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">项目标题</label>
              <input
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                className="w-full bg-[#0c0c2d] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none transition-all"
                placeholder="输入项目名称..."
              />
            </div>

            {/* Language and Visual Style in one row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Language Selection */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">输出语言</label>
                <div className="relative">
                  <select
                    value={localLanguage}
                    onChange={(e) => setLocalLanguage(e.target.value)}
                    className="w-full bg-[#0c0c2d] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                  >
                    {LANGUAGE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none">
                    <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                  </div>
                </div>
              </div>

              {/* Visual Style Selection */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">画面风格</label>
                <div className="relative">
                  <select
                    value={localStyle}
                    onChange={(e) => setLocalStyle(e.target.value)}
                    className="w-full bg-[#0c0c2d] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                  >
                    {STYLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none">
                    <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            {/* Image Size and Image Count in one row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Image Size Selection */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">图片尺寸</label>
                <div className="relative">
                  <select
                    value={localImageSize}
                    onChange={(e) => setLocalImageSize(e.target.value)}
                    className="w-full bg-[#0c0c2d] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                  >
                    {IMAGE_SIZE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none">
                    <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                  </div>
                </div>
              </div>

              {/* Image Count Selection */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">组图数量</label>
                <div className="relative">
                  <select
                    value={localImageCount}
                    onChange={(e) => setLocalImageCount(Number(e.target.value))}
                    className="w-full bg-[#0c0c2d] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                  >
                    {IMAGE_COUNT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none">
                    <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-600">文生图模型一次生成的画面数</p>
              </div>
            </div>

            {/* Duration Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">目标时长</label>
              <div className="grid grid-cols-2 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLocalDuration(opt.value)}
                    className={`px-2 py-2.5 text-[11px] font-medium rounded-md transition-all text-center border ${
                      localDuration === opt.value
                        ? 'bg-slate-100 text-black border-slate-100 shadow-sm'
                        : 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {localDuration === 'custom' && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={customDurationInput}
                    onChange={(e) => setCustomDurationInput(e.target.value)}
                    className="w-full bg-[#0c0c2d] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none font-mono placeholder:text-slate-700"
                    placeholder="输入时长 (如: 90s, 3m)"
                  />
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-800 pt-4">
              <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-4">模型供应商</p>
            </div>

            {/* LLM Provider Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                大语言模型 (LLM)
              </label>
              <div className="relative">
                <select
                  value={localLlmProvider}
                  onChange={(e) => setLocalLlmProvider(e.target.value)}
                  className="w-full bg-[#0c0c2d] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">默认模型</option>
                  {modelConfigs.filter(c => c.modelType === 'llm' && c.apiKey).map(config => (
                    <option key={config.id} value={config.id}>
                      {config.provider} - {config.model || config.description}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                </div>
              </div>
            </div>

            {/* Text2Image Provider Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="w-3 h-3" />
                文生图模型
              </label>
              <div className="relative">
                <select
                  value={localText2imageProvider}
                  onChange={(e) => setLocalText2imageProvider(e.target.value)}
                  className="w-full bg-[#0c0c2d] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">默认模型</option>
                  {modelConfigs.filter(c => c.modelType === 'text2image' && c.apiKey).map(config => (
                    <option key={config.id} value={config.id}>
                      {config.provider} - {config.model || config.description}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                </div>
              </div>
            </div>

            {/* Image2Video Provider Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Film className="w-3 h-3" />
                图生视频模型
              </label>
              <div className="relative">
                <select
                  value={localImage2videoProvider}
                  onChange={(e) => setLocalImage2videoProvider(e.target.value)}
                  className="w-full bg-[#0c0c2d] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">默认模型</option>
                  {modelConfigs.filter(c => c.modelType === 'image2video' && c.apiKey).map(config => (
                    <option key={config.id} value={config.id}>
                      {config.provider} - {config.model || config.description}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-800 flex gap-3">
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 py-3 bg-slate-900 text-slate-400 hover:text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={saveSettings}
              className="flex-1 py-3 bg-white text-black hover:bg-slate-200 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-72'} bg-[#0e1229] border-r border-slate-800 h-screen fixed left-0 top-0 flex flex-col z-50 select-none transition-all duration-300 ease-in-out`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-900">
        {!collapsed ? (
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center flex-shrink-0">
              <Aperture className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-white tracking-wider uppercase">AI漫剧工场</h1>
              <p className="text-[12px] text-slate-500 uppercase tracking-widest">Studio Pro</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-6">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center flex-shrink-0">
              <Aperture className="w-5 h-5" />
            </div>
          </div>
        )}

        <button
          onClick={onExit}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-mono uppercase tracking-wide group w-full"
        >
          <ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
          {!collapsed && <span>返回项目列表</span>}
        </button>
      </div>

      {/* Project Status */}
      {!collapsed && (
        <div className="px-6 py-4 border-b border-slate-900">
           <div className="text-[12px] text-slate-600 uppercase tracking-widest mb-1">当前项目</div>
           <div className="text-sm font-medium flex items-center  text-slate-200 truncate font-mono">{projectName || '未命名项目'}
           <button
                onClick={openSettings}
                className="text-xs font-bold  text-slate-400 hover:text-white  items-center gap-2 px-4 py-2 "
                >
                <Settings className="w-3 h-3" />
           </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = currentStage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setStage(item.id as any)}
              className={`w-full flex items-center justify-between px-6 py-4 transition-all duration-200 group relative border-l-2 ${
                isActive
                  ? 'border-white bg-slate-800 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
              title={collapsed ? item.label : ''}
            >
              <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-400'}`} />
                {!collapsed && <span className="font-medium text-xs tracking-wider uppercase">{item.label}</span>}
              </div>
              {!collapsed && <span className={`text-[12px] font-mono ${isActive ? 'text-slate-400' : 'text-slate-700'}`}>{item.sub}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-slate-900 space-y-2">
        {!collapsed ? (
          <>
            <button
              onClick={() => setShowModelSettings(true)}
              className="flex items-center justify-between text-slate-600 hover:text-white cursor-pointer transition-colors w-full px-3 py-2 hover:bg-slate-900/30 rounded-lg"
            >
              <span className="font-mono text-[12px] uppercase tracking-widest">大模型配置</span>
              <Key className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenSettings}
              className="flex items-center justify-between text-slate-600 hover:text-white cursor-pointer transition-colors w-full px-3 py-2 hover:bg-slate-900/30 rounded-lg"
            >
              <span className="font-mono text-[12px] uppercase tracking-widest">系统设置</span>
              <Settings className="w-4 h-4" />
            </button>

            {/* 社交媒体链接 */}
            <div className="pt-2 border-t border-slate-900/50">
              <div className="flex items-center justify-center gap-3">
                <a
                  href="https://github.com/3dudu/comic_master/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 hover:text-white transition-colors p-2 hover:bg-slate-900/30 rounded-lg"
                  title="GitHub"
                >
                  <GithubIcon className="w-4 h-4" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 hover:text-white transition-colors p-2 hover:bg-slate-900/30 rounded-lg"
                  title="Twitter / X"
                >
                  <TwitterIcon className="w-4 h-4" />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 hover:text-white transition-colors p-2 hover:bg-slate-900/30 rounded-lg"
                  title="Facebook"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
              </div>
            </div>
          </>
        ) : (
          <>
          <button
            onClick={() => setShowModelSettings(true)}
            className="flex justify-center text-slate-600 hover:text-white cursor-pointer transition-colors w-full py-2 hover:bg-slate-900/30 rounded-lg"
            title="大模型配置"
          >
            <Key className="w-4 h-4" />
          </button>
          <button
              onClick={onOpenSettings} title="系统设置"
              className="flex justify-center text-slate-600 hover:text-white cursor-pointer transition-colors w-full py-2 hover:bg-slate-900/30 rounded-lg"
            >
            <Settings className="w-4 h-4" />
          </button>

          {/* 社交媒体链接 - 折叠状态 */}
          <div className="pt-2 border-t border-slate-900/50">
            <div className="flex flex-col items-center gap-2">
              <a
                href="https://github.com/3dudu/comic_master/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-white transition-colors p-2 hover:bg-slate-900/30 rounded-lg"
                title="GitHub"
              >
                <GithubIcon className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-white transition-colors p-2 hover:bg-slate-900/30 rounded-lg"
                title="Twitter / X"
              >
                <TwitterIcon className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-white transition-colors p-2 hover:bg-slate-900/30 rounded-lg"
                title="Facebook"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
            </div>
          </div>
          </>
        )}
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggleSidebar}
        className="absolute -right-3 top-20 bg-[#1a1a3e] border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-all rounded-full p-1.5 z-50"
        title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
      >
        {collapsed ? <PanelRight className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
      </button>

      {/* Model Settings Modal */}
      <ModalSettings
        isOpen={showModelSettings}
        onClose={() => setShowModelSettings(false)}
      />
      {renderSettingsModal()}
    </aside>
  );
};

export default Sidebar;