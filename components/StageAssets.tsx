import { Check, Loader2, MapPin, Plus, RefreshCw, Shirt, Sparkles, User, Users, X } from 'lucide-react';
import React, { useState } from 'react';
import { generateImage, generateVisualPrompts } from '../services/doubaoService';
import { CharacterVariation, ProjectState } from '../types';
  

interface Props {
  project: ProjectState;
  updateProject: (updates: Partial<ProjectState>) => void;
}

const StageAssets: React.FC<Props> = ({ project, updateProject }) => {
  const [processingState, setProcessingState] = useState<{id: string, type: 'character'|'scene'}|null>(null);
  const [batchProgress, setBatchProgress] = useState<{current: number, total: number} | null>(null);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [localStyle, setLocalStyle] = useState(project.visualStyle || '写实');
  const [imageSize, setImageSize] = useState(project.imageSize || '2560x1440');

  // Variation Form State
  const [newVarName, setNewVarName] = useState("");
  const [newVarPrompt, setNewVarPrompt] = useState("");

  const handleGenerateAsset = async (type: 'character' | 'scene', id: string) => {
    setProcessingState({ id, type });
    try {
      // Find the item
      let prompt = "";
      if (type === 'character') {
        const char = project.scriptData?.characters.find(c => String(c.id) === String(id));
        if (char) prompt = char.visualPrompt || await generateVisualPrompts('character', char, project.scriptData?.genre || 'Cinematic');
      } else {
        const scene = project.scriptData?.scenes.find(s => String(s.id) === String(id));
        if (scene) prompt = scene.visualPrompt || await generateVisualPrompts('scene', scene, project.scriptData?.genre || 'Cinematic');
      }

      // Real API Call
      const imageUrl = await generateImage(prompt,[],type === 'character',localStyle,imageSize);

      // Update state
      if (project.scriptData) {
        const newData = { ...project.scriptData };
        if (type === 'character') {
          const c = newData.characters.find(c => String(c.id) === String(id));
          if (c) c.referenceImage = imageUrl;
        } else {
          const s = newData.scenes.find(s => String(s.id) === String(id));
          if (s) s.referenceImage = imageUrl;
        }
        updateProject({ scriptData: newData });
      }

    } catch (e) {
      console.error(e);
    } finally {
      setProcessingState(null);
    }
  };

  const handleBatchGenerate = async (type: 'character' | 'scene') => {
    const items = type === 'character' 
      ? project.scriptData?.characters 
      : project.scriptData?.scenes;
    
    if (!items) return;

    // Filter items that need generation
    const itemsToGen = items.filter(i => !i.referenceImage);
    const isRegenerate = itemsToGen.length === 0;

    if (isRegenerate) {
       if(!window.confirm(`确定要重新生成所有${type === 'character' ? '角色' : '场景'}图吗？`)) return;
    }

    const targetItems = isRegenerate ? items : itemsToGen;

    setBatchProgress({ current: 0, total: targetItems.length });

    for (let i = 0; i < targetItems.length; i++) {
      // Rate Limit Mitigation: 3s delay
      if (i > 0) await new Promise(r => setTimeout(r, 3000));
      
      await handleGenerateAsset(type, targetItems[i].id);
      setBatchProgress({ current: i + 1, total: targetItems.length });
    }

    setBatchProgress(null);
  };

  const handleAddVariation = (charId: string) => {
      if (!project.scriptData) return;
      const newData = { ...project.scriptData };
      const char = newData.characters.find(c => c.id === charId);
      if (!char) return;

      const newVar: CharacterVariation = {
          id: `var-${Date.now()}`,
          name: newVarName || "New Outfit",
          visualPrompt: newVarPrompt || char.visualPrompt || "",
          referenceImage: undefined
      };

      if (!char.variations) char.variations = [];
      char.variations.push(newVar);
      
      updateProject({ scriptData: newData });
      setNewVarName("");
      setNewVarPrompt("");
  };

  const handleGenerateVariation = async (charId: string, varId: string) => {
      const char = project.scriptData?.characters.find(c => c.id === charId);
      const variation = char?.variations?.find(v => v.id === varId);
      if (!char || !variation) return;

      setProcessingState({ id: varId, type: 'character' });
      try {
          // IMPORTANT: Use Base Look as reference to maintain facial consistency
          const refImages = char.referenceImage ? [char.referenceImage] : [];
          // Enhance prompt to emphasize character consistency
          const enhancedPrompt = `Character: ${char.name}. ${variation.visualPrompt}. Keep facial features consistent with reference.`;

          const imageUrl = await generateImage(enhancedPrompt, refImages,false,localStyle,imageSize);

          const newData = { ...project.scriptData! };
          const c = newData.characters.find(c => c.id === charId);
          const v = c?.variations.find(v => v.id === varId);
          if (v) v.referenceImage = imageUrl;

          updateProject({ scriptData: newData });
      } catch (e) {
          console.error(e);
          alert("Variation generation failed");
      } finally {
          setProcessingState(null);
      }
  };
  
  const handleDeleteVariation = (charId: string, varId: string) => {
     if (!project.scriptData) return;
      const newData = { ...project.scriptData };
      const char = newData.characters.find(c => c.id === charId);
      if (!char) return;
      
      char.variations = char.variations.filter(v => v.id !== varId);
      updateProject({ scriptData: newData });
  };

  if (!project.scriptData) return (
      <div className="h-full flex flex-col items-center justify-center bg-[#121212] text-zinc-500">
         <p>请先完成 Phase 01 剧本分析</p>
      </div>
  );
  
  const allCharactersReady = project.scriptData.characters.every(c => c.referenceImage);
  const allScenesReady = project.scriptData.scenes.every(s => s.referenceImage);
  const selectedChar = project.scriptData.characters.find(c => c.id === selectedCharId);

  return (
    <div className="flex flex-col h-full bg-[#121212] relative overflow-hidden">
      
      {/* Global Progress Overlay */}
      {batchProgress && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md animate-in fade-in">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
          <h3 className="text-xl font-bold text-white mb-2">正在批量生成资源...</h3>
          <div className="w-64 h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
             <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}></div>
          </div>
          <p className="text-zinc-400 font-mono text-xs">进度: {batchProgress.current} / {batchProgress.total}</p>
        </div>
      )}

      {/* Wardrobe Modal */}
      {selectedChar && (
          <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
              <div className="bg-[#141414] border border-zinc-800 w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
                  {/* Modal Header */}
                  <div className="h-16 px-8 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-[#1A1A1A]">
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                              {selectedChar.referenceImage && <img src={selectedChar.referenceImage} className="w-full h-full object-cover"/>}
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-white">{selectedChar.name}</h3>
                              <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">Wardrobe & Variations</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedCharId(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                          <X className="w-5 h-5 text-zinc-500" />
                      </button>
                  </div>
                  
                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto p-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Base Look */}
                          <div>
                              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <User className="w-4 h-4" /> Base Appearance
                              </h4>
                              <div className="bg-[#0A0A0A] p-4 rounded-xl border border-zinc-800">
                                  <div className="aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden mb-4 relative">
                                      {selectedChar.referenceImage ? (
                                          <img src={selectedChar.referenceImage} className="w-full h-full object-cover" />
                                      ) : (
                                          <div className="flex items-center justify-center h-full text-zinc-700">No Image</div>
                                      )}
                                      <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[12px] text-white font-bold uppercase border border-white/10">Default</div>
                                  </div>
                                  <p className="text-xs text-zinc-500 leading-relaxed font-mono">{selectedChar.visualPrompt}</p>
                              </div>
                          </div>

                          {/* Variations */}
                          <div>
                              <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                      <Shirt className="w-4 h-4" /> Variations / Outfits
                                  </h4>
                              </div>

                              <div className="space-y-4">
                                  {/* List */}
                                  {(selectedChar.variations || []).map((variation) => (
                                      <div key={variation.id} className="flex gap-4 p-4 bg-[#0A0A0A] border border-zinc-800 rounded-xl group hover:border-zinc-700 transition-colors">
                                          <div className="w-20 h-24 bg-zinc-900 rounded-lg flex-shrink-0 overflow-hidden relative border border-zinc-800">
                                              {variation.referenceImage ? (
                                                  <img src={variation.referenceImage} className="w-full h-full object-cover" />
                                              ) : (
                                                  <div className="w-full h-full flex items-center justify-center">
                                                      <Shirt className="w-6 h-6 text-zinc-800" />
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
                                                  <h5 className="font-bold text-zinc-200 text-sm">{variation.name}</h5>
                                                  <button onClick={() => handleDeleteVariation(selectedChar.id, variation.id)} className="text-zinc-600 hover:text-red-500"><X className="w-3 h-3"/></button>
                                              </div>
                                              <p className="text-[12px] text-zinc-500 line-clamp-2 mb-3 font-mono">{variation.visualPrompt}</p>
                                              <button
                                                  onClick={() => handleGenerateVariation(selectedChar.id, variation.id)}
                                                  disabled={!!processingState || !!batchProgress}
                                                  className="text-[12px] font-bold uppercase tracking-wider text-indigo-400 hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                              >
                                                  <RefreshCw className={`w-3 h-3 ${processingState?.type === 'character' && processingState?.id === variation.id ? 'animate-spin' : ''}`} />
                                                  {processingState?.type === 'character' && processingState?.id === variation.id ? '生成中...' : variation.referenceImage ? '重新生成' : '生成造型'}
                                              </button>
                                          </div>
                                      </div>
                                  ))}

                                  {/* Add New */}
                                  <div className="p-4 border border-dashed border-zinc-800 rounded-xl bg-[#0A0A0A]/50">
                                      <div className="space-y-3">
                                          <input 
                                              type="text" 
                                              placeholder="造型名称（示例：穿校服）" 
                                              value={newVarName}
                                              onChange={e => setNewVarName(e.target.value)}
                                              className="w-full bg-[#141414] border border-zinc-800 rounded px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                                          />
                                          <textarea 
                                              placeholder="服饰 / 状态的视觉描述……"
                                              value={newVarPrompt}
                                              onChange={e => setNewVarPrompt(e.target.value)}
                                              className="w-full bg-[#141414] border border-zinc-800 rounded px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none h-16"
                                          />
                                          <button 
                                              onClick={() => handleAddVariation(selectedChar.id)}
                                              disabled={!newVarName || !newVarPrompt}
                                              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                                          >
                                              <Plus className="w-3 h-3" /> Add 造型
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Header - Consistent with Director */}
      <div className="h-16 border-b border-zinc-800 bg-[#1A1A1A] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-3">
                  <Users className="w-5 h-5 text-indigo-500" />
                  角色与场景
                  <span className="text-xs text-zinc-600 font-mono font-normal uppercase tracking-wider bg-black/30 px-2 py-1 rounded">Assets & Casting</span>
              </h2>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex gap-2">
                 <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[12px] text-zinc-400 font-mono uppercase">
                    {project.scriptData.characters.length} CHARS
                 </span>
                 <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[12px] text-zinc-400 font-mono uppercase">
                    {project.scriptData.scenes.length} SCENES
                 </span>
             </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-12">
        {/* Characters Section */}
        <section>
          <div className="flex items-end justify-between mb-6 border-b border-zinc-800 pb-4">
            <div>
               <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                 角色定妆 (Casting)
               </h3>
               <p className="text-xs text-zinc-500 mt-1 pl-3.5">为剧本中的角色生成一致的参考形象</p>
            </div>
            <button 
              onClick={() => handleBatchGenerate('character')}
              disabled={!!batchProgress}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
                  allCharactersReady
                    ? 'bg-[#141414] text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-500'
                    : 'bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/5'
              }`}
            >
              {allCharactersReady ? <RefreshCw className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
              {allCharactersReady ? '重新生成所有角色' : '一键生成所有角色'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {project.scriptData.characters.map((char) => (
              <div key={char.id} className="bg-[#141414] border border-zinc-800 rounded-xl overflow-hidden flex flex-col group hover:border-zinc-600 transition-all hover:shadow-lg">
                <div className="aspect-[3/4] bg-zinc-900 relative">
                  {char.referenceImage ? (
                    <>
                      <img src={char.referenceImage} alt={char.name} className="w-full h-full object-cover" />
                      {processingState?.type === 'character' && processingState?.id === char.id ? (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      ) : (
                        <div className={`absolute inset-0 bg-black/60 opacity-0 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm ${batchProgress || processingState ? 'pointer-events-none opacity-50' : 'group-hover:opacity-100'}`}>
                          <button
                            onClick={() => handleGenerateAsset('character', char.id)}
                            disabled={!!batchProgress || !!processingState}
                            className="px-3 py-1.5 bg-black/50 text-white text-[12px] font-bold uppercase tracking-wider rounded border border-white/20 hover:bg-white hover:text-black transition-colors backdrop-blur disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            重新生成
                          </button>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 p-1 bg-indigo-500 text-white rounded shadow-lg backdrop-blur">
                        <Check className="w-3 h-3" />
                      </div>
                    </>
                  ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 p-4 text-center">
                       <User className="w-10 h-10 mb-3 opacity-10" />
                       <button
                          onClick={() => handleGenerateAsset('character', char.id)}
                          disabled={processingState?.type === 'character' && processingState?.id === char.id || !!batchProgress || !!processingState}
                          className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded text-xs font-bold transition-all border border-zinc-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         {processingState?.type === 'character' && processingState?.id === char.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                         {processingState?.type === 'character' && processingState?.id === char.id ? '生成中...' : '生成'}
                       </button>
                     </div>
                  )}
                  {/* Manage Button */}
                  <button 
                     onClick={() => setSelectedCharId(char.id)}
                     className="absolute bottom-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-white hover:text-black transition-colors border border-white/10 backdrop-blur"
                     title="Manage Wardrobe"
                  >
                      <Shirt className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-3 border-t border-zinc-800 bg-[#111]">
                  <h3 className="font-bold text-zinc-200 truncate text-sm">{char.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                     <span className="text-[12px] text-zinc-500 font-mono uppercase bg-zinc-900 px-1.5 py-0.5 rounded">{char.gender}</span>
                     {char.variations && char.variations.length > 0 && (
                         <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
                             <Shirt className="w-2.5 h-2.5" /> +{char.variations.length}
                         </span>
                     )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Scenes Section */}
        <section>
          <div className="flex items-end justify-between mb-6 border-b border-zinc-800 pb-4">
            <div>
               <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                 场景概念 (Locations)
               </h3>
               <p className="text-xs text-zinc-500 mt-1 pl-3.5">为剧本场景生成环境参考图</p>
            </div>
            <button 
              onClick={() => handleBatchGenerate('scene')}
              disabled={!!batchProgress}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
                  allScenesReady
                    ? 'bg-[#141414] text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-500'
                    : 'bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/5'
              }`}
            >
              {allScenesReady ? <RefreshCw className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
              {allScenesReady ? '重新生成所有场景' : '一键生成所有场景'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {project.scriptData.scenes.map((scene) => (
              <div key={scene.id} className="bg-[#141414] border border-zinc-800 rounded-xl overflow-hidden flex flex-col group hover:border-zinc-600 transition-all hover:shadow-lg">
                <div className="aspect-video bg-zinc-900 relative">
                  {scene.referenceImage ? (
                    <>
                      <img src={scene.referenceImage} alt={scene.location} className="w-full h-full object-cover" />
                      {processingState?.type === 'scene' && processingState?.id === scene.id ? (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      ) : (
                        <div className={`absolute inset-0 bg-black/60 opacity-0 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm ${batchProgress || processingState ? 'pointer-events-none opacity-50' : 'group-hover:opacity-100'}`}>
                          <button
                            onClick={() => handleGenerateAsset('scene', scene.id)}
                            disabled={!!batchProgress || !!processingState}
                            className="px-3 py-1.5 bg-black/50 text-white text-[12px] font-bold uppercase tracking-wider rounded border border-white/20 hover:bg-white hover:text-black transition-colors backdrop-blur disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            重新生成
                          </button>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 p-1 bg-indigo-500 text-white rounded shadow-lg backdrop-blur">
                        <Check className="w-3 h-3" />
                      </div>
                    </>
                  ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 p-4 text-center">
                       <MapPin className="w-10 h-10 mb-3 opacity-10" />
                       <button
                          onClick={() => handleGenerateAsset('scene', scene.id)}
                          disabled={processingState?.type === 'scene' && processingState?.id === scene.id || !!batchProgress || !!processingState}
                          className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded text-xs font-bold transition-all border border-zinc-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                          {processingState?.type === 'scene' && processingState?.id === scene.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          {processingState?.type === 'scene' && processingState?.id === scene.id ? '生成中...' : '生成'}
                       </button>
                     </div>
                  )}
                </div>
                <div className="p-3 border-t border-zinc-800 bg-[#111]">
                  <div className="flex justify-between items-center mb-1">
                     <h3 className="font-bold text-zinc-200 text-sm truncate">{scene.location}</h3>
                     <span className="px-1.5 py-0.5 bg-zinc-900 text-zinc-500 text-[11px] rounded border border-zinc-800 uppercase font-mono">{scene.time}</span>
                  </div>
                  <p className="text-[12px] text-zinc-500 line-clamp-1">{scene.atmosphere}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

    </div>
  );
};

export default StageAssets;