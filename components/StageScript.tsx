import { AlertCircle, Aperture, ArrowLeft, BookOpen, BrainCircuit, ChevronRight, Clock, Edit, Film, Image, List, MapPin, Plus, Sparkles, TextQuote, Trash, Users, Wand2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { getAllModelConfigs } from '../services/modelConfigService';
import { ModelService } from '../services/modelService';
import { Character, ProjectState, Scene } from '../types';
import SceneEditModal from './SceneEditModal';
import ShotEditModal from './ShotEditModal';

interface Props {
  project: ProjectState;
  updateProject: (updates: Partial<ProjectState>) => void;
}

type TabMode = 'story' | 'script';

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

const GENRE_OPTIONS = [
  { label: '剧情片', value: '剧情片' },
  { label: '动作片', value: '动作片' },
  { label: '科幻片', value: '科幻片' },
  { label: '悬疑片', value: '悬疑片' },
  { label: '恐怖片', value: '恐怖片' },
  { label: '喜剧片', value: '喜剧片' },
  { label: '爱情片', value: '爱情片' },
  { label: '历史片', value: '历史片' },
  { label: '战争片', value: '战争片' },
  { label: '动画片', value: '动画片' },
  { label: '纪录片', value: '纪录片' },
  { label: '短片', value: '短片' },
  { label: '微电影', value: '微电影' },
  { label: '广告', value: '广告' }
];
/*
  */

const StageScript: React.FC<Props> = ({ project, updateProject }) => {
  const [activeTab, setActiveTab] = useState<TabMode>(project.scriptData ? 'script' : 'story');
  
  const [localScript, setLocalScript] = useState(project.rawScript);
  const [localTitle, setLocalTitle] = useState(project.title);
  const [localDuration, setLocalDuration] = useState(project.targetDuration || '60s');
  const [localLanguage, setLocalLanguage] = useState(project.language || '中文');
  const [localStyle, setLocalStyle] = useState(project.visualStyle || '写实');
  const [localImageSize, setLocalImageSize] = useState(project.imageSize || '1440x2560');
  const [localImageCount, setLocalImageCount] = useState(project.imageCount || 1);
  const [customDurationInput, setCustomDurationInput] = useState('');

  const [modelConfigs, setModelConfigs] = useState<any[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptPrompt, setScriptPrompt] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');

  // Editing states
  const [editingLogline, setEditingLogline] = useState(false);
  const [tempLogline, setTempLogline] = useState('');
  const [editingGenre, setEditingGenre] = useState(false);
  const [tempGenre, setTempGenre] = useState('');
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [tempCharacter, setTempCharacter] = useState<Partial<Character>>({});
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [tempScene, setTempScene] = useState<Partial<Scene>>({});
  const [showAddScene, setShowAddScene] = useState(false);
  const [editingShotId, setEditingShotId] = useState<string | null>(null);
  const [editingSceneInMain, setEditingSceneInMain] = useState<Scene | null>(null);
  const [addingShotForSceneId, setAddingShotForSceneId] = useState<string | null>(null);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalScript(project.rawScript);
    setLocalTitle(project.title);
    setLocalDuration(project.targetDuration || '60s');
    setLocalLanguage(project.language || '中文');
    setLocalStyle(project.visualStyle || '写实');
    setLocalImageSize(project.imageSize || '1440x2560');
    setLocalImageCount(project.imageCount || 1);

    // 初始化模型服务
    ModelService.initialize();

    // 加载模型配置
    loadModelConfigs();
  }, [project.id, project.title, project.targetDuration, project.language, project.visualStyle, project.imageSize, project.imageCount]);

  const loadModelConfigs = async () => {
    try {
      const configs = await getAllModelConfigs();
      setModelConfigs(configs);
    } catch (error) {
      console.error('Failed to load model configs:', error);
    }
  };

  // 自动保存 localScript
  useEffect(() => {
    // 清除之前的定时器
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // 如果 localScript 为空或与项目中的值相同，则不保存
    if (!localScript || localScript === project.rawScript) {
      return;
    }

    // 设置新的定时器，延迟 2 秒后保存
    autoSaveTimerRef.current = setTimeout(() => {
      updateProject({
        rawScript: localScript,
        lastModified: Date.now()
      });
    }, 2000);

    // 清理函数：组件卸载时清除定时器
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [localScript, project.rawScript, updateProject]);

  const handleDurationSelect = (val: string) => {
    setLocalDuration(val);
    if (val === 'custom') {
      setCustomDurationInput('');
    }
  };

  const getFinalDuration = () => {
    return localDuration === 'custom' ? customDurationInput : localDuration;
  };

  // Logline editing
  const startEditLogline = () => {
    setTempLogline(project.scriptData?.logline || '');
    setEditingLogline(true);
  };

  const saveLogline = () => {
    if (!project.scriptData) return;
    updateProject({
      scriptData: {
        ...project.scriptData,
        logline: tempLogline
      }
    });
    setEditingLogline(false);
  };

  const startEditGenre = () => {
    setTempGenre(project.scriptData?.genre || '剧情片');
    setEditingGenre(true);
  };

  const saveGenre = () => {
    if (!project.scriptData) return;
    updateProject({
      scriptData: {
        ...project.scriptData,
        genre: tempGenre
      }
    });
    setEditingGenre(false);
  };

  // Character editing
  const startEditCharacter = (char: Character) => {
    setTempCharacter({ ...char });
    setEditingCharacterId(char.id);
  };

  const saveCharacter = () => {
    if (!project.scriptData || !editingCharacterId || !tempCharacter.name) return;
    const updatedCharacters = project.scriptData.characters.map(c =>
      c.id === editingCharacterId ? { ...c, ...tempCharacter } as Character : c
    );
    updateProject({
      scriptData: {
        ...project.scriptData,
        characters: updatedCharacters
      }
    });
    setEditingCharacterId(null);
    setTempCharacter({});
  };

  const addCharacter = () => {
    if (!project.scriptData || !tempCharacter.name) return;
    const newCharacter: Character = {
      id: `char-${Date.now()}`,
      name: tempCharacter.name,
      gender: tempCharacter.gender || '未知',
      age: tempCharacter.age || '未知',
      personality: tempCharacter.personality || '',
      variations: []
    };
    updateProject({
      scriptData: {
        ...project.scriptData,
        characters: [...project.scriptData.characters, newCharacter]
      }
    });
    setShowAddCharacter(false);
    setTempCharacter({});
  };

  const deleteCharacter = (charId: string) => {
    if (!project.scriptData) return;
    if (!window.confirm('确定要删除这个角色吗？')) return;
    const updatedCharacters = project.scriptData.characters.filter(c => c.id !== charId);
    updateProject({
      scriptData: {
        ...project.scriptData,
        characters: updatedCharacters
      }
    });
  };

  // Scene editing
  const startEditScene = (scene: Scene) => {
    setTempScene({ ...scene });
    setEditingSceneId(scene.id);
  };

  const saveScene = () => {
    if (!project.scriptData || !editingSceneId || !tempScene.location) return;
    const updatedScenes = project.scriptData.scenes.map(s =>
      s.id === editingSceneId ? { ...s, ...tempScene } as Scene : s
    );
    updateProject({
      scriptData: {
        ...project.scriptData,
        scenes: updatedScenes
      }
    });
    setEditingSceneId(null);
    setTempScene({});
  };

  const saveSceneFromModal = (updatedScene: Partial<Scene>, updatedStoryParagraphs: any[]) => {
    if (!project.scriptData || !editingSceneInMain) return;
    const updatedScenes = project.scriptData.scenes.map(s =>
      s.id === editingSceneInMain.id ? { ...s, ...updatedScene } as Scene : s
    );
    updateProject({
      scriptData: {
        ...project.scriptData,
        scenes: updatedScenes,
        storyParagraphs: updatedStoryParagraphs
      }
    });
    setEditingSceneInMain(null);
  };

  const addScene = () => {
    if (!project.scriptData || !tempScene.location) return;
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      location: tempScene.location,
      time: tempScene.time || '日间',
      atmosphere: tempScene.atmosphere || ''
    };
    updateProject({
      scriptData: {
        ...project.scriptData,
        scenes: [...project.scriptData.scenes, newScene]
      }
    });
    setShowAddScene(false);
    setTempScene({});
  };

  const deleteScene = (sceneId: string) => {
    if (!project.scriptData) return;
    if (!window.confirm('确定要删除这个场景吗？')) return;
    const updatedScenes = project.scriptData.scenes.filter(s => s.id !== sceneId);
    updateProject({
      scriptData: {
        ...project.scriptData,
        scenes: updatedScenes
      }
    });
  };

  // Shot editing
  const startEditShot = (shot: any) => {
    setEditingShotId(shot.id);
  };

  const startAddShot = (sceneId: string) => {
    setAddingShotForSceneId(sceneId);
  };

  const saveShot = (updatedShot: Partial<any>) => {
    if (editingShotId) {
      // 编辑现有 shot
      const updatedShots = project.shots.map(s =>
        s.id === editingShotId ? { ...s, ...updatedShot } : s
      );
      updateProject({ shots: updatedShots });
      setEditingShotId(null);
    } else if (addingShotForSceneId) {
      // 添加新 shot
      const newShot: any = {
        id: `shot-${Date.now()}`,
        sceneId: addingShotForSceneId,
        actionSummary: updatedShot.actionSummary || '',
        dialogue: updatedShot.dialogue || '',
        cameraMovement: updatedShot.cameraMovement || '固定',
        shotSize: updatedShot.shotSize || 'MED',
        duration: updatedShot.duration || 5,
        characters: updatedShot.characters || [],
        keyframes: updatedShot.keyframes || []
      };
      updateProject({ shots: [...project.shots, newShot] });
      setAddingShotForSceneId(null);
    }
  };

  const deleteShot = (shotId: string) => {
    if (!window.confirm('确定要删除这个分镜吗？')) return;
    const updatedShots = project.shots.filter(s => s.id !== shotId);
    updateProject({ shots: updatedShots });
  };

  const handleGenerateScript = async () => {
    if (!scriptPrompt.trim()) {
      setError("请输入剧本提示词。");
      return;
    }

    setIsGeneratingScript(true);
    setError(null);
    try {
      const generatedScript = await ModelService.generateScript(
        scriptPrompt,
        project.scriptData?.genre || '剧情片',
        getFinalDuration(),
        localLanguage
      );
      setLocalScript(generatedScript);
    } catch (err: any) {
      console.error(err);
      setError(`剧本生成失败: ${err.message || "AI 连接失败"}`);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleAnalyze = async () => {
    if (!localScript.trim()) {
      setError("请输入剧本内容。");
      return;
    }

    const finalDuration = getFinalDuration();
    if (!finalDuration) {
      setError("请选择目标时长。");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessingStep('正在分析剧本结构...');
    try {
      updateProject({
        title: localTitle,
        rawScript: localScript,
        targetDuration: finalDuration,
        language: localLanguage,
        visualStyle: localStyle,
        imageSize: localImageSize,
        imageCount: localImageCount,
        isParsingScript: true
      });

      const scriptData = await ModelService.parseScriptToData(localScript, localLanguage);

      scriptData.targetDuration = finalDuration;
      scriptData.language = localLanguage;

      if (localTitle && localTitle !== "未命名项目") {
        scriptData.title = localTitle;
      }

      // 逐场景生成分镜
      const allShots: any[] = [];
      const totalScenes = scriptData.scenes.length;

      for (let i = 0; i < totalScenes; i++) {
        const scene = scriptData.scenes[i];
        setProcessingStep(`正在生成第 ${i + 1}/${totalScenes} 场的分镜...`);

        const sceneShots = await ModelService.generateShotListForScene(scriptData, scene, i);
        allShots.push(...sceneShots);

        // 短暂延迟，避免请求过快
        if (i < totalScenes - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      // 重新索引 shots
      const shots = allShots.map((s, idx) => ({
        ...s,
        id: `shot-${idx + 1}`,
        keyframes: Array.isArray(s.keyframes)
          ? s.keyframes.map((k: any) => ({
              ...k,
              id: `kf-${idx + 1}-${k.type}`,
              status: "pending",
            }))
          : [],
      }));

      setProcessingStep('正在保存分镜数据...');
      updateProject({
        scriptData,
        shots,
        isParsingScript: false,
        title: scriptData.title
      });

      setActiveTab('script');
      setProcessingStep('');

    } catch (err: any) {
      console.error(err);
      setError(`错误: ${err.message || "AI 连接失败"}`);
      updateProject({ isParsingScript: false });
      setProcessingStep('');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStoryInput = () => (
    <div className="flex h-full bg-[#0e1229] text-slate-300">
      
      {/* Middle Column: Config Panel - Adjusted Width to w-96 */}
      <div className="w-96 border-r border-slate-800 flex flex-col bg-[#0e1230]">
        {/* Header - Fixed Height 56px */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between shrink-0">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              项目配置
            </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Title Input */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">项目标题</label>
              <input 
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                className="w-full bg-[#0c0c2d] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all placeholder:text-slate-700"
                placeholder="输入项目名称..."
              />
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                输出语言
              </label>
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
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                画面风格
              </label>
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

            {/* Image Size Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                图片尺寸
              </label>
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
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                组图数量
              </label>
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
            </div>

            {/* Duration Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                目标时长
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleDurationSelect(opt.value)}
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
                  value={project.modelProviders?.llm || ''}
                  onChange={(e) => {
                    const currentProviders = project.modelProviders || {};
                    updateProject({
                      modelProviders: {
                        ...currentProviders,
                        llm: e.target.value || undefined
                      }
                    });
                  }}
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
                <Image className="w-3 h-3" />
                文生图模型
              </label>
              <div className="relative">
                <select
                  value={project.modelProviders?.text2image || ''}
                  onChange={(e) => {
                    const currentProviders = project.modelProviders || {};
                    updateProject({
                      modelProviders: {
                        ...currentProviders,
                        text2image: e.target.value || undefined
                      }
                    });
                  }}
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
                  value={project.modelProviders?.image2video || ''}
                  onChange={(e) => {
                    const currentProviders = project.modelProviders || {};
                    updateProject({
                      modelProviders: {
                        ...currentProviders,
                        image2video: e.target.value || undefined
                      }
                    });
                  }}
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

        {/* Footer Action */}
        <div className="p-6 border-t border-slate-800 bg-[#0e0e28]">
           <button
              onClick={handleAnalyze}
              disabled={isProcessing}
              className={`w-full py-3.5 font-bold text-xs tracking-widest uppercase rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                isProcessing
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-slate-200 shadow-white/5'
              }`}
            >
              {isProcessing ? (
                <>
                  <BrainCircuit className="w-4 h-4 animate-spin" />
                  {processingStep || '智能分析中...'}
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  生成分镜脚本
                </>
              )}
            </button>
            {error && (
              <div className="mt-4 p-3 bg-red-900/10 border border-red-900/50 text-red-500 text-xs rounded flex items-center gap-2">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {error}
              </div>
            )}
        </div>
      </div>

      {/* Right: Text Editor - Optimized */}
      <div className="flex-1 flex flex-col bg-[#0e1229] relative">
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0e1230] shrink-0">
           <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
              <span className="text-xs font-bold text-slate-400">剧本编辑器</span>
           </div>
           <button
               onClick={() => setActiveTab('script')}
               className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-lg transition-all"
             >
               <ArrowLeft className="w-3 h-3" />
               分镜
            </button>
        </div>

        {/* AI Script Generation Input */}
        <div className="border-b border-slate-800/50 bg-[#0e0e28] p-4">
           <div className="max-w-3xl mx-auto">
              <div className="flex gap-3">
                 <input
                    type="text"
                    value={scriptPrompt}
                    onChange={(e) => setScriptPrompt(e.target.value)}
                    className="flex-1 bg-[#0c0c2d] border border-slate-800 text-white px-4 py-2.5 text-sm rounded-lg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                    placeholder="输入简单提示词（如：一个关于青春校园的励志故事）..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGenerateScript();
                      }
                    }}
                 />
                 <button
                    onClick={handleGenerateScript}
                    disabled={isGeneratingScript || !scriptPrompt.trim()}
                    className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
                      isGeneratingScript
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
                    } ${!scriptPrompt.trim() ? 'opacity-50' : ''}`}
                 >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingScript ? 'animate-spin' : ''}`} />
                    {isGeneratingScript ? '生成中...' : 'AI 生成剧本'}
                 </button>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto">
           <div className="max-w-3xl mx-auto h-full flex flex-col py-2">
              <textarea
                  value={localScript}
                  onChange={(e) => setLocalScript(e.target.value)}
                  className="px-2 flex-1 bg-[#0c0c2d] text-slate-200 font-serif text-lg leading-loose focus:outline-none resize-none placeholder:text-slate-800 selection:bg-slate-700"
                  placeholder="在此输入故事大纲或直接粘贴剧本..."
                  spellCheck={false}
              />
           </div>
        </div>

        {/* Editor Status Footer */}
        <div className="h-8 border-t border-slate-900 bg-[#0e1229] px-4 flex items-center justify-end gap-4 text-[12px] text-slate-600 font-mono select-none">
           <span>{localScript.length} 字符</span>
           <span>{localScript.split('\n').length} 行</span>
           <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-green-800"></div>
             {project.lastModified ? '已自动保存' : '准备就绪'}
           </div>
        </div>
      </div>
    </div>
  );

  const renderScriptBreakdown = () => {
    // Deduplication Logic
    const seenLocations = new Set();
    const uniqueScenesList = (project.scriptData?.scenes || []).filter(scene => {
      const normalizedLoc = scene.location.trim().toLowerCase();
      if (seenLocations.has(normalizedLoc)) {
        return false;
      }
      seenLocations.add(normalizedLoc);
      return true;
    });

    return (
      <div className="flex flex-col h-full bg-[#0e1229] animate-in fade-in duration-500">
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-800 bg-[#0e1230] flex items-center justify-between shrink-0 z-20">
           <div className="flex items-center gap-6">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
                 <List className="w-5 h-5 text-indigo-500" />
                 拍摄清单
                 <span className="text-xs text-slate-600 font-mono font-normal uppercase tracking-wider bg-black/30 px-1 py-1 rounded">Script Manifest</span>
              </h2>
              
              <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                      <span className="text-[12px] text-slate-600 uppercase tracking-widest">项目</span>
                      <span className="text-sm text-slate-200 font-medium">{project.scriptData?.title}</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[12px] text-slate-600 uppercase tracking-widest">时长</span>
                      <span className="text-sm font-mono text-slate-400">{project.targetDuration}</span>
                  </div>
              </div>
           </div>

           <div className="flex gap-2">
             <button
               onClick={() => setActiveTab('story')}
               className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-lg transition-all"
             >
               <ArrowLeft className="w-3 h-3" />
               剧本
             </button>
           </div>
        </div>
  
        {/* Content Split View */}
        <div className="flex-1 overflow-hidden flex">
           
           {/* Sidebar: Index */}
           <div className="w-96 border-r border-slate-800 bg-[#0e1230] flex flex-col hidden lg:flex">
              <div className="p-6 border-b border-slate-900">
                 {/* Genre Selection */}
                 <div>
                   <div className="flex items-center justify-between mb-2">
                     <h3 className="text-[12px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                       <TextQuote className="w-3 h-3" /> 类型
                     </h3>
                     {!editingGenre && (
                       <button onClick={startEditGenre} className="text-slate-600 hover:text-white transition-colors">
                         <Edit className="w-3 h-3" />
                       </button>
                     )}
                   </div>
                   {editingGenre ? (
                     <div className="relative">
                       <select
                         value={tempGenre}
                         onChange={(e) => setTempGenre(e.target.value)}
                         className="w-full bg-[#0c0c2d] border border-slate-800 text-white text-xs rounded px-2 py-1.5 appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                       >
                         {GENRE_OPTIONS.map(opt => (
                           <option key={opt.value} value={opt.value}>{opt.label}</option>
                         ))}
                       </select>
                       <div className="absolute right-2 top-2 pointer-events-none">
                         <ChevronRight className="w-3 h-3 text-slate-600 rotate-90" />
                       </div>
                       <div className="flex gap-2 mt-2">
                         <button onClick={saveGenre} className="flex-1 py-1 bg-slate-800 text-slate-300 text-[11px] font-bold rounded hover:bg-slate-700 transition-colors">保存</button>
                         <button onClick={() => setEditingGenre(false)} className="flex-1 py-1 bg-slate-900 text-slate-500 text-[11px] font-bold rounded hover:text-slate-300 transition-colors">取消</button>
                       </div>
                     </div>
                   ) : (
                     <p className="text-xs text-slate-300 font-medium cursor-text hover:text-white" onClick={startEditGenre}>{project.scriptData?.genre || '剧情片'}</p>
                   )}
                 </div>
              </div>
              <div className="p-6 border-b border-slate-900">
                 {/* Logline */}
                 <div>
                   <div className="flex items-center justify-between mb-2">
                     <h3 className="text-[12px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                       <TextQuote className="w-3 h-3" /> 故事梗概
                     </h3>
                     {!editingLogline && (
                       <button onClick={startEditLogline} className="text-slate-600 hover:text-white transition-colors">
                         <Edit className="w-3 h-3" />
                       </button>
                     )}
                   </div>
                   {editingLogline ? (
                     <div className="space-y-2">
                       <textarea
                         value={tempLogline}
                         onChange={(e) => setTempLogline(e.target.value)}
                         className="w-full bg-[#0c0c2d] border border-slate-800 text-slate-300 text-xs rounded p-2 focus:border-slate-600 focus:outline-none resize-none"
                         rows={3}
                       />
                       <div className="flex gap-2">
                         <button onClick={saveLogline} className="flex-1 py-1.5 bg-slate-800 text-slate-300 text-[12px] font-bold rounded hover:bg-slate-700 transition-colors">保存</button>
                         <button onClick={() => setEditingLogline(false)} className="flex-1 py-1.5 bg-slate-900 text-slate-500 text-[12px] font-bold rounded hover:text-slate-300 transition-colors">取消</button>
                       </div>
                     </div>
                   ) : (
                     <p className="text-xs text-slate-400 italic leading-relaxed font-serif cursor-text hover:text-slate-300" onClick={startEditLogline}>"{project.scriptData?.logline}"</p>
                   )}
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Characters */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[12px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                         <Users className="w-3 h-3" /> 演员表
                      </h3>
                      <button onClick={() => setShowAddCharacter(true)} className="text-slate-600 hover:text-white transition-colors">
                         <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                       {project.scriptData?.characters.map(c => (
                         <div key={c.id} className="flex justify-between items-center group cursor-default p-2 rounded hover:bg-slate-900/50 transition-colors">
                            {editingCharacterId === c.id ? (
                              <div className="flex-1 space-y-2">
                                <input
                                  type="text"
                                  value={tempCharacter.name || ''}
                                  onChange={(e) => setTempCharacter({ ...tempCharacter, name: e.target.value })}
                                  className="w-full bg-[#0c0c2d] border border-slate-800 text-white text-xs rounded px-2 py-1 focus:border-slate-600 focus:outline-none"
                                  placeholder="角色名"
                                />
                                <select
                                  value={tempCharacter.gender || '男'}
                                  onChange={(e) => setTempCharacter({ ...tempCharacter, gender: e.target.value })}
                                  className="w-full bg-[#0c0c2d] border border-slate-800 text-slate-300 text-xs rounded px-2 py-1 focus:border-slate-600 focus:outline-none"
                                >
                                  <option value="男">男</option>
                                  <option value="女">女</option>
                                  <option value="其他">其他</option>
                                </select>
                                <input
                                  type="text"
                                  value={tempCharacter.age || ''}
                                  onChange={(e) => setTempCharacter({ ...tempCharacter, age: e.target.value })}
                                  className="w-full bg-[#0c0c2d] border border-slate-800 text-slate-300 text-xs rounded px-2 py-1 focus:border-slate-600 focus:outline-none"
                                  placeholder="年龄"
                                />
                                <div className="flex gap-1">
                                  <button onClick={saveCharacter} className="flex-1 py-1 bg-slate-800 text-slate-300 text-[11px] rounded hover:bg-slate-700">保存</button>
                                  <button onClick={() => { setEditingCharacterId(null); setTempCharacter({}); }} className="flex-1 py-1 bg-slate-900 text-slate-500 text-[11px] rounded hover:text-slate-300">取消</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm text-slate-300 font-medium group-hover:text-white">{c.name}</span>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[12px] text-slate-600 font-mono">{c.gender}</span>
                                  <button onClick={() => startEditCharacter(c)} className="text-slate-600 hover:text-white"><Edit className="w-3 h-3" /></button>
                                  <button onClick={() => deleteCharacter(c.id)} className="text-slate-600 hover:text-red-400"><Trash className="w-3 h-3" /></button>
                                </div>
                              </>
                            )}
                         </div>
                       ))}
                       {showAddCharacter && (
                         <div className="space-y-2 p-2 bg-[#0c0c2d] rounded border border-slate-800">
                           <input
                             type="text"
                             value={tempCharacter.name || ''}
                             onChange={(e) => setTempCharacter({ ...tempCharacter, name: e.target.value })}
                             className="w-full bg-[#0e0e28] border border-slate-800 text-white text-xs rounded px-2 py-1 focus:border-slate-600 focus:outline-none"
                             placeholder="角色名"
                           />
                           <select
                             value={tempCharacter.gender || '男'}
                             onChange={(e) => setTempCharacter({ ...tempCharacter, gender: e.target.value })}
                             className="w-full bg-[#0e0e28] border border-slate-800 text-slate-300 text-xs rounded px-2 py-1 focus:border-slate-600 focus:outline-none"
                           >
                             <option value="男">男</option>
                             <option value="女">女</option>
                             <option value="其他">其他</option>
                           </select>
                           <input
                             type="text"
                             value={tempCharacter.age || ''}
                             onChange={(e) => setTempCharacter({ ...tempCharacter, age: e.target.value })}
                             className="w-full bg-[#0e0e28] border border-slate-800 text-slate-300 text-xs rounded px-2 py-1 focus:border-slate-600 focus:outline-none"
                             placeholder="年龄"
                           />
                           <div className="flex gap-1">
                             <button onClick={addCharacter} className="flex-1 py-1 bg-slate-800 text-slate-300 text-[11px] rounded hover:bg-slate-700">添加</button>
                             <button onClick={() => { setShowAddCharacter(false); setTempCharacter({}); }} className="flex-1 py-1 bg-slate-900 text-slate-500 text-[11px] rounded hover:text-slate-300">取消</button>
                           </div>
                         </div>
                       )}
                    </div>
                  </section>

                  {/* Scenes */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[12px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                         <MapPin className="w-3 h-3" /> 场景列表
                      </h3>
                      <button onClick={() => setShowAddScene(true)} className="text-slate-600 hover:text-white transition-colors">
                         <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-1">
                       {uniqueScenesList.map((s) => (
                         <div key={s!.id} className="flex items-center gap-3 text-xs text-slate-400 group cursor-default p-2 rounded hover:bg-slate-900/50 transition-colors">
                           {editingSceneId === s!.id ? (
                             <div className="flex-1 space-y-2">
                               <input
                                 type="text"
                                 value={tempScene.location || ''}
                                 onChange={(e) => setTempScene({ ...tempScene, location: e.target.value })}
                                 className="w-full bg-[#0c0c2d] border border-slate-800 text-white text-xs rounded px-2 py-1 focus:border-slate-600 focus:outline-none"
                                 placeholder="场景名称"
                               />
                               <input
                                 type="text"
                                 value={tempScene.time || ''}
                                 onChange={(e) => setTempScene({ ...tempScene, time: e.target.value })}
                                 className="w-full bg-[#0c0c2d] border border-slate-800 text-slate-300 text-xs rounded px-2 py-1 focus:border-slate-600 focus:outline-none"
                                 placeholder="时间"
                               />
                               <input
                                 type="text"
                                 value={tempScene.atmosphere || ''}
                                 onChange={(e) => setTempScene({ ...tempScene, atmosphere: e.target.value })}
                                 className="w-full bg-[#0c0c2d] border border-slate-800 text-slate-300 text-xs rounded px-2 py-1 focus:border-slate-600 focus:outline-none"
                                 placeholder="氛围"
                               />
                               <div className="flex gap-1">
                                 <button onClick={saveScene} className="flex-1 py-1 bg-slate-800 text-slate-300 text-[11px] rounded hover:bg-slate-700">保存</button>
                                 <button onClick={() => { setEditingSceneId(null); setTempScene({}); }} className="flex-1 py-1 bg-slate-900 text-slate-500 text-[11px] rounded hover:text-slate-300">取消</button>
                               </div>
                             </div>
                           ) : (
                             <>
                               <div className="w-1.5 h-1.5 bg-slate-700 rounded-full group-hover:bg-slate-400 transition-colors"></div>
                               <span className="truncate group-hover:text-slate-200 flex-1">{s!.location}</span>
                               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => startEditScene(s!)} className="text-slate-600 hover:text-white"><Edit className="w-3 h-3" /></button>
                                 <button onClick={() => deleteScene(s!.id)} className="text-slate-600 hover:text-red-400"><Trash className="w-3 h-3" /></button>
                               </div>
                             </>
                           )}
                         </div>
                       ))}
                       {showAddScene && (
                         <div className="space-y-2 p-2 bg-[#0c0c2d] rounded border border-slate-800">
                           <input
                             type="text"
                             value={tempScene.location || ''}
                             onChange={(e) => setTempScene({ ...tempScene, location: e.target.value })}
                             className="w-full bg-[#0e0e28] border border-slate-800 text-white text-xs rounded px-2 py-1 focus:border-slate-600 focus:outline-none"
                             placeholder="场景名称"
                           />
                           <input
                             type="text"
                             value={tempScene.time || ''}
                             onChange={(e) => setTempScene({ ...tempScene, time: e.target.value })}
                             className="w-full bg-[#0e0e28] border border-slate-800 text-slate-300 text-xs rounded px-2 py-1 focus:border-slate-600 focus:outline-none"
                             placeholder="时间 (如: 日间/夜间)"
                           />
                           <input
                             type="text"
                             value={tempScene.atmosphere || ''}
                             onChange={(e) => setTempScene({ ...tempScene, atmosphere: e.target.value })}
                             className="w-full bg-[#0e0e28] border border-slate-800 text-slate-300 text-xs rounded px-2 py-1 focus:border-slate-600 focus:outline-none"
                             placeholder="氛围"
                           />
                           <div className="flex gap-1">
                             <button onClick={addScene} className="flex-1 py-1 bg-slate-800 text-slate-300 text-[11px] rounded hover:bg-slate-700">添加</button>
                             <button onClick={() => { setShowAddScene(false); setTempScene({}); }} className="flex-1 py-1 bg-slate-900 text-slate-500 text-[11px] rounded hover:text-slate-300">取消</button>
                           </div>
                         </div>
                       )}
                    </div>
                  </section>
              </div>
           </div>
  
           {/* Main: Script & Shots */}
           <div className="flex-1 overflow-y-auto bg-[#0e1229] p-0">
              <div className="max-w-5xl mx-auto pb-20">
                 {project.scriptData?.scenes.map((scene, index) => {
                   const sceneShots = project.shots.filter(s => s.sceneId === scene.id);
                   //if (sceneShots.length === 0) return null;

                   return (
                     <div key={scene.id} className="border-b border-slate-800">
                        {/* Scene Header strip */}
                        <div className="sticky top-0 z-10 bg-[#090923]/95 backdrop-blur border-y border-slate-800 shadow-lg shadow-black/20">
                           <div className="px-8 py-5 flex items-center justify-between">
                              <div className="flex items-center gap-6">
                                 <div className="flex items-baseline gap-4">
                                    <span className="text-3xl font-bold text-white/10 font-mono">{(index + 1).toString().padStart(2, '0')}</span>
                                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                                       {scene.location}
                                    </h3>
                                 </div>
                              </div>
                              <div className="flex gap-4 text-[12px] font-mono uppercase tracking-widest text-slate-500">
                                 <span className="flex items-center gap-1.5"><Clock className="w-3 h-3"/> {scene.time}</span>
                                 <span className="text-slate-700">|</span>
                                 <span>{scene.atmosphere}</span>
                              </div>
                           </div>

                           {/* Action Buttons - Compact */}
                           <div className="px-8 pb-4 border-b border-slate-800 bg-[#090923]">
                              <div className="flex gap-2">
                                 <button
                                    onClick={() => setEditingSceneInMain(scene)}
                                    className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-900/80 border border-slate-800 hover:border-slate-600 rounded transition-all flex items-center justify-center gap-1.5"
                                    title="编辑场景"
                                 >
                                    <Edit className="w-3 h-3" />
                                    <span>编辑场景</span>
                                 </button>
                                 <button
                                    onClick={() => deleteScene(scene.id)}
                                    className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 hover:text-red-400 bg-slate-900/80 border border-slate-800 hover:border-red-900/50 rounded transition-all flex items-center justify-center gap-1.5"
                                    title="删除场景"
                                 >
                                    <Trash className="w-3 h-3" />
                                    <span>删除场景</span>
                                 </button>
                                 <button
                                    onClick={() => startAddShot(scene.id)}
                                    className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 hover:text-indigo-400 bg-slate-900/80 border border-slate-800 hover:border-indigo-600 rounded transition-all flex items-center justify-center gap-1.5"
                                    title="添加分镜"
                                 >
                                    <Plus className="w-3 h-3" />
                                    <span>添加分镜</span>
                                 </button>
                              </div>
                           </div>
                        </div>
  
                        {/* Shot Rows */}
                        <div className="divide-y divide-slate-800/50">
                           {sceneShots.map((shot) => (
                             <div key={shot.id} className="group bg-[#171429] hover:bg-[#0e0e28] transition-colors p-8 flex gap-8">

                                {/* Shot ID & Tech Data */}
                                <div className="w-32 flex-shrink-0 flex flex-col gap-4">
                                   <div className="flex items-center justify-between">
                                     <div className="text-xs font-mono text-slate-500 group-hover:text-white transition-colors">
                                       镜头 {(project.shots.indexOf(shot) + 1).toString().padStart(3, '0')}
                                     </div>
                                     <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button
                                         onClick={() => startEditShot(shot)}
                                         className="p-1.5 hover:bg-slate-800 text-slate-600 hover:text-white rounded transition-colors"
                                         title="编辑"
                                       >
                                         <Edit className="w-3.5 h-3.5" />
                                       </button>
                                       <button
                                         onClick={() => deleteShot(shot.id)}
                                         className="p-1.5 hover:bg-red-900/20 text-slate-600 hover:text-red-400 rounded transition-colors"
                                         title="删除"
                                       >
                                         <Trash className="w-3.5 h-3.5" />
                                       </button>
                                     </div>
                                   </div>

                                   <div className="flex flex-col gap-2">
                                     <div className="px-2 py-1 bg-slate-900 border border-slate-800 text-[12px] font-mono text-slate-400 uppercase text-center rounded">
                                       {shot.shotSize || 'MED'}
                                     </div>
                                     <div className="px-2 py-1 bg-slate-900 border border-slate-800 text-[12px] font-mono text-slate-400 uppercase text-center rounded">
                                       {shot.cameraMovement}
                                     </div>
                                   </div>
                                </div>

                                {/* Main Action */}
                                <div className="flex-1 space-y-4">
                                   <p className="text-slate-200 text-sm leading-7 font-medium max-w-2xl">
                                     {shot.actionSummary}
                                   </p>

                                   {shot.dialogue && (
                                      <div className="pl-6 border-l-2 border-slate-800 group-hover:border-slate-600 transition-colors py-1">
                                         <p className="text-slate-400 font-serif italic text-sm">"{shot.dialogue}"</p>
                                      </div>
                                   )}

                                   {/* Tags/Characters */}
                                   <div className="flex flex-wrap gap-2 pt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                      {shot.characters.map(cid => {
                                         const char = project.scriptData?.characters.find(c => c.id === cid);
                                         return char ? (
                                           <span key={cid} className="text-[12px] uppercase font-bold tracking-wider text-slate-500 border border-slate-800 px-2 py-0.5 rounded-full bg-slate-900">
                                              {char.name}
                                           </span>
                                         ) : null;
                                      })}
                                   </div>
                                </div>

                                {/* Prompt Preview */}
                                <div className="w-64 hidden xl:block pl-6 border-l border-slate-900">
                                   <div className="text-[12px] font-bold text-slate-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <Aperture className="w-3 h-3" /> 画面提示词
                                   </div>
                                   <p className="text-[12px] text-slate-600 font-mono leading-relaxed line-clamp-4 hover:line-clamp-none hover:text-slate-400 transition-all cursor-text bg-slate-900/30 p-2 rounded">
                                     {shot.keyframes[0]?.visualPrompt}
                                   </p>
                                </div>

                             </div>
                           ))}
                        </div>
                     </div>
                   );
                 })}
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderEditShotModal = () => {
    // 编辑现有 shot
    if (editingShotId) {
      const shot = project.shots.find(s => s.id === editingShotId);
      if (!shot) return null;

      return (
        <ShotEditModal
          shot={shot}
          characters={project.scriptData?.characters || []}
          onSave={saveShot}
          onClose={() => {
            setEditingShotId(null);
          }}
        />
      );
    }

    // 添加新 shot
    if (addingShotForSceneId) {
      const newShot: any = {
        id: '',
        sceneId: addingShotForSceneId,
        actionSummary: '',
        dialogue: '',
        cameraMovement: '固定',
        shotSize: 'MED',
        duration: 5,
        characters: [],
        keyframes: []
      };

      return (
        <ShotEditModal
          shot={newShot}
          characters={project.scriptData?.characters || []}
          onSave={saveShot}
          onClose={() => {
            setAddingShotForSceneId(null);
          }}
        />
      );
    }

    return null;
  };

  const renderEditSceneModal = () => {
    if (!editingSceneInMain) return null;

    return (
      <SceneEditModal
        scene={editingSceneInMain}
        storyParagraphs={project.scriptData?.storyParagraphs || []}
        onSave={saveSceneFromModal}
        onClose={() => {
          setEditingSceneInMain(null);
        }}
      />
    );
  };

  return (
    <div className="h-full bg-[#0e1229]">
      {activeTab === 'story' ? renderStoryInput() : renderScriptBreakdown()}
      {renderEditShotModal()}
      {renderEditSceneModal()}
    </div>
  );
};

export default StageScript;