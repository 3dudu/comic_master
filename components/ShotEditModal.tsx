import { Aperture, Check, ChevronRight, Plus, RefreshCw, Trash, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { modelConfigEventBus } from '../services/modelConfigEvents';
import { getAllModelConfigs } from '../services/storageService';
import { AIModelConfig, Character } from '../types';

interface Keyframe {
  id?: string;
  type: 'start' | 'end' | 'full';
  visualPrompt: string;
  status?: 'pending' | 'generating' | 'completed' | 'failed';
}

interface Shot {
  id: string;
  sceneId: string;
  actionSummary: string;
  dialogue?: string;
  cameraMovement: string;
  shotSize?: string;
  characters: string[];
  keyframes: Keyframe[];
  interval?: {
    id: string;
    startKeyframeId: string;
    endKeyframeId: string;
    duration: number;
    motionStrength: number;
    videoUrl?: string;
    status: 'pending' | 'generating' | 'completed' | 'failed';
  };
  modelProviders?: {
    text2image?: string;
    image2video?: string;
  };
}

interface Props {
  shot: Shot;
  characters: Character[];
  onSave: (updatedShot: Partial<Shot>) => void;
  onClose: () => void;
}

const ShotEditModal: React.FC<Props> = ({ shot, characters, onSave, onClose }) => {
  const [tempShot, setTempShot] = useState<Partial<Shot>>({ ...shot });
  const [modelConfigs, setModelConfigs] = useState<AIModelConfig[]>([]);
  const isNewShot = !shot.id;

  useEffect(() => {
    const loadModelConfigs = async () => {
      try {
        const configs = await getAllModelConfigs();
        setModelConfigs(configs);
      } catch (error) {
        console.error('加载模型配置失败:', error);
      }
    };
    loadModelConfigs();
  }, []);

  // 监听模型配置变更事件
  useEffect(() => {
    const unsubscribe = modelConfigEventBus.subscribe(async () => {
      try {
        const configs = await getAllModelConfigs();
        setModelConfigs(configs);
        console.log('模型配置已自动刷新');
      } catch (error) {
        console.error('自动刷新模型配置失败:', error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const toggleCharacter = (charId: string) => {
    const currentChars = tempShot.characters || [];
    const updatedChars = currentChars.includes(charId)
      ? currentChars.filter((c: string) => c !== charId)
      : [...currentChars, charId];
    setTempShot({ ...tempShot, characters: updatedChars });
  };

  const addKeyframe = () => {
    const newKeyframe: Keyframe = {
      id: `kf-${Date.now()}`,
      type: 'start',
      visualPrompt: '',
      status: 'pending'
    };
    setTempShot({
      ...tempShot,
      keyframes: [...(tempShot.keyframes || []), newKeyframe]
    });
  };

  const updateKeyframe = (kfIndex: number, field: string, value: any) => {
    const updatedKeyframes = [...(tempShot.keyframes || [])];
    updatedKeyframes[kfIndex] = { ...updatedKeyframes[kfIndex], [field]: value };
    setTempShot({ ...tempShot, keyframes: updatedKeyframes });
  };

  const deleteKeyframe = (kfIndex: number) => {
    const updatedKeyframes = (tempShot.keyframes || []).filter((_: any, i: number) => i !== kfIndex);
    setTempShot({ ...tempShot, keyframes: updatedKeyframes });
  };

  const handleSave = () => {
    onSave(tempShot);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-800 border border-slate-600 rounded-lg w-[600px] max-w-[90vw] max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="bg-slate-600/80 p-6 border-b border-slate-600 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-slate-50 tracking-wide flex items-center gap-2">
            <Aperture className="w-4 h-4 text-slate-400" />
            {isNewShot ? '添加分镜' : '编辑分镜'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Action Summary */}
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">动作描述</label>
            <textarea
              value={tempShot.actionSummary || ''}
              onChange={(e) => setTempShot({ ...tempShot, actionSummary: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-3 py-2.5 text-xs rounded-md focus:border-slate-600 focus:outline-none transition-all resize-none"
              rows={2}
              placeholder="描述镜头中的动作..."
            />
          </div>

          {/* Dialogue */}
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">对白 (可选)</label>
            <textarea
              value={tempShot.dialogue || ''}
              onChange={(e) => setTempShot({ ...tempShot, dialogue: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-3 py-2.5 text-xs rounded-md focus:border-slate-600 focus:outline-none transition-all resize-none"
              rows={2}
              placeholder="镜头中的对白..."
            />
          </div>

          {/* Shot Size & Camera Movement & Duration */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">景别</label>
              <div className="relative">
                <select
                  value={tempShot.shotSize || 'MED'}
                  onChange={(e) => setTempShot({ ...tempShot, shotSize: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-3 py-2.5 text-xs rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="特写">特写</option>
                  <option value="大特写">大特写</option>
                  <option value="中近景">中近景</option>
                  <option value="中景">中景</option>
                  <option value="中远景">中远景</option>
                  <option value="远景">远景</option>
                  <option value="全景">全景</option>
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">镜头运动</label>
              <div className="relative">
                <select
                  value={tempShot.cameraMovement || '固定'}
                  onChange={(e) => setTempShot({ ...tempShot, cameraMovement: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-3 py-2.5 text-xs rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="固定">固定</option>
                  <option value="前推">前推</option>
                  <option value="后拉">后拉</option>
                  <option value="左摇">左摇</option>
                  <option value="右摇">右摇</option>
                  <option value="上移">上移</option>
                  <option value="下移">下移</option>
                  <option value="跟随">跟随</option>
                  <option value="手持">手持</option>
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">时长 (秒)</label>
              <div className="relative">
                <select
                  value={tempShot.interval?.duration || 5}
                  onChange={(e) => setTempShot({
                    ...tempShot,
                    interval: {
                      ...tempShot.interval,
                      duration: Number(e.target.value)
                    } as any
                  })}
                  className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-3 py-2.5 text-xs rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(sec => (
                    <option key={sec} value={sec}>{sec} 秒</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                </div>
              </div>
            </div>
          </div>

          {/* Characters */}
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">角色</label>
            <div className="flex flex-wrap gap-2">
              {characters.map(char => {
                const isSelected = (tempShot.characters || []).includes(char.name);
                const hasImage = !!char.referenceImage;
                return (
                  <button
                    key={char.name}
                    onClick={() => toggleCharacter(char.name)}
                    className={`relative px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-600 text-slate-50 border-slate-500 shadow-lg shadow-slate-500/25 scale-105'
                        : 'bg-slate-900 text-slate-400 border-slate-600 hover:border-slate-300 hover:text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {/* 头像 */}
                    {hasImage && (
                      <div className={`w-5 h-5 rounded-full overflow-hidden flex-shrink-0 ${
                        isSelected ? 'ring-2 ring-white/30' : 'opacity-70'
                      }`}>
                        <img
                          src={char.referenceImage}
                          alt={char.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {/* 对勾图标 - 如果没有头像则显示，如果有头像则显示在右侧 */}
                    {isSelected && !hasImage && <Check className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={3} />}
                    {/* 角色名 */}
                    <span className="truncate">{char.name}</span>
                    {/* 选中且有头像时的对勾 */}
                    {isSelected && hasImage && <Check className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
            {(tempShot.characters || []).length > 0 && (
              <div className="text-[11px] text-slate-500">
                已选择 {tempShot.characters?.length} 个角色
              </div>
            )}
          </div>

          {/* Keyframes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">关键帧</label>
              <button
                onClick={addKeyframe}
                className="text-xs font-bold text-slate-400 hover:text-slate-50 flex items-center gap-1 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded hover:border-slate-300 transition-all"
              >
                <Plus className="w-3 h-3" />
                添加关键帧
              </button>
            </div>

            <div className="space-y-3">
              {(tempShot.keyframes || []).map((kf: Keyframe, kfIdx: number) => (
                <div key={kf.id || kfIdx} className="bg-slate-800 border border-slate-600 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <select
                        value={kf.type || 'start'}
                        onChange={(e) => updateKeyframe(kfIdx, 'type', e.target.value)}
                        className="bg-slate-800 border border-slate-600 text-slate-50 text-xs px-2 py-1 rounded focus:border-slate-600 focus:outline-none"
                      >
                        <option value="start">起始帧</option>
                        <option value="end">结束帧</option>
                        <option value="full">连环画</option>
                      </select>
                    </div>
                    <button
                      onClick={() => deleteKeyframe(kfIdx)}
                      className="p-1.5 hover:bg-red-900/20 text-slate-600 hover:text-red-400 rounded transition-colors"
                      title="删除关键帧"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">画面提示词</label>
                    <textarea
                      value={kf.visualPrompt || ''}
                      onChange={(e) => updateKeyframe(kfIdx, 'visualPrompt', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-3 py-2 text-xs rounded-md focus:border-slate-600 focus:outline-none transition-all resize-none font-mono"
                      rows={3}
                      placeholder="输入视觉提示词，用于 AI 生成图像..."
                    />
                  </div>
                </div>
              ))}
            </div>

            {(tempShot.keyframes || []).length === 0 && (
              <div className="text-center py-8 border border-dashed border-slate-600 rounded-lg">
                <Aperture className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">暂无关键帧，点击上方按钮添加</p>
              </div>
            )}
          </div>

          {/* Model Providers */}
          <div className="space-y-4 border-t border-slate-600 pt-4">
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">模型供应商</div>
              <button
                onClick={async () => {
                  try {
                    const configs = await getAllModelConfigs();
                    setModelConfigs(configs);
                    console.log('模型配置已刷新');
                  } catch (error) {
                    console.error('刷新模型配置失败:', error);
                  }
                }}
                className="text-[11px] text-slate-400 hover:text-slate-50 transition-colors flex items-center gap-1"
                title="刷新模型配置"
              >
                <RefreshCw className="w-3 h-3" />
                <span>刷新</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Text2Image Provider */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">文生图</label>
                <div className="relative">
                  <select
                    value={tempShot.modelProviders?.text2image || ''}
                    onChange={(e) => setTempShot({
                      ...tempShot,
                      modelProviders: {
                        ...tempShot.modelProviders,
                        text2image: e.target.value || undefined
                      }
                    })}
                    className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-3 py-2 text-xs rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">使用项目默认</option>
                    {modelConfigs
                      .filter(c => c.modelType === 'text2image' && c.apiKey)
                      .map(config => (
                    <option key={config.id} value={config.id}>
                      {config.provider} - {config.model || config.description}
                    </option>
                  ))}
                  </select>
                  <div className="absolute right-3 top-2.5 pointer-events-none">
                    <ChevronRight className="w-3 h-3 text-slate-600 rotate-90" />
                  </div>
                </div>
              </div>

              {/* Image2Video Provider */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">图生视频</label>
                <div className="relative">
                  <select
                    value={tempShot.modelProviders?.image2video || ''}
                    onChange={(e) => setTempShot({
                      ...tempShot,
                      modelProviders: {
                        ...tempShot.modelProviders,
                        image2video: e.target.value || undefined
                      }
                    })}
                    className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-3 py-2 text-xs rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">使用项目默认</option>
                    {modelConfigs
                      .filter(c => c.modelType === 'image2video' && c.apiKey)
                      .map(config => (
                    <option key={config.id} value={config.id}>
                      {config.provider} - {config.model || config.description}
                    </option>
                  ))}
                  </select>
                  <div className="absolute right-3 top-2.5 pointer-events-none">
                    <ChevronRight className="w-3 h-3 text-slate-600 rotate-90" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-600/80 border-t border-slate-600 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-900 text-slate-400 hover:text-slate-50 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-slate-700 text-slate-50 hover:bg-slate-400 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShotEditModal;
