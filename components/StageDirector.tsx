import { AlertCircle, Aperture, ChevronLeft, ChevronRight, Clock, Film, Image as ImageIcon, LayoutGrid, Loader2, MapPin, MessageSquare, Sparkles, Video, X } from 'lucide-react';
import React, { useState } from 'react';
import { ModelService } from '../services/modelService';
import { Keyframe, ProjectState, Shot } from '../types';

interface Props {
  project: ProjectState;
  updateProject: (updates: Partial<ProjectState>) => void;
}

const StageDirector: React.FC<Props> = ({ project, updateProject }) => {
  const [activeShotId, setActiveShotId] = useState<string | null>(null);
  const [processingState, setProcessingState] = useState<{id: string, type: 'kf_start'|'kf_end'|'kf_full'|'video'}|null>(null);
  const [batchProgress, setBatchProgress] = useState<{current: number, total: number, message: string} | null>(null);
  const [localStyle, setLocalStyle] = useState(project.visualStyle || '写实');
  const [imageSize, setImageSize] = useState(project.imageSize || '2560x1440');
  const [imageCount, setImageCount] = useState(project.imageCount || 0);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  

  const activeShotIndex = project.shots.findIndex(s => s.id === activeShotId);
  const activeShot = project.shots[activeShotIndex];
  
  // Safe access to keyframes (may be undefined if data is incomplete)
  const startKf = activeShot?.keyframes?.find(k => k.type === 'start');
  const endKf = activeShot?.keyframes?.find(k => k.type === 'end');
  const fullKf = activeShot?.keyframes?.find(k => k.type === 'full');

  // Check if all start frames are generated
  const allStartFramesGenerated = project.shots.length > 0 && project.shots.every(s => s.keyframes?.find(k => k.type === 'start')?.imageUrl);

  const updateShot = (shotId: string, transform: (s: Shot) => Shot) => {
    const newShots = project.shots.map(s => s.id === shotId ? transform(s) : s);
    updateProject({ shots: newShots });
  };

  const getRefImagesForShot = (shot: Shot) => {
      const referenceImages: string[] = [];
      if (project.scriptData) {
        // 1. Scene Reference (Environment / Atmosphere) - PRIORITY
        const scene = project.scriptData.scenes.find(s => String(s.id) === String(shot.sceneId));
        if (scene?.referenceImage) {
          referenceImages.push(scene.referenceImage);
        }

        // 2. Character References (Appearance)
        if (shot.characters) {
          shot.characters.forEach(charId => {
            const char = project.scriptData?.characters.find(c => String(c.name) === String(charId));
            if (!char) return;

            // Check if a specific variation is selected for this shot
            const varId = shot.characterVariations?.[char.id];
            if (varId) {
                const variation = char.variations?.find(v => v.id === varId);
                if (variation?.referenceImage) {
                    referenceImages.push(variation.referenceImage);
                    return; // Use variation image instead of base
                }
            }

            // Fallback to base image
            if (char.referenceImage) {
              referenceImages.push(char.referenceImage);
            }
          });
        }
      }
      return referenceImages;
  };
  const getRefImagesDescForShot = (shot: Shot) => {
      const referenceImages: string[] = [];
      if (project.scriptData) {
        // 1. Scene Reference (Environment / Atmosphere) - PRIORITY
        const scene = project.scriptData.scenes.find(s => String(s.id) === String(shot.sceneId));
        if (scene?.referenceImage) {
          referenceImages.push("第1张图是故事场景布置。");
        }
        let imagecount = 2;
        // 2. Character References (Appearance)
        if (shot.characters) {
          shot.characters.forEach(charId => {
            const char = project.scriptData?.characters.find(c => String(c.name) === String(charId));
            if (!char) return;

            // Check if a specific variation is selected for this shot
            const varId = shot.characterVariations?.[char.id];
            if (varId) {
                const variation = char.variations?.find(v => v.id === varId);
                if (variation?.referenceImage) {
                    referenceImages.push("第"+imagecount+"张图是角色"+char.name);
                    imagecount++;
                    return; // Use variation image instead of base
                }
            }

            // Fallback to base image
            if (char.referenceImage) {
                referenceImages.push("第"+imagecount+"张图是角色"+char.name);
            }
            imagecount++;
          });
        }
      }
      return referenceImages.join("\n");
  };

  const handleGenerateKeyframe = async (shot: Shot, type: 'start' | 'end' | 'full') => {
    // Robustly handle missing keyframe object
    const existingKf = shot.keyframes?.find(k => k.type === type);
    const kfId = existingKf?.id || `kf-${shot.id}-${type}-${Date.now()}`;
    let prompt = shot.actionSummary;
    if(type === 'full'){
        const startKey = shot.keyframes?.find(k => k.type === 'start');
        const endKey = shot.keyframes?.find(k => k.type === 'end');
        if (startKey || endKey){
            prompt = `画面开始：${startKey.visualPrompt} 画面结束：${endKey.visualPrompt}`;
        }
    }else{
        prompt = existingKf?.visualPrompt || shot.actionSummary;
    }

    const processingType = type === 'full' ? 'kf_full' : (type === 'start' ? 'kf_start' : 'kf_end');
    setProcessingState({ id: kfId, type: processingType });

    try {
      const referenceImages = getRefImagesForShot(shot);
      const referencePrompt = getRefImagesDescForShot(shot);
      if(referencePrompt){
        prompt = `${prompt} 参考图说明：${referencePrompt}`;
      }
      const url = await ModelService.generateImage(prompt, referenceImages, false, localStyle, imageSize,type === 'full'?imageCount:1);

      updateProject({ 
        shots: project.shots.map(s => {
           if (s.id !== shot.id) return s;
           
           const newKeyframes = [...(s.keyframes || [])];
           const idx = newKeyframes.findIndex(k => k.type === type);
           const newKf: Keyframe = {
               id: kfId,
               type,
               visualPrompt: prompt,
               imageUrl: url,
               status: 'completed'
           };
           
           if (idx >= 0) {
               newKeyframes[idx] = newKf;
           } else {
               newKeyframes.push(newKf);
           }
           
           return { ...s, keyframes: newKeyframes };
        }) 
      });
    } catch (e: any) {
      console.error(e);
      alert(`生成失败: ${e.message}`);
    } finally {
      setProcessingState(null);
    }
  };

  const handleGenerateVideo = async (shot: Shot) => {
    console.log("Generating Video for Shot:", shot);
    if (!shot.interval) return;
    
    let sKf = shot.keyframes?.find(k => k.type === 'start');
    let prompt = "镜头运动："+shot.cameraMovement+"； 取景："+shot.shotSize+"； 情节概述："+shot.actionSummary+" 人物："+shot.characters + (shot.dialogue?"; 对白："+shot.dialogue:"");
    console.log("Generating Video for Shot:", shot, "with Prompt:", prompt);
    if(imageCount > 1){
        sKf = shot.keyframes?.find(k => k.type === 'full');
        if (!sKf?.imageUrl) return alert("请先生成连续图！");
        prompt = "参考图片包含"+imageCount+"个连续的子图，请结合下面描述生成完整视频。"+prompt+sKf.visualPrompt;
    }else{
        if (!sKf?.imageUrl) return alert("请先生成起始帧！");
    }
    const eKf = shot.keyframes?.find(k => k.type === 'end');
    // Fix: Remove logic that auto-grabs next shot's frame.
    // Prevent morphing artifacts by defaulting to Image-to-Video unless an End Frame is explicitly generated.
    let endImageUrl = eKf?.imageUrl;
    
    setProcessingState({ id: shot.interval.id, type: 'video' });
    try {
      const videoUrl = await ModelService.generateVideo(
          prompt,
          sKf.imageUrl,
          endImageUrl, // Only pass if it exists
          shot.interval.duration,
          imageCount>1
      );

      updateShot(shot.id, (s) => ({
        ...s,
        interval: s.interval ? { ...s.interval, videoUrl, status: 'completed' } : undefined
      }));
    } catch (e: any) {
      console.error(e);
      alert(`视频生成失败: ${e.message}`);
    } finally {
      setProcessingState(null);
    }
  };

  const handleBatchGenerateImages = async () => {
      const isRegenerate = allStartFramesGenerated;
      
      let shotsToProcess = [];
      if (isRegenerate) {
          if (!window.confirm("确定要重新生成所有镜头的帧图片吗？这将覆盖现有图片。")) return;
          shotsToProcess = [...project.shots];
      } else {
          // Process shots that don't have a start image URL (handles missing keyframe objects too)
          shotsToProcess = project.shots.filter(s => !s.keyframes?.find(k => k.type === 'start')?.imageUrl);
      }
      
      if (shotsToProcess.length === 0) return;

      setBatchProgress({ 
          current: 0, 
          total: shotsToProcess.length, 
          message: isRegenerate ? "正在重新生成所有帧图片..." : "正在批量生成缺失的帧图片..." 
      });

      let currentShots = [...project.shots];

      for (let i = 0; i < shotsToProcess.length; i++) {
          // Rate Limit Mitigation: 3s delay
          if (i > 0) await new Promise(r => setTimeout(r, 3000));

          const shot = shotsToProcess[i];
          setBatchProgress({ 
              current: i + 1, 
              total: shotsToProcess.length, 
              message: `正在生成镜头 ${i+1}/${shotsToProcess.length}...` 
          });
          
          try {
            const referenceImages = getRefImagesForShot(shot);
            const referencePrompt = getRefImagesDescForShot(shot);

            if(imageCount > 1){
                const startKey = shot.keyframes?.find(k => k.type === 'start');
                const endKey = shot.keyframes?.find(k => k.type === 'end');
                let full_prompt = shot.actionSummary;
                if (startKey || endKey){
                    full_prompt = `画面开始：${startKey.visualPrompt} 画面结束：${endKey.visualPrompt}`;
                }
                const existingFf = shot.keyframes?.find(k => k.type === 'full');
                const ffId = existingFf?.id || `kf-${shot.id}-full-${Date.now()}`;
                if(referencePrompt){
                    full_prompt = `${full_prompt} 参考图说明：${referencePrompt}`;
                }
                const full_url = await ModelService.generateImage(full_prompt, referenceImages, false, localStyle, imageSize);
                currentShots = currentShots.map(s => {
                    if (s.id !== shot.id) return s;
                    const newKeyframes = [...(s.keyframes || [])];
                    const idx = newKeyframes.findIndex(k => k.type === 'full');
                    const newKf: Keyframe = {
                        id: ffId,
                        type: 'full',
                        visualPrompt: full_prompt,
                        imageUrl: full_url,
                        status: 'completed'
                    };
                    if (idx >= 0) newKeyframes[idx] = newKf;
                    else newKeyframes.push(newKf);
                    return { ...s, keyframes: newKeyframes };
                });
            }else{
                const existingKf = shot.keyframes?.find(k => k.type === 'start');
                let prompt = existingKf?.visualPrompt || shot.actionSummary;
                const kfId = existingKf?.id || `kf-${shot.id}-start-${Date.now()}`;
                if(referencePrompt){
                    prompt = `${prompt} 参考图说明：${referencePrompt}`;
                }
                const url = await ModelService.generateImage(prompt, referenceImages, false, localStyle, imageSize);
                currentShots = currentShots.map(s => {
                    if (s.id !== shot.id) return s;
                    const newKeyframes = [...(s.keyframes || [])];
                    const idx = newKeyframes.findIndex(k => k.type === 'start');
                    const newKf: Keyframe = {
                        id: kfId,
                        type: 'start',
                        visualPrompt: prompt,
                        imageUrl: url,
                        status: 'completed'
                    };
                    if (idx >= 0) newKeyframes[idx] = newKf;
                    else newKeyframes.push(newKf);
                    return { ...s, keyframes: newKeyframes };
                });

                const existingEf = shot.keyframes?.find(k => k.type === 'end');
                let end_prompt = existingEf?.visualPrompt || shot.actionSummary;
                const efId = existingEf?.id || `kf-${shot.id}-end-${Date.now()}`;
                const end_url = await ModelService.generateImage(end_prompt, referenceImages, false, localStyle, imageSize);
                if(referencePrompt){
                    end_prompt = `${end_prompt} 参考图说明：${referencePrompt}`;
                }
                currentShots = currentShots.map(s => {
                    if (s.id !== shot.id) return s;
                    const newKeyframes = [...(s.keyframes || [])];
                    const idx = newKeyframes.findIndex(k => k.type === 'end');
                    const newEf: Keyframe = {
                        id: efId,
                        type: 'end',
                        visualPrompt: prompt,
                        imageUrl: end_url,
                        status: 'completed'
                    };
                    if (idx >= 0) newKeyframes[idx] = newEf;
                    else newKeyframes.push(newEf);
                    return { ...s, keyframes: newKeyframes };
                });
            }

             updateProject({ shots: currentShots });

          } catch (e) {
             console.error(`Failed to generate for shot ${shot.id}`, e);
          }
      }

      setBatchProgress(null);
  };

  const handleVariationChange = (shotId: string, charId: string, varId: string) => {
     updateShot(shotId, (s) => ({
         ...s,
         characterVariations: {
             ...(s.characterVariations || {}),
             [charId]: varId
         }
     }));
  };

  const goToPrevShot = () => {
    if (activeShotIndex > 0) {
      setActiveShotId(project.shots[activeShotIndex - 1].id);
    }
  };

  const goToNextShot = () => {
    if (activeShotIndex < project.shots.length - 1) {
      setActiveShotId(project.shots[activeShotIndex + 1].id);
    }
  };

  const renderSceneContext = () => {
      if (!activeShot || !project.scriptData) return null;
      // String comparison for safety
      const scene = project.scriptData.scenes.find(s => String(s.id) === String(activeShot.sceneId));
      const activeCharacters = project.scriptData.characters.filter(c => activeShot.characters.includes(c.name));

      return (
          <div className="bg-[#0c0c2d] p-5 rounded-xl border border-slate-800 mb-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                 <MapPin className="w-4 h-4 text-slate-500" />
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">场景环境 (Scene Context)</h4>
              </div>
              
              <div className="flex gap-4">
                  <div className="w-28 h-20 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700 relative">
                    {scene?.referenceImage ? (
                      <img src={scene.referenceImage} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800">
                          <MapPin className="w-6 h-6 text-slate-700" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-white text-sm font-bold">{scene?.location || '未知场景'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {scene?.time}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{scene?.atmosphere}</p>
                    
                    {/* Character List with Variation Selector */}
                    <div className="flex flex-col gap-2 pt-2">
                         {activeCharacters.map(char => {
                             const hasVars = char.variations && char.variations.length > 0;
                             const selectedVarId = activeShot.characterVariations?.[char.id];
                             const selectedVar = char.variations.find(v => v.id === selectedVarId);
                             const displayImage = selectedVar?.referenceImage || char.referenceImage;
                             return (
                                 <div key={char.id} className="flex items-center justify-between bg-slate-900 rounded p-1.5 border border-slate-800">
                                     <div className="flex items-center gap-2">
                                         <div
                                           className="w-6 h-6 rounded-full bg-slate-700 overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                                           onClick={() => displayImage && setPreviewImageUrl(displayImage)}
                                         >
                                             {displayImage && <img src={displayImage} className="w-full h-full object-cover" />}
                                         </div>
                                         <span className="text-[11px] text-slate-300 font-medium">{char.name}</span>
                                     </div>

                                     {hasVars && (
                                         <select
                                            value={activeShot.characterVariations?.[char.id] || ""}
                                            onChange={(e) => handleVariationChange(activeShot.id, char.id, e.target.value)}
                                            className="bg-black text-[12px] text-slate-400 border border-slate-700 rounded px-1.5 py-0.5 max-w-[100px] outline-none focus:border-indigo-500"
                                         >
                                             <option value="">默认造型</option>
                                             {char.variations.map(v => (
                                                 <option key={v.id} value={v.id}>{v.name}</option>
                                             ))}
                                         </select>
                                     )}
                                 </div>
                             );
                         })}
                    </div>
                  </div>
              </div>
          </div>
      );
  };

  if (!project.shots.length) return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-[#0e1229]">
          <AlertCircle className="w-12 h-12 mb-4 opacity-50"/>
          <p>暂无镜头数据，请先返回阶段 1 生成分镜表。</p>
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#0e1229] relative overflow-hidden">
      
      {/* Batch Progress Overlay */}
      {batchProgress && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md animate-in fade-in">
           <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
           <h3 className="text-xl font-bold text-white mb-2">{batchProgress.message}</h3>
           <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}></div>
           </div>
           <p className="text-slate-500 mt-3 text-xs font-mono">{Math.round((batchProgress.current / batchProgress.total) * 100)}%</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="h-16 border-b border-slate-800 bg-[#0e1230] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-3">
                  <LayoutGrid className="w-5 h-5 text-indigo-500" />
                  导演工作台
                  <span className="text-xs text-slate-600 font-mono font-normal uppercase tracking-wider bg-black/30 px-2 py-1 rounded">Director Workbench</span>
              </h2>
          </div>

          <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 mr-4 font-mono">
                  {project.shots.filter(s => s.interval?.videoUrl).length} / {project.shots.length} 完成
              </span>
              <button
                  onClick={handleBatchGenerateImages}
                  disabled={!!batchProgress}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
                      allStartFramesGenerated
                        ? 'bg-[#0c0c2d] text-slate-400 border border-slate-700 hover:text-white hover:border-slate-500'
                        : 'bg-white text-black hover:bg-slate-200 shadow-lg shadow-white/5'
                  }`}
              >
                  <Sparkles className="w-3 h-3" />
                  {allStartFramesGenerated ? '重新生成所有帧图片' : '批量生成帧图片'}
              </button>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">

          {/* Grid View - Responsive Logic */}
          <div className={`flex-1 overflow-y-auto p-6 transition-all duration-500 ease-in-out ${activeShotId ? 'border-r border-slate-800' : ''}`}>
              <div className={`grid gap-4 ${activeShotId ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
                  {project.shots.map((shot, idx) => {
                      const sKf = shot.keyframes?.find(k => k.type === 'start');
                      const fKf = shot.keyframes?.find(k => k.type === 'full');
                      const hasImage = !!sKf?.imageUrl || !!fKf?.imageUrl;
                      const hasVideo = !!shot.interval?.videoUrl;
                      const isActive = activeShotId === shot.id;

                      return (
                          <div 
                              key={shot.id}
                              onClick={() => setActiveShotId(shot.id)}
                              className={`
                                  group relative flex flex-col bg-[#0e1230] border rounded-xl overflow-hidden cursor-pointer transition-all duration-200
                                  ${isActive ? 'border-indigo-500 ring-1 ring-indigo-500/50 shadow-xl scale-[0.98]' : 'border-slate-800 hover:border-slate-600 hover:shadow-lg'}
                              `}
                          >
                              {/* Header */}
                              <div className="px-3 py-2 bg-[#060624] border-b border-slate-800 flex justify-between items-center">
                                  <span className={`font-mono text-[12px] font-bold ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}>镜头 {String(idx + 1).padStart(2, '0')}</span>
                                  <span className="text-[11px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded uppercase">{shot.cameraMovement}</span>
                              </div>

                              {/* Thumbnail */}
                              <div className="aspect-video bg-slate-900 relative overflow-hidden">
                                  {hasVideo ? (
                                      <video
                                        src={shot.interval?.videoUrl}
                                        className="w-full h-full object-cover"
                                        loop controls
                                        onMouseEnter={(e) => e.currentTarget.play()}
                                        onMouseLeave={(e) => e.currentTarget.pause()}
                                      />
                                  ) : hasImage ? (
                                      <img src={sKf!.imageUrl || fKf!.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                  ) : (
                                      <div className="absolute inset-0 flex items-center justify-center text-slate-800">
                                          <ImageIcon className="w-8 h-8 opacity-20" />
                                      </div>
                                  )}

                                  {/* Badges */}
                                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                      {hasVideo && <div className="p-1 bg-green-500 text-white rounded shadow-lg backdrop-blur"><Video className="w-3 h-3" /></div>}
                                  </div>

                                  {!activeShotId && !hasImage && !hasVideo && (
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <span className="text-[12px] text-white font-bold uppercase tracking-wider bg-slate-900/90 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur">点击生成</span>
                                      </div>
                                  )}
                              </div>

                              {/* Footer */}
                              <div className="p-3">
                                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                      {shot.actionSummary}
                                  </p>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>

          {/* Right Workbench - Optimized Interaction */}
          {activeShotId && activeShot && (
              <div className="w-[480px] bg-[#0f1225] flex flex-col h-full shadow-2xl animate-in slide-in-from-right-10 duration-300 relative z-20">
                  
                  {/* Workbench Header */}
                  <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#0c0c2d] shrink-0">
                       <div className="flex items-center gap-3">
                           <span className="w-8 h-8 bg-indigo-900/30 text-indigo-400 rounded-lg flex items-center justify-center font-bold font-mono text-sm border border-indigo-500/20">
                              {String(activeShotIndex + 1).padStart(2, '0')}
                           </span>
                           <div>
                               <h3 className="text-white font-bold text-sm">镜头详情</h3>
                               <p className="text-[12px] text-slate-500 uppercase tracking-widest">{activeShot.cameraMovement}</p>
                           </div>
                       </div>
                       
                       <div className="flex items-center gap-1">
                           <button onClick={goToPrevShot} disabled={activeShotIndex === 0} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-20 transition-colors">
                               <ChevronLeft className="w-4 h-4" />
                           </button>
                           <button onClick={goToNextShot} disabled={activeShotIndex === project.shots.length - 1} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-20 transition-colors">
                               <ChevronRight className="w-4 h-4" />
                           </button>
                           <div className="w-px h-4 bg-slate-700 mx-2"></div>
                           <button onClick={() => setActiveShotId(null)} className="p-2 hover:bg-red-900/20 rounded text-slate-400 hover:text-red-400 transition-colors">
                               <X className="w-4 h-4" />
                           </button>
                       </div>
                  </div>

                  {/* Workbench Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-8">
                       
                       {/* Section 1: Context */}
                       {renderSceneContext()}

                       {/* Section 2: Narrative */}
                       <div className="space-y-4">
                           <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                               <Film className="w-4 h-4 text-slate-500" />
                               <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">叙事动作 (Action & Dialogue)</h4>
                           </div>
                           
                           <div className="space-y-3">
                               <div className="bg-[#0c0c2d] p-4 rounded-lg border border-slate-800">
                                   <p className="text-slate-200 text-sm leading-relaxed">{activeShot.actionSummary}</p>
                               </div>
                               
                               {activeShot.dialogue && (
                                  <div className="bg-[#0c0c2d] p-4 rounded-lg border border-slate-800 flex gap-3">
                                      <MessageSquare className="w-4 h-4 text-slate-600 mt-0.5" />
                                      <div>
                                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">对白</p>
                                          <p className="text-indigo-200 font-serif italic text-sm">"{activeShot.dialogue}"</p>
                                      </div>
                                  </div>
                               )}
                           </div>
                       </div>

                       {/* Section 3: Visual Production */}
                       <div className="space-y-4">
                           <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                               <Aperture className="w-4 h-4 text-slate-500" />
                               <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">视觉制作 (Visual Production)</h4>
                           </div>

                           {imageCount > 1 ? (
                               <div className="space-y-2">
                                   <div className="flex justify-between items-center">
                                       <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">宫格图 (Grid)</span>
                                       <button
                                           onClick={() => handleGenerateKeyframe(activeShot, 'full')}
                                           disabled={!!processingState || !!batchProgress}
                                           className="text-[12px] text-indigo-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                       >
                                           {processingState?.type === 'kf_full' && (processingState?.id === fullKf?.id || (!fullKf && processingState?.type === 'kf_full')) ? '生成中...' : fullKf?.imageUrl ? '重新生成' : '生成'}
                                       </button>
                                   </div>
                                   <div className="aspect-video bg-black rounded-lg border border-slate-800 overflow-hidden relative group">
                                       {fullKf?.imageUrl ? (
                                           <img
                                             src={fullKf.imageUrl}
                                             className={`w-full h-full object-contain ${!processingState || processingState?.type !== 'kf_full' || processingState?.id !== fullKf.id ? 'cursor-pointer' : ''}`}
                                             onClick={() => (!processingState || processingState?.type !== 'kf_full' || processingState?.id !== fullKf.id) && setPreviewImageUrl(fullKf.imageUrl!)}
                                           />
                                       ) : (
                                           <div className="absolute inset-0 flex items-center justify-center">
                                               <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                                           </div>
                                       )}
                                       {/* Loading State matching ID */}
                                       {((fullKf && processingState?.id === fullKf.id) || (processingState?.type === 'kf_full' && !fullKf)) && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                            </div>
                                       )}
                                   </div>
                               </div>
                           ) : (
                               <div className="grid grid-cols-2 gap-4">
                                   {/* Start Frame */}
                                   <div className="space-y-2">
                                       <div className="flex justify-between items-center">
                                           <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">起始帧 (Start)</span>
                                           <button
                                               onClick={() => handleGenerateKeyframe(activeShot, 'start')}
                                               disabled={!!processingState || !!batchProgress}
                                               className="text-[12px] text-indigo-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                           >
                                               {processingState?.type === 'kf_start' && (processingState?.id === startKf?.id || (!startKf && processingState?.type === 'kf_start')) ? '生成中...' : startKf?.imageUrl ? '重新生成' : '生成'}
                                           </button>
                                       </div>
                                       <div className="aspect-video bg-black rounded-lg border border-slate-800 overflow-hidden relative group">
                                           {startKf?.imageUrl ? (
                                               <img
                                                 src={startKf.imageUrl}
                                                 className={`w-full h-full object-contain ${!processingState || processingState?.type !== 'kf_start' || processingState?.id !== startKf.id ? 'cursor-pointer' : ''}`}
                                                 onClick={() => (!processingState || processingState?.type !== 'kf_start' || processingState?.id !== startKf.id) && setPreviewImageUrl(startKf.imageUrl!)}
                                               />
                                           ) : (
                                               <div className="absolute inset-0 flex items-center justify-center">
                                                   <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                                               </div>
                                           )}
                                           {/* Loading State matching ID */}
                                           {((startKf && processingState?.id === startKf.id) || (processingState?.type === 'kf_start' && !startKf)) && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                                </div>
                                           )}
                                       </div>
                                   </div>

                                   {/* End Frame */}
                                   <div className="space-y-2">
                                       <div className="flex justify-between items-center">
                                           <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">结束帧 (End)</span>
                                           <button
                                               onClick={() => handleGenerateKeyframe(activeShot, 'end')}
                                               disabled={!!processingState || !!batchProgress}
                                               className="text-[12px] text-indigo-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                           >
                                               {processingState?.type === 'kf_end' && (processingState?.id === endKf?.id || (!endKf && processingState?.type === 'kf_end')) ? '生成中...' : endKf?.imageUrl ? '重新生成' : '生成'}
                                           </button>
                                       </div>
                                       <div className="aspect-video bg-black rounded-lg border border-slate-800 overflow-hidden relative group">
                                           {endKf?.imageUrl ? (
                                               <img
                                                 src={endKf.imageUrl}
                                                 className={`w-full h-full object-contain ${!processingState || processingState?.type !== 'kf_end' || processingState?.id !== endKf.id ? 'cursor-pointer' : ''}`}
                                                 onClick={() => (!processingState || processingState?.type !== 'kf_end' || processingState?.id !== endKf.id) && setPreviewImageUrl(endKf.imageUrl!)}
                                               />
                                           ) : (
                                               <div className="absolute inset-0 flex items-center justify-center">
                                                   <span className="text-[11px] text-slate-700 uppercase">Optional</span>
                                               </div>
                                           )}
                                           {/* Loading State matching ID */}
                                           {((endKf && processingState?.id === endKf.id) || (processingState?.type === 'kf_end' && !endKf)) && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                                </div>
                                           )}
                                       </div>
                                   </div>
                               </div>
                           )}

                           </div>

                       {/* Section 4: Video Generation */}
                       <div className="bg-[#0c0c2d] rounded-xl p-5 border border-slate-800 space-y-4">
                           <div className="flex items-center justify-between">
                               <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                  <Video className="w-3 h-3 text-indigo-500" />
                                  视频生成 (Veo)
                               </h4>
                               {activeShot.interval?.status === 'completed' && <span className="text-[12px] text-green-500 font-mono flex items-center gap-1">● READY</span>}
                           </div>
                           
                           {activeShot.interval?.videoUrl ? (
                               <div className="w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 relative shadow-lg">
                                   <video src={activeShot.interval.videoUrl} controls className="w-full h-full" />
                               </div>
                           ) : (
                               <div className="w-full aspect-video bg-slate-900/50 rounded-lg border border-dashed border-slate-800 flex items-center justify-center">
                                   <span className="text-xs text-slate-600 font-mono">PREVIEW AREA</span>
                               </div>
                           )}

                           <button
                             onClick={() => handleGenerateVideo(activeShot)}
                             disabled={(!startKf?.imageUrl && !endKf?.imageUrl && !fullKf?.imageUrl) || !!processingState || !!batchProgress}
                             className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                               activeShot.interval?.videoUrl
                                 ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                 : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
                             } ${((!startKf?.imageUrl && !endKf?.imageUrl && !fullKf?.imageUrl) || !!processingState || !!batchProgress) ? 'opacity-50 cursor-not-allowed' : ''}`}
                           >
                             {processingState?.type === 'video' ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  生成视频中...
                                </>
                             ) : (
                                <>
                                  {activeShot.interval?.videoUrl ? '重新生成视频' : '开始生成视频'}
                                </>
                             )}
                           </button>
                           
                           {!endKf?.imageUrl && !startKf?.imageUrl && imageCount > 1 && (
                               <div className="text-[11px] text-slate-500 text-center font-mono">
                                  * 将使用连续图生成模式
                               </div>
                           )}
                       </div>
                  </div>
              </div>
          )}

          {/* Fullscreen Image Preview Modal */}
          {previewImageUrl && (
            <div
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center"
              onClick={() => setPreviewImageUrl(null)}
            >
              <img
                src={previewImageUrl}
                alt="Full screen preview"
                className="max-w-[95vw] max-h-[95vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="absolute top-6 right-6 p-3 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default StageDirector;