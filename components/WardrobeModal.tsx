import { Loader2, Plus, RefreshCw, Shirt, User, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ModelService } from '../services/modelService';
import { Character, CharacterVariation, ProjectState } from '../types';
import { useDialog } from './dialog';

interface Props {
  character: Character | null;
  project: ProjectState;
  localStyle: string;
  imageSize: string;
  processingState: {id: string, type: 'character'|'scene'}|null;
  updateProject: (updates: Partial<ProjectState>) => void;
  onClose: () => void;
  setPreviewImage: (image:string)=>void;
}

const WardrobeModal: React.FC<Props> = ({
  character,
  project,
  localStyle,
  imageSize,
  processingState,
  updateProject,
  onClose,
  setPreviewImage
}) => {
  const dialog = useDialog();
  // Variation Form State
  const [newVarName, setNewVarName] = useState("");
  const [newVarPrompt, setNewVarPrompt] = useState("");
  const [editingVisualPrompt, setEditingVisualPrompt] = useState("");

  // Sync visual prompt when character is selected
  useEffect(() => {
    if (character) {
      setEditingVisualPrompt(character.visualPrompt || '');
    }
  }, [character]);

  const handleAddVariation = () => {
      if (!project.scriptData || !character) return;
      const newData = { ...project.scriptData };
      const char = newData.characters.find(c => c.id === character.id);
      if (!char) return;

      const newVar: CharacterVariation = {
          id: `var-${Date.now()}`,
          name: newVarName || "New Outfit",
          visualPrompt: newVarPrompt || character.visualPrompt || "",
          referenceImage: undefined
      };

      if (!char.variations) char.variations = [];
      char.variations.push(newVar);
      
      updateProject({ scriptData: newData });
      setNewVarName("");
      setNewVarPrompt("");
  };

  const handleGenerateVariation = async (varId: string) => {
      if (!character) return;
      const variation = character?.variations?.find(v => v.id === varId);
      if (!character || !variation) return;

      try {
          // IMPORTANT: Use Base Look as reference to maintain facial consistency
          const refImages = character.referenceImage ? [character.referenceImage] : [];
          const prompt = character.visualPrompt || await ModelService.generateVisualPrompts('character', character, project.scriptData?.genre || '剧情片');

          // Enhance prompt to emphasize character consistency
          const enhancedPrompt = `
            生成角色: ${character.name} 的新造型画面，画面风为：${localStyle}，符合下面描述。

            描述：
                ${variation.visualPrompt}

            要求：
                - 画面风为：${localStyle}
                - 如果有参考图，请保持面部特征与参考图一致。
                - 如果没有，角色原来是这样的：${prompt}
        `

          const imageUrl = await ModelService.generateImage(enhancedPrompt, refImages, "variation", localStyle, imageSize,1,{},project.id);

          const newData = { ...project.scriptData! };
          const c = newData.characters.find(c => c.id === character.id);
          const v = c?.variations.find(v => v.id === varId);
          if (v) v.referenceImage = imageUrl;

          updateProject({ scriptData: newData });
      } catch (e) {
          console.error(e);
          await dialog.alert({ title: '错误', message: '造型图生成失败', type: 'error' });
      }
  };

  const handleDeleteVariation = (varId: string) => {
     if (!project.scriptData || !character) return;
      const newData = { ...project.scriptData };
      const char = newData.characters.find(c => c.id === character.id);
      if (!char) return;

      char.variations = char.variations.filter(v => v.id !== varId);
      updateProject({ scriptData: newData });
  };

  const handleSaveVisualPrompt = () => {
    if (!project.scriptData || !character) return;

    const newData = { ...project.scriptData };
    const char = newData.characters.find(c => c.id === character.id);
    if (char) {
      char.visualPrompt = editingVisualPrompt;
      updateProject({ scriptData: newData });
    }
  };

  if (!character) return null;

  return (
    <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
        <div className="bg-[#0f0f23] border border-slate-800 w-full max-w-4xl max-h-[80vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="h-16 px-8 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0e1230]">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                        {character.referenceImage && <img src={character.referenceImage} className="w-full h-full object-cover"/>}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">{character.name}</h3>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">服装造型</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Base Look */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <User className="w-4 h-4" /> 基础形象
                        </h4>
                        <div className="bg-[#0e0e28] p-4 rounded-xl border border-slate-800">
                            <div className="aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden mb-4 relative cursor-pointer" onClick={() =>  setPreviewImage(character.referenceImage)}>
                                {character.referenceImage ? (
                                    <img src={character.referenceImage} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-700">无图像</div>
                                )}
                                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[12px] text-white font-bold uppercase border border-white/10">默认</div>
                                {character.referenceImage && (
                                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                                        <span className="text-white/80 text-xs font-bold uppercase tracking-wider">点击预览</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">视觉提示</label>
                                <textarea
                                    value={editingVisualPrompt}
                                    onChange={(e) => setEditingVisualPrompt(e.target.value)}
                                    onBlur={handleSaveVisualPrompt}
                                    placeholder="输入角色的视觉描述..."
                                    className="w-full bg-[#0f0f23] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none h-24 font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Variations */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Shirt className="w-4 h-4" /> 服装造型
                            </h4>
                        </div>

                        <div className="space-y-4">
                            {/* List */}
                            {(character.variations || []).map((variation) => (
                                <div key={variation.id} className="flex gap-4 p-4 bg-[#0e0e28] border border-slate-800 rounded-xl group hover:border-slate-700 transition-colors">
                                    <div className={`w-20 h-24 bg-slate-900 rounded-lg flex-shrink-0 overflow-hidden relative border border-slate-800 ${variation.referenceImage && !(processingState?.type === 'character' && processingState?.id === variation.id) ? 'cursor-pointer' : ''}`} onClick={variation.referenceImage && !(processingState?.type === 'character' && processingState?.id === variation.id) ? () => setPreviewImage(variation.referenceImage) : undefined}>
                                        {variation.referenceImage ? (
                                            <img src={variation.referenceImage} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Shirt className="w-6 h-6 text-slate-800" />
                                            </div>
                                        )}
                                        {variation.referenceImage && !(processingState?.type === 'character' && processingState?.id === variation.id) && (
                                            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none">
                                                <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">预览</span>
                                            </div>
                                        )}
                                        {processingState?.type === 'character' && processingState?.id === variation.id && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <h5 className="font-bold text-slate-200 text-sm">{variation.name}</h5>
                                            <button onClick={() => handleDeleteVariation(variation.id)} className="text-slate-600 hover:text-red-500"><X className="w-3 h-3"/></button>
                                        </div>
                                        <p className="text-[12px] text-slate-500 line-clamp-2 mb-3 font-mono">{variation.visualPrompt}</p>
                                        <button
                                            onClick={() => handleGenerateVariation(variation.id)}
                                            disabled={!!processingState}
                                            className="text-[12px] font-bold uppercase tracking-wider text-indigo-400 hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <RefreshCw className={`w-3 h-3 ${processingState?.type === 'character' && processingState?.id === variation.id ? 'animate-spin' : ''}`} />
                                            {processingState?.type === 'character' && processingState?.id === variation.id ? '生成中...' : variation.referenceImage ? '重新生成' : '生成造型'}
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Add New */}
                            <div className="p-4 border border-dashed border-slate-800 rounded-xl bg-[#0e0e28]/50">
                                <div className="space-y-3">
                                    <input 
                                        type="text" 
                                        placeholder="造型名称（示例：穿校服）" 
                                        value={newVarName}
                                        onChange={e => setNewVarName(e.target.value)}
                                        className="w-full bg-[#0f0f23] border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
                                    />
                                    <textarea 
                                        placeholder="服饰 / 状态的视觉描述……"
                                        value={newVarPrompt}
                                        onChange={e => setNewVarPrompt(e.target.value)}
                                        className="w-full bg-[#0f0f23] border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-600 resize-none h-16"
                                    />
                                    <button 
                                        onClick={handleAddVariation}
                                        disabled={!newVarName || !newVarPrompt}
                                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> 添加造型
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default WardrobeModal;
