import { AlertCircle, Aperture, ChevronLeft, ChevronRight, Clock, Edit, Film, Image as ImageIcon, LayoutGrid, Loader2, MapPin, MessageSquare, RefreshCw, Shirt, Sparkles, Trash, Users, Video, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ModelService } from '../services/modelService';
import { Keyframe, ProjectState, Scene, Shot } from '../types';
import SceneEditModal from './SceneEditModal';
import ShotEditModal from './ShotEditModal';

interface Props {
  project: ProjectState;
  updateProject: (updates: Partial<ProjectState>) => void;
}

const StageDirector: React.FC<Props> = ({ project, updateProject }) => {
  const [activeShotId, setActiveShotId] = useState<string | null>(null);
  const [editingShotId, setEditingShotId] = useState<string | null>(null);
  const [editingSceneInMain, setEditingSceneInMain] = useState<Scene | null>(null);
  const [processingState, setProcessingState] = useState<{id: string, type: 'kf_start'|'kf_end'|'kf_full'|'video'|'character'}|null>(null);
  const [batchProgress, setBatchProgress] = useState<{current: number, total: number, message: string} | null>(null);
  const [localStyle, setLocalStyle] = useState(project.visualStyle || '写实');
  const [imageSize, setImageSize] = useState(project.imageSize || '2560x1440');
  const [imageCount, setImageCount] = useState(project.imageCount || 0);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Sync local state with project settings
  useEffect(() => {
    setLocalStyle(project.visualStyle || '写实');
    setImageSize(project.imageSize || '2560x1440');
    setImageCount(project.imageCount || 0);
  }, [project.visualStyle, project.imageSize, project.imageCount]);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [newVarName, setNewVarName] = useState("");
  const [newVarPrompt, setNewVarPrompt] = useState("");
  const [oneClickProcessing, setOneClickProcessing] = useState<{shotId: string, step: 'images'|'video'}|null>(null);
  const [batchVideoProgress, setBatchVideoProgress] = useState<{current: number, total: number, currentShotName: string} | null>(null);
  

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

  const updateKeyframePrompt = (shotId: string, type: 'start' | 'end' | 'full', prompt: string) => {
    updateShot(shotId, (s) => {
      const newKeyframes = [...(s.keyframes || [])];
      const idx = newKeyframes.findIndex(k => k.type === type);
      if (idx >= 0) {
        newKeyframes[idx] = { ...newKeyframes[idx], visualPrompt: prompt };
      }
      return { ...s, keyframes: newKeyframes };
    });
  };

  const deleteKeyframeImage = (shotId: string, type: 'start' | 'end' | 'full') => {
    updateShot(shotId, (s) => {
      const newKeyframes = [...(s.keyframes || [])];
      const idx = newKeyframes.findIndex(k => k.type === type);
      if (idx >= 0) {
        newKeyframes[idx] = { ...newKeyframes[idx], imageUrl: undefined };
      }
      return { ...s, keyframes: newKeyframes };
    });
  };

  const startEditShot = (shot: Shot) => {
    setEditingShotId(shot.id);
  };

  const saveShot = (updatedShot: Partial<Shot>) => {
    if (!editingShotId) return;
    const newShots = project.shots.map(s =>
      s.id === editingShotId ? { ...s, ...updatedShot } : s
    );
    updateProject({ shots: newShots });
    setEditingShotId(null);
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
      const url = await ModelService.generateImage(prompt + (referencePrompt?"参考图说明："+referencePrompt:""), referenceImages, false, localStyle, imageSize,type === 'full'?imageCount:1);
      existingKf.imageUrl = url;
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
    //console.log("Generating Video for Shot:", shot);
    if (!shot.interval) return;
    
    let sKf = shot.keyframes?.find(k => k.type === 'start');
    let prompt = "镜头运动："+shot.cameraMovement+"； 取景："+shot.shotSize+"； 情节概述："+shot.actionSummary+" 人物："+shot.characters + (shot.dialogue?"; 对白："+shot.dialogue:"");
    //console.log("Generating Video for Shot:", shot, "with Prompt:", prompt);
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
                const full_url = await ModelService.generateImage(full_prompt + (referencePrompt?"参考图说明："+referencePrompt:""), referenceImages, false, localStyle, imageSize);
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
                const url = await ModelService.generateImage(prompt + (referencePrompt?"参考图说明："+referencePrompt:""), referenceImages, false, localStyle, imageSize);
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
                const end_url = await ModelService.generateImage(end_prompt + (referencePrompt?"参考图说明："+referencePrompt:""), referenceImages, false, localStyle, imageSize);
                currentShots = currentShots.map(s => {
                    if (s.id !== shot.id) return s;
                    const newKeyframes = [...(s.keyframes || [])];
                    const idx = newKeyframes.findIndex(k => k.type === 'end');
                    const newEf: Keyframe = {
                        id: efId,
                        type: 'end',
                        visualPrompt: end_prompt,
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

  const handleAddVariation = (charId: string) => {
      if (!project.scriptData) return;
      const newData = { ...project.scriptData };
      const char = newData.characters.find(c => String(c.id) === String(charId));
      if (!char) return;

      const newVar = {
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
      const char = project.scriptData?.characters.find(c => String(c.id) === String(charId));
      const variation = char?.variations?.find(v => v.id === varId);
      if (!char || !variation) return;

      setProcessingState({ id: varId, type: 'character' });
      try {
          // Use Base Look as reference to maintain facial consistency
          const refImages = char.referenceImage ? [char.referenceImage] : [];
          // Enhance prompt to emphasize character consistency
          const enhancedPrompt = `Character: ${char.name}. ${variation.visualPrompt}. Keep facial features consistent with reference.`;

          const imageUrl = await ModelService.generateImage(enhancedPrompt, refImages, true, localStyle, imageSize);

          const newData = { ...project.scriptData! };
          const c = newData.characters.find(c => String(c.id) === String(charId));
          const v = c?.variations?.find(v => v.id === varId);
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
      const char = newData.characters.find(c => String(c.id) === String(charId));
      if (!char) return;

      char.variations = char.variations.filter(v => v.id !== varId);
      updateProject({ scriptData: newData });
  };

  const handleOneClickProduction = async (shot: Shot) => {
      if (!!processingState || !!batchProgress) return;

      setOneClickProcessing({ shotId: shot.id, step: 'images' });

      try {
          // Step 1: Generate images
          if (imageCount > 1) {
              // Generate full grid
              //if (!fullKf?.imageUrl) {
                  await handleGenerateKeyframe(shot, 'full');
              //}
          } else {
              // Generate start and end frames
              //if (!startKf?.imageUrl) {
                await handleGenerateKeyframe(shot, 'start');
              //}
              // Wait a moment for the first update to be applied
                await new Promise(r => setTimeout(r, 1000));

              //if (!endKf?.imageUrl) {
                await handleGenerateKeyframe(shot, 'end');
              //}
          }

          // Step 2: Generate video
          setOneClickProcessing({ shotId: shot.id, step: 'video' });

          // Wait a moment for images to be ready
          await new Promise(r => setTimeout(r, 1000));

          // Regenerate the shot to get updated keyframes
          const finalShot = project.shots.find(s => s.id === shot.id);
          if (!finalShot) return;

          const updatedStartKf = finalShot?.keyframes?.find(k => k.type === 'start');
          const updatedFullKf = finalShot?.keyframes?.find(k => k.type === 'full');

          // Check if images are ready
          if (imageCount > 1 && !updatedFullKf?.imageUrl) {
              throw new Error("宫格图生成失败");
          }
          if (imageCount <= 1 && !updatedStartKf?.imageUrl) {
              throw new Error("起始帧生成失败");
          }

          await handleGenerateVideo(finalShot);
      } catch (e: any) {
          console.error(e);
          alert(`一键制作失败: ${e.message}`);
      } finally {
          setOneClickProcessing(null);
      }
  };

  const handleBatchGenerateVideos = async () => {
      if (!project.shots.length) return;

      const isRegenerate = project.shots.every(s => s.interval?.videoUrl);
      if (isRegenerate) {
          if (!window.confirm("确定要重新生成所有视频吗？这将覆盖现有视频。")) return;
      }

      const targetShots = isRegenerate ? project.shots : project.shots.filter(s => !s.interval?.videoUrl);
      if (targetShots.length === 0) return;

      setBatchVideoProgress({ current: 0, total: targetShots.length, currentShotName: '' });

      for (let i = 0; i < targetShots.length; i++) {
          const shot = targetShots[i];
          setBatchVideoProgress({
              current: i + 1,
              total: targetShots.length,
              currentShotName: `镜头 ${project.shots.findIndex(s => s.id === shot.id) + 1}`
          });

          try {
              // Step 1: Generate images if needed
              const currentStartKf = shot.keyframes?.find(k => k.type === 'start');
              const currentEndKf = shot.keyframes?.find(k => k.type === 'end');
              const currentFullKf = shot.keyframes?.find(k => k.type === 'full');

              if (imageCount > 1 && !currentFullKf?.imageUrl) {
                  await handleGenerateKeyframe(shot, 'full');
              } else if (imageCount <= 1 && (!currentStartKf?.imageUrl || !currentEndKf?.imageUrl)) {
                  if (!currentStartKf?.imageUrl) {
                      await handleGenerateKeyframe(shot, 'start');
                  }
                  if (!currentEndKf?.imageUrl) {
                      await handleGenerateKeyframe(shot, 'end');
                  }
              }

              // Step 2: Generate video
              // Wait a moment for images to be ready
              await new Promise(r => setTimeout(r, 1000));

              // Get updated shot
              const updatedShot = project.shots.find(s => s.id === shot.id);
              if (!updatedShot) continue;

              await handleGenerateVideo(updatedShot);
          } catch (e) {
              console.error(`Failed to generate video for shot ${shot.id}`, e);
          }

          // Small delay between shots
          if (i < targetShots.length - 1) {
              await new Promise(r => setTimeout(r, 2000));
          }
      }

      setBatchVideoProgress(null);
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
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">场景环境 (Scene Context)</h4>
                 </div>
                 <button
                    onClick={() => setEditingSceneInMain(scene!)}
                    className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-900/80 border border-slate-800 hover:border-slate-600 rounded transition-all flex items-center justify-center gap-1.5"
                    title="编辑场景"
                 >
                    <Edit className="w-3 h-3" />
                    <span>编辑场景</span>
                 </button>
              </div>
              
              <div className="flex gap-4">
                  <div className="w-28 h-20 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700 relative">
                    {scene?.referenceImage ? (
                        <img src={scene.referenceImage} className="w-full h-full object-cover cursor-pointer hover:ring-2 hover:ring-indigo-500" onClick={() => setPreviewImageUrl(scene.referenceImage)}/>
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

                                     <div className="flex items-center gap-2">
                                         {hasVars && (
                                             <select
                                                value={activeShot.characterVariations?.[String(char.id)] || ""}
                                                onChange={(e) => handleVariationChange(activeShot.id, String(char.id), e.target.value)}
                                                className="bg-black text-[12px] text-slate-400 border border-slate-700 rounded px-1.5 py-0.5 max-w-[100px] outline-none focus:border-indigo-500"
                                             >
                                                 <option value="">默认造型</option>
                                                 {char.variations.map(v => (
                                                     <option key={v.id} value={v.id}>{v.name}</option>
                                                 ))}
                                             </select>
                                         )}
                                         <button
                                             onClick={() => setSelectedCharId(char.id)}
                                             className="p-1.5 bg-black/50 text-slate-400 hover:text-white rounded-full hover:bg-white/20 transition-all border border-white/10"
                                             title="管理造型"
                                         >
                                        <Shirt className="w-3 h-3" />
                                         </button>
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

      {/* Batch Video Progress Overlay */}
      {batchVideoProgress && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md animate-in fade-in">
           <Video className="w-12 h-12 text-indigo-500 mb-6 animate-pulse" />
           <h3 className="text-xl font-bold text-white mb-2">正在批量生成视频...</h3>
           <p className="text-slate-400 mb-4 text-sm">{batchVideoProgress.currentShotName}</p>
           <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${(batchVideoProgress.current / batchVideoProgress.total) * 100}%` }}></div>
           </div>
           <p className="text-slate-500 mt-3 text-xs font-mono">{batchVideoProgress.current} / {batchVideoProgress.total} ({Math.round((batchVideoProgress.current / batchVideoProgress.total) * 100)}%)</p>
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
                  disabled={!!batchProgress || !!batchVideoProgress}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
                      allStartFramesGenerated
                        ? 'bg-[#0c0c2d] text-slate-400 border border-slate-700 hover:text-white hover:border-slate-500'
                        : 'bg-white text-black hover:bg-slate-200 shadow-lg shadow-white/5'
                  }`}
              >
                  <Sparkles className="w-3 h-3" />
                  {allStartFramesGenerated ? '重新生成所有帧图片' : '批量生成帧图片'}
              </button>
              <button
                  onClick={handleBatchGenerateVideos}
                  disabled={!!batchProgress || !!batchVideoProgress}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                  <Video className="w-3 h-3" />
                  {project.shots.every(s => s.interval?.videoUrl) ? '重新生成所有视频' : '批量生成视频'}
              </button>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">

          {/* Grid View - Responsive Logic */}
          <div className={`flex-1 overflow-y-auto p-6 transition-all duration-500 ease-in-out ${activeShotId ? 'border-r border-slate-800' : ''}`}>
              <div className={`grid gap-4 ${activeShotId ? 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
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
                                  ${isActive ? 'border-indigo-500 ring-1 ring-indigo-500/50 shadow-xl scale-[1.02]' : 'border-slate-800 hover:border-slate-600 hover:shadow-lg'}
                              `}
                          >
                              {/* Header */}
                              <div className="px-3 py-2 bg-[#060624] border-b border-slate-800 flex justify-between items-center">
                                  <span className={`font-mono text-[12px] font-bold ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}>镜头 {String(idx + 1).padStart(2, '0')}</span>
                                  <div className="flex items-center gap-2">
                                      <span className="text-[11px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded uppercase">{shot.cameraMovement}</span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); startEditShot(shot); }}
                                        className="p-1.5 hover:bg-slate-700 text-slate-500 hover:text-white rounded transition-colors"
                                        title="编辑镜头"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </button>
                                  </div>
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
              <div className="w-[640px] bg-[#0f1225] flex flex-col h-full shadow-2xl animate-in slide-in-from-right-10 duration-300 relative z-20">
                  
                  {/* Workbench Header */}
                  <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#0c0c2d] shrink-0">
                       <div className="flex items-center gap-3">
                           <span className="w-8 h-8 bg-indigo-900/30 text-indigo-400 rounded-lg flex items-center justify-center font-bold font-mono text-sm border border-indigo-500/20">
                              {String(activeShotIndex + 1).padStart(2, '0')}
                           </span>
                           <div>
                               <span className="text-[16px] text-white font-bold text-sm">镜头详情</span>
                               <button
                                        onClick={(e) => { e.stopPropagation(); startEditShot(activeShot); }}
                                        className="ml-2 p-1.5 hover:bg-slate-700 text-slate-500 hover:text-white rounded transition-colors"
                                        title="编辑镜头"
                                      >
                                <Edit className="w-3 h-3" />
                                </button>
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
                           <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                               <div className="flex items-center gap-2">
                                   <Aperture className="w-4 h-4 text-slate-500" />
                                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">视觉制作 (Visual Production)</h4>
                               </div>
                               <button
                                   onClick={() => handleOneClickProduction(activeShot)}
                                   disabled={!!processingState || !!batchProgress || oneClickProcessing?.shotId === activeShot.id}
                                   className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                               >
                                   {oneClickProcessing?.shotId === activeShot.id ? (
                                       <>
                                           <Loader2 className="w-3 h-3 animate-spin" />
                                           {oneClickProcessing.step === 'images' ? '生成图中...' : '制作视频中...'}
                                       </>
                                   ) : (
                                       <>
                                           <Sparkles className="w-3 h-3" />
                                           {imageCount > 1 ? (!!fullKf?.imageUrl ? '一键重新制作' : '一键制作') : ((!!startKf?.imageUrl && !!endKf?.imageUrl) ? '一键重新制作' : '一键制作')}
                                       </>
                                   )}
                               </button>
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
                                   {/* Visual Prompt Editor */}
                                   {fullKf && (
                                       <textarea
                                           value={fullKf.visualPrompt || ''}
                                           onChange={(e) => updateKeyframePrompt(activeShot.id, 'full', e.target.value)}
                                           className="w-full bg-[#0c0c2d] border border-slate-800 text-slate-300 text-xs rounded p-2 focus:border-indigo-500 focus:outline-none resize-none h-20 transition-colors"
                                           placeholder="输入宫格图画面描述..."
                                           rows={3}
                                       />
                                   )}
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
                                       {/* Visual Prompt Editor */}
                                       {startKf && (
                                           <textarea
                                               value={startKf.visualPrompt || ''}
                                               onChange={(e) => updateKeyframePrompt(activeShot.id, 'start', e.target.value)}
                                               className="w-full bg-[#0c0c2d] border border-slate-800 text-slate-300 text-xs rounded p-2 focus:border-indigo-500 focus:outline-none resize-none h-20 transition-colors"
                                               placeholder="输入起始帧画面描述..."
                                               rows={3}
                                           />
                                       )}
                                   </div>

                                   {/* End Frame */}
                                   <div className="space-y-2">
                                       <div className="flex justify-between items-center">
                                           <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">结束帧 (End)</span>
                                           <div className="flex items-center gap-2">
                                               {endKf?.imageUrl && (
                                                   <button
                                                       onClick={() => deleteKeyframeImage(activeShot.id, 'end')}
                                                       disabled={!!processingState || !!batchProgress}
                                                       className="text-[12px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                       title="删除尾帧图片"
                                                   >
                                                       <Trash className="w-3 h-3" />
                                                   </button>
                                               )}
                                               <button
                                                   onClick={() => handleGenerateKeyframe(activeShot, 'end')}
                                                   disabled={!!processingState || !!batchProgress}
                                                   className="text-[12px] text-indigo-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                               >
                                                   {processingState?.type === 'kf_end' && (processingState?.id === endKf?.id || (!endKf && processingState?.type === 'kf_end')) ? '生成中...' : endKf?.imageUrl ? '重新生成' : '生成'}
                                               </button>
                                           </div>
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
                                       {/* Visual Prompt Editor */}
                                       {endKf && (
                                           <textarea
                                               value={endKf.visualPrompt || ''}
                                               onChange={(e) => updateKeyframePrompt(activeShot.id, 'end', e.target.value)}
                                               className="w-full bg-[#0c0c2d] border border-slate-800 text-slate-300 text-xs rounded p-2 focus:border-indigo-500 focus:outline-none resize-none h-20 transition-colors"
                                               placeholder="输入结束帧画面描述..."
                                               rows={3}
                                           />
                                       )}
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

          {/* Edit Shot Modal */}
          {editingShotId && (
            <ShotEditModal
              shot={project.shots.find(s => s.id === editingShotId)!}
              characters={project.scriptData?.characters || []}
              onSave={saveShot}
              onClose={() => setEditingShotId(null)}
            />
          )}

          {/* Edit Scene Modal */}
          {editingSceneInMain && (
            <SceneEditModal
              scene={editingSceneInMain}
              storyParagraphs={project.scriptData?.storyParagraphs || []}
              onSave={saveSceneFromModal}
              onClose={() => setEditingSceneInMain(null)}
            />
          )}

          {/* Wardrobe Modal */}
          {selectedCharId && project.scriptData && (
              <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
                  <div className="bg-[#0c0c2d] border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
                      {/* Modal Header */}
                      <div className="h-16 px-8 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0e1230]">
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                  {project.scriptData.characters.find(c => String(c.id) === String(selectedCharId))?.referenceImage && (
                                      <img src={project.scriptData.characters.find(c => String(c.id) === String(selectedCharId))?.referenceImage} className="w-full h-full object-cover"/>
                                  )}
                              </div>
                              <div>
                                  <h3 className="text-lg font-bold text-white">{project.scriptData.characters.find(c => String(c.id) === String(selectedCharId))?.name}</h3>
                                  <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">服装造型（Wardrobe & Variations）</p>
                              </div>
                          </div>
                          <button onClick={() => setSelectedCharId(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                              <X className="w-5 h-5 text-slate-500" />
                          </button>
                      </div>

                      {/* Modal Body */}
                      <div className="flex-1 overflow-y-auto p-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {/* Base Look */}
                              <div>
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                      <Users className="w-4 h-4" /> 基础形象
                                  </h4>
                                  {(() => {
                                      const selectedChar = project.scriptData.characters.find(c => String(c.id) === String(selectedCharId));
                                      if (!selectedChar) return null;
                                      return (
                                          <div className="bg-[#0e0e28] p-4 rounded-xl border border-slate-800">
                                              <div className="aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden mb-4 relative cursor-pointer" onClick={() => selectedChar.referenceImage && setPreviewImageUrl(selectedChar.referenceImage)}>
                                                  {selectedChar.referenceImage ? (
                                                      <img src={selectedChar.referenceImage} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                                                  ) : (
                                                      <div className="flex items-center justify-center h-full text-slate-700">无图像</div>
                                                  )}
                                                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[12px] text-white font-bold uppercase border border-white/10">默认</div>
                                                  {selectedChar.referenceImage && (
                                                      <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                                                          <span className="text-white/80 text-xs font-bold uppercase tracking-wider">点击预览</span>
                                                      </div>
                                                  )}
                                              </div>
                                              <p className="text-xs text-slate-500 leading-relaxed font-mono">{selectedChar.visualPrompt}</p>
                                          </div>
                                      );
                                  })()}
                              </div>

                              {/* Variations */}
                              <div>
                                  <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                          <Shirt className="w-4 h-4" /> 服装造型
                                      </h4>
                                  </div>

                                  {(() => {
                                      const selectedChar = project.scriptData.characters.find(c => String(c.id) === String(selectedCharId));
                                      if (!selectedChar) return null;
                                      return (
                                          <div className="space-y-4">
                                              {/* List */}
                                              {(selectedChar.variations || []).map((variation) => (
                                                  <div key={variation.id} className="flex gap-4 p-4 bg-[#0e0e28] border border-slate-800 rounded-xl group hover:border-slate-700 transition-colors">
                                                      <div className={`w-20 h-24 bg-slate-900 rounded-lg flex-shrink-0 overflow-hidden relative border border-slate-800 ${variation.referenceImage && !(processingState?.type === 'character' && processingState?.id === variation.id) ? 'cursor-pointer' : ''}`} onClick={variation.referenceImage && !(processingState?.type === 'character' && processingState?.id === variation.id) ? () => setPreviewImageUrl(variation.referenceImage) : undefined}>
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
                                                              <button onClick={() => handleDeleteVariation(selectedChar.id, variation.id)} className="text-slate-600 hover:text-red-500"><X className="w-3 h-3"/></button>
                                                          </div>
                                                          <p className="text-[12px] text-slate-500 line-clamp-2 mb-3 font-mono">{variation.visualPrompt}</p>
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
                                              <div className="p-4 border border-dashed border-slate-800 rounded-xl bg-[#0e0e28]/50">
                                                  <div className="space-y-3">
                                                      <input
                                                          type="text"
                                                          placeholder="造型名称（示例：穿校服）"
                                                          value={newVarName}
                                                          onChange={e => setNewVarName(e.target.value)}
                                                          className="w-full bg-[#0c0c2d] border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
                                                      />
                                                      <textarea
                                                          placeholder="服饰 / 状态的视觉描述……"
                                                          value={newVarPrompt}
                                                          onChange={e => setNewVarPrompt(e.target.value)}
                                                          className="w-full bg-[#0c0c2d] border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-600 resize-none h-16"
                                                      />
                                                      <button
                                                          onClick={() => handleAddVariation(selectedChar.id)}
                                                          disabled={!newVarName || !newVarPrompt}
                                                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                                                      >
                                                          <Shirt className="w-3 h-3" /> 添加造型
                                                      </button>
                                                  </div>
                                              </div>
                                          </div>
                                      );
                                  })()}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default StageDirector;