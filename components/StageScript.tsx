import { AlertCircle, Aperture, ArrowLeft, BookOpen, BrainCircuit, ChevronRight, Clock, Edit, List, MapPin, Plus, Settings, Sparkles, TextQuote, Trash, Users, Wand2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ModelService } from '../services/modelService';
import { Character, ProjectState, Scene } from '../types';

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

const StageScript: React.FC<Props> = ({ project, updateProject }) => {
  const [activeTab, setActiveTab] = useState<TabMode>(project.scriptData ? 'script' : 'story');
  
  const [localScript, setLocalScript] = useState(project.rawScript);
  const [localTitle, setLocalTitle] = useState(project.title);
  const [localDuration, setLocalDuration] = useState(project.targetDuration || '60s');
  const [localLanguage, setLocalLanguage] = useState(project.language || '中文');
  const [localStyle, setLocalStyle] = useState(project.visualStyle || '写实');
  const [localImageSize, setLocalImageSize] = useState(project.imageSize || '1440x2560');
  const [customDurationInput, setCustomDurationInput] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [scriptPrompt, setScriptPrompt] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [settingTitle, setSettingTitle] = useState('');
  const [settingDuration, setSettingDuration] = useState('');
  const [settingLanguage, setSettingLanguage] = useState('');
  const [settingStyle, setSettingStyle] = useState('');
  const [settingImageSize, setSettingImageSize] = useState('');
  const [settingCustomDuration, setSettingCustomDuration] = useState('');

  // Editing states
  const [editingLogline, setEditingLogline] = useState(false);
  const [tempLogline, setTempLogline] = useState('');
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [tempCharacter, setTempCharacter] = useState<Partial<Character>>({});
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [tempScene, setTempScene] = useState<Partial<Scene>>({});
  const [showAddScene, setShowAddScene] = useState(false);

  useEffect(() => {
    setLocalScript(project.rawScript);
    setLocalTitle(project.title);
    setLocalDuration(project.targetDuration || '60s');
    setLocalLanguage(project.language || '中文');
    setLocalStyle(project.visualStyle || '写实');
    setLocalImageSize(project.imageSize || '1440x2560');

    // 初始化模型服务
    ModelService.initialize();
  }, [project.id]);

  const handleDurationSelect = (val: string) => {
    setLocalDuration(val);
    if (val === 'custom') {
      setCustomDurationInput('');
    }
  };

  const getFinalDuration = () => {
    return localDuration === 'custom' ? customDurationInput : localDuration;
  };

  const openSettings = () => {
    setSettingTitle(project.title);
    setSettingDuration(project.targetDuration || '60s');
    setSettingLanguage(project.language || '中文');
    setSettingStyle(project.visualStyle || '写实');
    setSettingImageSize(project.imageSize || '1440x2560');
    setSettingCustomDuration(project.targetDuration === 'custom' ? project.targetDuration : '');
    setShowSettings(true);
  };

  const saveSettings = () => {
    const finalDuration = settingDuration === 'custom' ? settingCustomDuration : settingDuration;
    updateProject({
      title: settingTitle,
      targetDuration: finalDuration,
      language: settingLanguage,
      visualStyle: settingStyle,
      imageSize: settingImageSize
    });
    setShowSettings(false);
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
    try {
      updateProject({
        title: localTitle,
        rawScript: localScript,
        targetDuration: finalDuration,
        language: localLanguage,
        visualStyle: localStyle,
        imageSize: localImageSize,
        isParsingScript: true
      });

      const scriptData = await ModelService.parseScriptToData(localScript, localLanguage);

      scriptData.targetDuration = finalDuration;
      scriptData.language = localLanguage;

      if (localTitle && localTitle !== "未命名项目") {
        scriptData.title = localTitle;
      }

      const shots = await ModelService.generateShotList(scriptData);

      updateProject({
        scriptData,
        shots,
        isParsingScript: false,
        title: scriptData.title
      });

      setActiveTab('script');

    } catch (err: any) {
      console.error(err);
      setError(`错误: ${err.message || "AI 连接失败"}`);
      updateProject({ isParsingScript: false });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStoryInput = () => (
    <div className="flex h-full bg-[#201F3E] text-zinc-300">
      
      {/* Middle Column: Config Panel - Adjusted Width to w-96 */}
      <div className="w-96 border-r border-zinc-800 flex flex-col bg-[#0e0e28]">
        {/* Header - Fixed Height 56px */}
        <div className="h-14 px-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-zinc-400" />
              项目配置
            </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Title Input */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">项目标题</label>
              <input 
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                className="w-full bg-[#0c0c2d] border border-zinc-800 text-white px-3 py-2.5 text-sm rounded-md focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-all placeholder:text-zinc-700"
                placeholder="输入项目名称..."
              />
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                输出语言
              </label>
              <div className="relative">
                <select
                  value={localLanguage}
                  onChange={(e) => setLocalLanguage(e.target.value)}
                  className="w-full bg-[#0c0c2d] border border-zinc-800 text-white px-3 py-2.5 text-sm rounded-md appearance-none focus:border-zinc-600 focus:outline-none transition-all cursor-pointer"
                >
                  {LANGUAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                   <ChevronRight className="w-4 h-4 text-zinc-600 rotate-90" />
                </div>
              </div>
            </div>

            {/* Visual Style Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                画面风格
              </label>
              <div className="relative">
                <select
                  value={localStyle}
                  onChange={(e) => setLocalStyle(e.target.value)}
                  className="w-full bg-[#0c0c2d] border border-zinc-800 text-white px-3 py-2.5 text-sm rounded-md appearance-none focus:border-zinc-600 focus:outline-none transition-all cursor-pointer"
                >
                  {STYLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                   <ChevronRight className="w-4 h-4 text-zinc-600 rotate-90" />
                </div>
              </div>
            </div>

            {/* Image Size Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                图片尺寸
              </label>
              <div className="relative">
                <select
                  value={localImageSize}
                  onChange={(e) => setLocalImageSize(e.target.value)}
                  className="w-full bg-[#0c0c2d] border border-zinc-800 text-white px-3 py-2.5 text-sm rounded-md appearance-none focus:border-zinc-600 focus:outline-none transition-all cursor-pointer"
                >
                  {IMAGE_SIZE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                   <ChevronRight className="w-4 h-4 text-zinc-600 rotate-90" />
                </div>
              </div>
            </div>

            {/* Duration Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                目标时长
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleDurationSelect(opt.value)}
                    className={`px-2 py-2.5 text-[11px] font-medium rounded-md transition-all text-center border ${
                      localDuration === opt.value
                        ? 'bg-zinc-100 text-black border-zinc-100 shadow-sm'
                        : 'bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
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
                    className="w-full bg-[#0c0c2d] border border-zinc-800 text-white px-3 py-2.5 text-sm rounded-md focus:border-zinc-600 focus:outline-none font-mono placeholder:text-zinc-700"
                    placeholder="输入时长 (如: 90s, 3m)"
                  />
                </div>
              )}
            </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 border-t border-zinc-800 bg-[#0e0e28]">
           <button
              onClick={handleAnalyze}
              disabled={isProcessing}
              className={`w-full py-3.5 font-bold text-xs tracking-widest uppercase rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                isProcessing 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-zinc-200 shadow-white/5'
              }`}
            >
              {isProcessing ? (
                <>
                  <BrainCircuit className="w-4 h-4 animate-spin" />
                  智能分析中...
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
      <div className="flex-1 flex flex-col bg-[#201F3E] relative">
        <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-8 bg-[#201F3E] shrink-0">
           <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>
              <span className="text-xs font-bold text-zinc-400">剧本编辑器</span>
           </div>
           <span className="text-[12px] font-mono text-zinc-600 uppercase tracking-widest">MARKDOWN SUPPORTED</span>
        </div>

        {/* AI Script Generation Input */}
        <div className="border-b border-zinc-800/50 bg-[#0e0e28] p-4">
           <div className="max-w-3xl mx-auto">
              <div className="flex gap-3">
                 <input
                    type="text"
                    value={scriptPrompt}
                    onChange={(e) => setScriptPrompt(e.target.value)}
                    className="flex-1 bg-[#0c0c2d] border border-zinc-800 text-white px-4 py-2.5 text-sm rounded-lg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-zinc-600"
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
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
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
           <div className="max-w-3xl mx-auto h-full flex flex-col py-12 px-8">
              <textarea
                  value={localScript}
                  onChange={(e) => setLocalScript(e.target.value)}
                  className="flex-1 bg-transparent text-zinc-200 font-serif text-lg leading-loose focus:outline-none resize-none placeholder:text-zinc-800 selection:bg-zinc-700"
                  placeholder="在此输入故事大纲或直接粘贴剧本..."
                  spellCheck={false}
              />
           </div>
        </div>

        {/* Editor Status Footer */}
        <div className="h-8 border-t border-zinc-900 bg-[#201F3E] px-4 flex items-center justify-end gap-4 text-[12px] text-zinc-600 font-mono select-none">
           <span>{localScript.length} 字符</span>
           <span>{localScript.split('\n').length} 行</span>
           <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>
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
      <div className="flex flex-col h-full bg-[#201F3E] animate-in fade-in duration-500">
        {/* Header */}
        <div className="h-16 px-6 border-b border-zinc-800 bg-[#090923] flex items-center justify-between shrink-0 z-20">
           <div className="flex items-center gap-6">
              <h2 className="text-lg font-light text-white tracking-tight flex items-center gap-3">
                 <List className="w-5 h-5 text-zinc-400" />
                 拍摄清单
                 <span className="text-xs text-zinc-600 font-mono uppercase tracking-wider ml-1">Script Manifest</span>
              </h2>
              <div className="h-6 w-px bg-zinc-800"></div>
              
              <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                      <span className="text-[12px] text-zinc-600 uppercase tracking-widest">项目</span>
                      <span className="text-sm text-zinc-200 font-medium">{project.scriptData?.title}</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[12px] text-zinc-600 uppercase tracking-widest">时长</span>
                      <span className="text-sm font-mono text-zinc-400">{project.targetDuration}</span>
                  </div>
              </div>
           </div>

           <div className="flex gap-2">
             <button
               onClick={openSettings}
               className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-lg transition-all"
             >
               <Settings className="w-3 h-3" />
               项目设置
             </button>
             <button
               onClick={() => setActiveTab('story')}
               className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-lg transition-all"
             >
               <ArrowLeft className="w-3 h-3" />
               返回编辑
             </button>
           </div>
        </div>
  
        {/* Content Split View */}
        <div className="flex-1 overflow-hidden flex">
           
           {/* Sidebar: Index */}
           <div className="w-72 border-r border-zinc-800 bg-[#0e0e28] flex flex-col hidden lg:flex">
              <div className="p-6 border-b border-zinc-900">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-[12px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                     <TextQuote className="w-3 h-3" /> 故事梗概
                   </h3>
                   {!editingLogline && (
                     <button onClick={startEditLogline} className="text-zinc-600 hover:text-white transition-colors">
                       <Edit className="w-3 h-3" />
                     </button>
                   )}
                 </div>
                 {editingLogline ? (
                   <div className="space-y-2">
                     <textarea
                       value={tempLogline}
                       onChange={(e) => setTempLogline(e.target.value)}
                       className="w-full bg-[#0c0c2d] border border-zinc-800 text-zinc-300 text-xs rounded p-2 focus:border-zinc-600 focus:outline-none resize-none"
                       rows={3}
                     />
                     <div className="flex gap-2">
                       <button onClick={saveLogline} className="flex-1 py-1.5 bg-zinc-800 text-zinc-300 text-[12px] font-bold rounded hover:bg-zinc-700 transition-colors">保存</button>
                       <button onClick={() => setEditingLogline(false)} className="flex-1 py-1.5 bg-zinc-900 text-zinc-500 text-[12px] font-bold rounded hover:text-zinc-300 transition-colors">取消</button>
                     </div>
                   </div>
                 ) : (
                   <p className="text-xs text-zinc-400 italic leading-relaxed font-serif cursor-text hover:text-zinc-300" onClick={startEditLogline}>"{project.scriptData?.logline}"</p>
                 )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Characters */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[12px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                         <Users className="w-3 h-3" /> 演员表
                      </h3>
                      <button onClick={() => setShowAddCharacter(true)} className="text-zinc-600 hover:text-white transition-colors">
                         <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                       {project.scriptData?.characters.map(c => (
                         <div key={c.id} className="flex justify-between items-center group cursor-default p-2 rounded hover:bg-zinc-900/50 transition-colors">
                            {editingCharacterId === c.id ? (
                              <div className="flex-1 space-y-2">
                                <input
                                  type="text"
                                  value={tempCharacter.name || ''}
                                  onChange={(e) => setTempCharacter({ ...tempCharacter, name: e.target.value })}
                                  className="w-full bg-[#0c0c2d] border border-zinc-800 text-white text-xs rounded px-2 py-1 focus:border-zinc-600 focus:outline-none"
                                  placeholder="角色名"
                                />
                                <select
                                  value={tempCharacter.gender || '男'}
                                  onChange={(e) => setTempCharacter({ ...tempCharacter, gender: e.target.value })}
                                  className="w-full bg-[#0c0c2d] border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 focus:border-zinc-600 focus:outline-none"
                                >
                                  <option value="男">男</option>
                                  <option value="女">女</option>
                                  <option value="其他">其他</option>
                                </select>
                                <input
                                  type="text"
                                  value={tempCharacter.age || ''}
                                  onChange={(e) => setTempCharacter({ ...tempCharacter, age: e.target.value })}
                                  className="w-full bg-[#0c0c2d] border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 focus:border-zinc-600 focus:outline-none"
                                  placeholder="年龄"
                                />
                                <div className="flex gap-1">
                                  <button onClick={saveCharacter} className="flex-1 py-1 bg-zinc-800 text-zinc-300 text-[11px] rounded hover:bg-zinc-700">保存</button>
                                  <button onClick={() => { setEditingCharacterId(null); setTempCharacter({}); }} className="flex-1 py-1 bg-zinc-900 text-zinc-500 text-[11px] rounded hover:text-zinc-300">取消</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm text-zinc-300 font-medium group-hover:text-white">{c.name}</span>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[12px] text-zinc-600 font-mono">{c.gender}</span>
                                  <button onClick={() => startEditCharacter(c)} className="text-zinc-600 hover:text-white"><Edit className="w-3 h-3" /></button>
                                  <button onClick={() => deleteCharacter(c.id)} className="text-zinc-600 hover:text-red-400"><Trash className="w-3 h-3" /></button>
                                </div>
                              </>
                            )}
                         </div>
                       ))}
                       {showAddCharacter && (
                         <div className="space-y-2 p-2 bg-[#0c0c2d] rounded border border-zinc-800">
                           <input
                             type="text"
                             value={tempCharacter.name || ''}
                             onChange={(e) => setTempCharacter({ ...tempCharacter, name: e.target.value })}
                             className="w-full bg-[#0e0e28] border border-zinc-800 text-white text-xs rounded px-2 py-1 focus:border-zinc-600 focus:outline-none"
                             placeholder="角色名"
                           />
                           <select
                             value={tempCharacter.gender || '男'}
                             onChange={(e) => setTempCharacter({ ...tempCharacter, gender: e.target.value })}
                             className="w-full bg-[#0e0e28] border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 focus:border-zinc-600 focus:outline-none"
                           >
                             <option value="男">男</option>
                             <option value="女">女</option>
                             <option value="其他">其他</option>
                           </select>
                           <input
                             type="text"
                             value={tempCharacter.age || ''}
                             onChange={(e) => setTempCharacter({ ...tempCharacter, age: e.target.value })}
                             className="w-full bg-[#0e0e28] border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 focus:border-zinc-600 focus:outline-none"
                             placeholder="年龄"
                           />
                           <div className="flex gap-1">
                             <button onClick={addCharacter} className="flex-1 py-1 bg-zinc-800 text-zinc-300 text-[11px] rounded hover:bg-zinc-700">添加</button>
                             <button onClick={() => { setShowAddCharacter(false); setTempCharacter({}); }} className="flex-1 py-1 bg-zinc-900 text-zinc-500 text-[11px] rounded hover:text-zinc-300">取消</button>
                           </div>
                         </div>
                       )}
                    </div>
                  </section>

                  {/* Scenes */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[12px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                         <MapPin className="w-3 h-3" /> 场景列表
                      </h3>
                      <button onClick={() => setShowAddScene(true)} className="text-zinc-600 hover:text-white transition-colors">
                         <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-1">
                       {uniqueScenesList.map((s) => (
                         <div key={s!.id} className="flex items-center gap-3 text-xs text-zinc-400 group cursor-default p-2 rounded hover:bg-zinc-900/50 transition-colors">
                           {editingSceneId === s!.id ? (
                             <div className="flex-1 space-y-2">
                               <input
                                 type="text"
                                 value={tempScene.location || ''}
                                 onChange={(e) => setTempScene({ ...tempScene, location: e.target.value })}
                                 className="w-full bg-[#0c0c2d] border border-zinc-800 text-white text-xs rounded px-2 py-1 focus:border-zinc-600 focus:outline-none"
                                 placeholder="场景名称"
                               />
                               <input
                                 type="text"
                                 value={tempScene.time || ''}
                                 onChange={(e) => setTempScene({ ...tempScene, time: e.target.value })}
                                 className="w-full bg-[#0c0c2d] border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 focus:border-zinc-600 focus:outline-none"
                                 placeholder="时间"
                               />
                               <input
                                 type="text"
                                 value={tempScene.atmosphere || ''}
                                 onChange={(e) => setTempScene({ ...tempScene, atmosphere: e.target.value })}
                                 className="w-full bg-[#0c0c2d] border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 focus:border-zinc-600 focus:outline-none"
                                 placeholder="氛围"
                               />
                               <div className="flex gap-1">
                                 <button onClick={saveScene} className="flex-1 py-1 bg-zinc-800 text-zinc-300 text-[11px] rounded hover:bg-zinc-700">保存</button>
                                 <button onClick={() => { setEditingSceneId(null); setTempScene({}); }} className="flex-1 py-1 bg-zinc-900 text-zinc-500 text-[11px] rounded hover:text-zinc-300">取消</button>
                               </div>
                             </div>
                           ) : (
                             <>
                               <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full group-hover:bg-zinc-400 transition-colors"></div>
                               <span className="truncate group-hover:text-zinc-200 flex-1">{s!.location}</span>
                               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => startEditScene(s!)} className="text-zinc-600 hover:text-white"><Edit className="w-3 h-3" /></button>
                                 <button onClick={() => deleteScene(s!.id)} className="text-zinc-600 hover:text-red-400"><Trash className="w-3 h-3" /></button>
                               </div>
                             </>
                           )}
                         </div>
                       ))}
                       {showAddScene && (
                         <div className="space-y-2 p-2 bg-[#0c0c2d] rounded border border-zinc-800">
                           <input
                             type="text"
                             value={tempScene.location || ''}
                             onChange={(e) => setTempScene({ ...tempScene, location: e.target.value })}
                             className="w-full bg-[#0e0e28] border border-zinc-800 text-white text-xs rounded px-2 py-1 focus:border-zinc-600 focus:outline-none"
                             placeholder="场景名称"
                           />
                           <input
                             type="text"
                             value={tempScene.time || ''}
                             onChange={(e) => setTempScene({ ...tempScene, time: e.target.value })}
                             className="w-full bg-[#0e0e28] border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 focus:border-zinc-600 focus:outline-none"
                             placeholder="时间 (如: 日间/夜间)"
                           />
                           <input
                             type="text"
                             value={tempScene.atmosphere || ''}
                             onChange={(e) => setTempScene({ ...tempScene, atmosphere: e.target.value })}
                             className="w-full bg-[#0e0e28] border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 focus:border-zinc-600 focus:outline-none"
                             placeholder="氛围"
                           />
                           <div className="flex gap-1">
                             <button onClick={addScene} className="flex-1 py-1 bg-zinc-800 text-zinc-300 text-[11px] rounded hover:bg-zinc-700">添加</button>
                             <button onClick={() => { setShowAddScene(false); setTempScene({}); }} className="flex-1 py-1 bg-zinc-900 text-zinc-500 text-[11px] rounded hover:text-zinc-300">取消</button>
                           </div>
                         </div>
                       )}
                    </div>
                  </section>
              </div>
           </div>
  
           {/* Main: Script & Shots */}
           <div className="flex-1 overflow-y-auto bg-[#201F3E] p-0">
              <div className="max-w-5xl mx-auto pb-20">
                 {project.scriptData?.scenes.map((scene, index) => {
                   const sceneShots = project.shots.filter(s => s.sceneId === scene.id);
                   if (sceneShots.length === 0) return null;

                   return (
                     <div key={scene.id} className="border-b border-zinc-800">
                        {/* Scene Header strip */}
                        <div className="sticky top-0 z-10 bg-[#090923]/95 backdrop-blur border-y border-zinc-800 px-8 py-5 flex items-center justify-between shadow-lg shadow-black/20">
                           <div className="flex items-baseline gap-4">
                              <span className="text-3xl font-bold text-white/10 font-mono">{(index + 1).toString().padStart(2, '0')}</span>
                              <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                                 {scene.location}
                              </h3>
                           </div>
                           <div className="flex gap-4 text-[12px] font-mono uppercase tracking-widest text-zinc-500">
                              <span className="flex items-center gap-1.5"><Clock className="w-3 h-3"/> {scene.time}</span>
                              <span className="text-zinc-700">|</span>
                              <span>{scene.atmosphere}</span>
                           </div>
                        </div>
  
                        {/* Shot Rows */}
                        <div className="divide-y divide-zinc-800/50">
                           {sceneShots.map((shot, sIdx) => (
                             <div key={shot.id} className="group bg-[#201F3E] hover:bg-[#0e0e28] transition-colors p-8 flex gap-8">
                                
                                {/* Shot ID & Tech Data */}
                                <div className="w-32 flex-shrink-0 flex flex-col gap-4">
                                   <div className="text-xs font-mono text-zinc-500 group-hover:text-white transition-colors">
                                     SHOT {(project.shots.indexOf(shot) + 1).toString().padStart(3, '0')}
                                   </div>
                                   
                                   <div className="flex flex-col gap-2">
                                     <div className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[12px] font-mono text-zinc-400 uppercase text-center rounded">
                                       {shot.shotSize || 'MED'}
                                     </div>
                                     <div className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[12px] font-mono text-zinc-400 uppercase text-center rounded">
                                       {shot.cameraMovement}
                                     </div>
                                   </div>
                                </div>

                                {/* Main Action */}
                                <div className="flex-1 space-y-4">
                                   <p className="text-zinc-200 text-sm leading-7 font-medium max-w-2xl">
                                     {shot.actionSummary}
                                   </p>
                                   
                                   {shot.dialogue && (
                                      <div className="pl-6 border-l-2 border-zinc-800 group-hover:border-zinc-600 transition-colors py-1">
                                         <p className="text-zinc-400 font-serif italic text-sm">"{shot.dialogue}"</p>
                                      </div>
                                   )}
                                   
                                   {/* Tags/Characters */}
                                   <div className="flex flex-wrap gap-2 pt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                      {shot.characters.map(cid => {
                                         const char = project.scriptData?.characters.find(c => c.id === cid);
                                         return char ? (
                                           <span key={cid} className="text-[12px] uppercase font-bold tracking-wider text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded-full bg-zinc-900">
                                              {char.name}
                                           </span>
                                         ) : null;
                                      })}
                                   </div>
                                </div>

                                {/* Prompt Preview */}
                                <div className="w-64 hidden xl:block pl-6 border-l border-zinc-900">
                                   <div className="text-[12px] font-bold text-zinc-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <Aperture className="w-3 h-3" /> 画面提示词 (AI Prompt)
                                   </div>
                                   <p className="text-[12px] text-zinc-600 font-mono leading-relaxed line-clamp-4 hover:line-clamp-none hover:text-zinc-400 transition-all cursor-text bg-zinc-900/30 p-2 rounded">
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

  const renderSettingsModal = () => (
    showSettings && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowSettings(false);
        }}
      >
        <div className="bg-[#0e0e28] border border-zinc-800 rounded-lg w-[480px] max-w-[90vw] max-h-[85vh] overflow-y-auto shadow-2xl">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <Settings className="w-4 h-4 text-zinc-400" />
              项目设置
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Title Input */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">项目标题</label>
              <input
                type="text"
                value={settingTitle}
                onChange={(e) => setSettingTitle(e.target.value)}
                className="w-full bg-[#0c0c2d] border border-zinc-800 text-white px-3 py-2.5 text-sm rounded-md focus:border-zinc-600 focus:outline-none transition-all"
                placeholder="输入项目名称..."
              />
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">输出语言</label>
              <div className="relative">
                <select
                  value={settingLanguage}
                  onChange={(e) => setSettingLanguage(e.target.value)}
                  className="w-full bg-[#0c0c2d] border border-zinc-800 text-white px-3 py-2.5 text-sm rounded-md appearance-none focus:border-zinc-600 focus:outline-none transition-all cursor-pointer"
                >
                  {LANGUAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-zinc-600 rotate-90" />
                </div>
              </div>
            </div>

            {/* Visual Style Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">画面风格</label>
              <div className="relative">
                <select
                  value={settingStyle}
                  onChange={(e) => setSettingStyle(e.target.value)}
                  className="w-full bg-[#0c0c2d] border border-zinc-800 text-white px-3 py-2.5 text-sm rounded-md appearance-none focus:border-zinc-600 focus:outline-none transition-all cursor-pointer"
                >
                  {STYLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-zinc-600 rotate-90" />
                </div>
              </div>
            </div>

            {/* Image Size Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">图片尺寸</label>
              <div className="relative">
                <select
                  value={settingImageSize}
                  onChange={(e) => setSettingImageSize(e.target.value)}
                  className="w-full bg-[#0c0c2d] border border-zinc-800 text-white px-3 py-2.5 text-sm rounded-md appearance-none focus:border-zinc-600 focus:outline-none transition-all cursor-pointer"
                >
                  {IMAGE_SIZE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-zinc-600 rotate-90" />
                </div>
              </div>
            </div>

            {/* Duration Selection */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">目标时长</label>
              <div className="grid grid-cols-2 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSettingDuration(opt.value)}
                    className={`px-2 py-2.5 text-[11px] font-medium rounded-md transition-all text-center border ${
                      settingDuration === opt.value
                        ? 'bg-zinc-100 text-black border-zinc-100 shadow-sm'
                        : 'bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {settingDuration === 'custom' && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={settingCustomDuration}
                    onChange={(e) => setSettingCustomDuration(e.target.value)}
                    className="w-full bg-[#0c0c2d] border border-zinc-800 text-white px-3 py-2.5 text-sm rounded-md focus:border-zinc-600 focus:outline-none font-mono placeholder:text-zinc-700"
                    placeholder="输入时长 (如: 90s, 3m)"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-zinc-800 flex gap-3">
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 py-3 bg-zinc-900 text-zinc-400 hover:text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={saveSettings}
              className="flex-1 py-3 bg-white text-black hover:bg-zinc-200 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="h-full bg-[#201F3E]">
      {activeTab === 'story' ? renderStoryInput() : renderScriptBreakdown()}
      {renderSettingsModal()}
    </div>
  );
};

export default StageScript;