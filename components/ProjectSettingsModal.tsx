import { ChevronRight, Film, Image as ImageIcon, Settings, Sparkles, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getEnabledConfigByType } from '../services/modelConfigService';
import { ModelService } from '../services/modelService';
import { getAllModelConfigs } from '../services/storageService';

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
  { label: '真人写实', value: '真人写实' },
  { label: '蜡笔画风格', value: '蜡笔画风格' },
  { label: '现代城市风', value: '现代城市风' }
];

const IMAGE_SIZE_OPTIONS = [
  { label: '横屏 16:9 (2560x1440)', value: '2560x1440' },
  { label: '竖屏 9:16 (1440x2560)', value: '1440x2560' }
];

const IMAGE_COUNT_OPTIONS = [
  { label: '首尾帧', value: 1 },
  { label: '4 张', value: 4 },
  { label: '6 张', value: 6 },
  { label: '8 张', value: 8 },
  { label: '9 张', value: 9 }
];

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  updateProject: (updates: any) => void;
}

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ isOpen, onClose, project, updateProject }) => {
  const [localTitle, setLocalTitle] = useState(project?.title || '');
  const [localDuration, setLocalDuration] = useState(project?.targetDuration || '60s');
  const [localLanguage, setLocalLanguage] = useState(project?.language || '中文');
  const [localStyle, setLocalStyle] = useState(project?.visualStyle || '真人写实');
  const [localImageSize, setLocalImageSize] = useState(project?.imageSize || '1440x2560');
  const [localImageCount, setLocalImageCount] = useState(project?.imageCount || 1);
  const [customDurationInput, setCustomDurationInput] = useState('');
  const [modelConfigs, setModelConfigs] = useState<any[]>([]);
  const [localLlmProvider, setLocalLlmProvider] = useState(project?.modelProviders?.llm || '');
  const [localText2imageProvider, setLocalText2imageProvider] = useState(project?.modelProviders?.text2image || '');
  const [localImage2videoProvider, setLocalImage2videoProvider] = useState(project?.modelProviders?.image2video || '');

  // Load model configs when modal opens
  useEffect(() => {
    if (isOpen) {
      loadModelConfigs();
      //initSystemModelProviders();
      // Reset local state when opening modal
      setLocalTitle(project.title);
      setLocalDuration(project.targetDuration || '60s');
      setLocalLanguage(project.language || '中文');
      setLocalStyle(project.visualStyle || '真人写实');
      setLocalImageSize(project.imageSize || '1440x2560');
      setLocalImageCount(project.imageCount || 1);
      setCustomDurationInput(project.targetDuration === 'custom' ? project.targetDuration : '');
    }
  }, [isOpen, project]);

  const initSystemModelProviders = async () => {
    const llm = await getEnabledConfigByType('llm');
    const text2image = await getEnabledConfigByType('text2image');
    const image2video = await getEnabledConfigByType('image2video');
    setLocalLlmProvider(project.modelProviders.llm || llm.id);
    setLocalText2imageProvider(project.modelProviders?.text2image || text2image.id);
    setLocalImage2videoProvider(project.modelProviders?.image2video || image2video.id);
  };
  const loadModelConfigs = async () => {
    try {
      const configs = await getAllModelConfigs();
      setModelConfigs(configs);
    } catch (error) {
      console.error('Failed to load model configs:', error);
    }
  };

  const saveSettings = () => {
    const finalDuration = localDuration === 'custom' ? customDurationInput : localDuration;
    const newModelProviders = {
      ...project.modelProviders,
      llm: localLlmProvider,
      text2image: localText2imageProvider,
      image2video: localImage2videoProvider
    };

    updateProject({
      title: localTitle,
      targetDuration: finalDuration,
      language: localLanguage,
      visualStyle: localStyle,
      imageSize: localImageSize,
      imageCount: localImageCount,
      modelProviders: newModelProviders
    });

    // Apply model provider configuration
    ModelService.setCurrentProjectProviders(newModelProviders);

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-600/80 border border-slate-600 rounded-lg w-[480px] max-w-[90vw] max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-600 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-slate-50 tracking-wide flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            项目设置
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 flex-1 overflow-y-auto bg-slate-800">
          {/* Title Input */}
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">项目标题</label>
            <input
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              className="w-full bg-bg-input border border-slate-600 text-slate-50 px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none transition-all"
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
                  className="w-full bg-bg-input border border-slate-600 text-slate-50 px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
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
                  className="w-full bg-bg-input border border-slate-600 text-slate-50 px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
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
                  className="w-full bg-bg-input border border-slate-600 text-slate-50 px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
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
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">参考图数</label>
              <div className="relative">
                <select
                  value={localImageCount}
                  onChange={(e) => setLocalImageCount(Number(e.target.value))}
                  className="w-full bg-bg-input border border-slate-600 text-slate-50 px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                >
                  {IMAGE_COUNT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                </div>
              </div>
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
                      ? 'bg-slate-200/50 text-slate-50 border-slate-100 shadow-sm'
                      : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-300 hover:text-slate-200'
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
                  className="w-full bg-bg-input border border-slate-600 text-slate-50 px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none font-mono placeholder:text-slate-600"
                  placeholder="输入时长 (如: 90s, 3m)"
                />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-600 pt-4">
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
                className="w-full bg-bg-input border border-slate-600 text-slate-50 px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
              >
                <option value="">系统默认模型</option>
                {modelConfigs.filter(c => c.modelType === 'llm' && c.apiKey).map(config => (
                  <option key={config.id} value={config.id}>
                    {config.provider} - {config.description || config.model}{config.enabled ? '✅' : null}
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
                className="w-full bg-bg-input border border-slate-600 text-slate-50 px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
              >
                <option value="">系统默认模型</option>
                {modelConfigs.filter(c => c.modelType === 'text2image' && c.apiKey).map(config => (
                  <option key={config.id} value={config.id}>
                    {config.provider} - {config.description || config.model}{config.enabled ? '✅' : null}
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
                className="w-full bg-bg-input border border-slate-600 text-slate-50 px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
              >
                <option value="">系统默认模型</option>
                {modelConfigs.filter(c => c.modelType === 'image2video' && c.apiKey).map(config => (
                  <option key={config.id} value={config.id}>
                    {config.provider} - {config.description || config.model}{config.enabled ? '✅' : null}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none">
                <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-600 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 text-slate-400 hover:text-slate-50 hover:bg-slate-500 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={saveSettings}
            className="flex-1 py-3 bg-slate-700 text-slate-50 hover:bg-slate-400 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsModal;
