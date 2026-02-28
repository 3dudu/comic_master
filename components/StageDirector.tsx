import { AlertCircle, Aperture, ChevronLeft, ChevronRight, Clapperboard, Clock, Download, Edit, Film, Image, Image as ImageIcon, Loader2, MapPin, MessageSquare, RefreshCw, Shirt, Sparkles, Trash, Upload, Video, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { modelConfigEventBus } from '../services/modelConfigEvents';
import { ModelService } from '../services/modelService';
import { getAllModelConfigs } from '../services/storageService';
import { AIModelConfig, Keyframe, ProjectState, Scene, Shot } from '../types';
import FileUploadModal from './FileUploadModal';
import SceneEditModal from './SceneEditModal';
import ShotEditModal from './ShotEditModal';
import WardrobeModal from './WardrobeModal';
import { useDialog } from './dialog';

interface Props {
  project: ProjectState;
  updateProject: (updates: Partial<ProjectState>) => void;
  isMobile: boolean;
}

const StageDirector: React.FC<Props> = ({ project, updateProject, isMobile=false  }) => {
  const dialog = useDialog();
  const [wardProcessingState, setWardProcessingState] = useState<{id: string, type: 'character'|'scene'}|null>(null);
  const [activeShotId, setActiveShotId] = useState<string | null>(null);
  const [editingShotId, setEditingShotId] = useState<string | null>(null);
  const [editingSceneInMain, setEditingSceneInMain] = useState<Scene | null>(null);
  const [processingState, setProcessingState] = useState<{id: string, type: 'kf_start'|'kf_end'|'kf_full'|'video'|'character'}|null>(null);
  const [batchProgress, setBatchProgress] = useState<{current: number, total: number, message: string} | null>(null);
  const [localStyle, setLocalStyle] = useState(project.visualStyle || '真人写实');
  const [imageSize, setImageSize] = useState(project.imageSize || '2560x1440');
  const [imageCount, setImageCount] = useState(project.imageCount || 0);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [videoPlayingShots, setVideoPlayingShots] = useState<Set<string>>(new Set());
  const [videoReadyShots, setVideoReadyShots] = useState<Set<string>>(new Set());
  const [fileUploadModalOpen, setFileUploadModalOpen] = useState(false);
  const [uploadingKeyframe, setUploadingKeyframe] = useState<{shotId: string, type: 'start'|'end'|'full'} | null>(null);

  // Sync local state with project settings
  useEffect(() => {
    setLocalStyle(project.visualStyle || '真人写实');
    setImageSize(project.imageSize || '2560x1440');
    setImageCount(project.imageCount || 0);
  }, [project.visualStyle, project.imageSize, project.imageCount]);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [oneClickProcessing, setOneClickProcessing] = useState<{shotId: string, step: 'images'|'video'}|null>(null);
  const [batchVideoProgress, setBatchVideoProgress] = useState<{current: number, total: number, currentShotName: string} | null>(null);
  const [modelConfigs, setModelConfigs] = useState<AIModelConfig[]>([]);

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
        //console.log('模型配置已自动刷新');
      } catch (error) {
        console.error('自动刷新模型配置失败:', error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);
  

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
    project.shots = newShots;
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
        referenceImages.push("\n参考图说明：");
        if (scene?.referenceImage) {
          referenceImages.push(" - 第1张图是镜头布景、环境。");
        }
        let imagecount = 2;
        if(imageCount==0){
          imagecount = 0;
        }
        if(imageCount>1){
          imagecount = 1;
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
                    referenceImages.push(" - 第"+imagecount+"张图是角色："+char.name);
                    imagecount++;
                    return; // Use variation image instead of base
                }
            }

            // Fallback to base image
            if (char.referenceImage) {
                referenceImages.push(" - 第"+imagecount+"张图是角色："+char.name);
            }
            imagecount++;
          });
        }
      }
      return referenceImages.join("\n");
  };

  const handleGenerateKeyframe = async (shot: Shot, type: 'start' | 'end' | 'full') => {
    // Robustly handle missing keyframe object
    let existingKf = shot.keyframes?.find(k => k.type === type);
    const kfId = existingKf?.id || `kf-${shot.id}-${type}-${Date.now()}`;
    let prompt = shot.actionSummary;
    if(type === 'full'){
        const startKey = shot.keyframes?.find(k => k.type === 'start');
        const endKey = shot.keyframes?.find(k => k.type === 'end');
        if (startKey || endKey){
            prompt = `连环画开始：${startKey.visualPrompt} 连环画结束：${endKey.visualPrompt}`;
        }
    }else{
        prompt = existingKf?.visualPrompt || shot.actionSummary;
    }
    if(!existingKf){
      existingKf = {
        id: kfId,
        type,
        visualPrompt: prompt,
        status: 'pending'
      };
    }

    const processingType = type === 'full' ? 'kf_full' : (type === 'start' ? 'kf_start' : 'kf_end');
    setProcessingState({ id: kfId, type: processingType });

    try {
      const referenceImages = getRefImagesForShot(shot);
      const referencePrompt = getRefImagesDescForShot(shot);
      const url = await ModelService.generateImage(prompt + (referencePrompt?referencePrompt:""), referenceImages, type, localStyle, imageSize,type === 'full'?imageCount:1, shot.modelProviders,project.id);
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
      if(e.message?.includes("enough")){
        await dialog.alert({ title: '错误', message: '余额不足，请充值', type: 'error' });
      }else{
        await dialog.alert({ title: '错误', message: '生成失败，请重试', type: 'error' });
      }
    } finally {
      setProcessingState(null);
    }
  };

  const handleGenerateVideo = async (shot: Shot) => {
    ////console.log("Generating Video for Shot:", shot);
    if (!shot.interval) return;
    
    let prompt = "景别："+shot.shotSize+"；镜头运动："+shot.cameraMovement+""+(shot.interval.motionStrength?"；运动强度："+shot.interval.motionStrength:"")+"；\n 剧情描述："+shot.actionSummary+""+ (shot.characters?" \n 角色："+shot.characters:"") + (shot.dialogue?" \n对白："+shot.dialogue:"");
    ////console.log("Generating Video for Shot:", shot, "with Prompt:", prompt);
    let sImageiurl = null;
    let eImageiurl = null;
    if(imageCount>0){
      if(imageCount > 1){
          const sKf = shot.keyframes?.find(k => k.type === 'full');
          if(sKf){
            if(sKf.imageUrl){
              sImageiurl = sKf.imageUrl;
              prompt = prompt+"\n 参考图：包含"+imageCount+"个连续的子图，图片内容如下：";
            }
            prompt = prompt+"\n"+sKf?.visualPrompt;
          }
      }else{
          const sKf = shot.keyframes?.find(k => k.type === 'start');
          sImageiurl = sKf?.imageUrl;
          prompt = prompt+"\n 参考图1，画面开始："+sKf?.visualPrompt+"；";
          const eKf = shot.keyframes?.find(k => k.type === 'end');
          eImageiurl = eKf?.imageUrl;
          prompt = prompt+"\n 参考图2，画面结束："+eKf?.visualPrompt+"；";
      }
    }
    prompt = prompt+"\n 按照上面描述生成视频！";
    // Fix: Remove logic that auto-grabs next shot's frame.
    // Prevent morphing artifacts by defaulting to Image-to-Video unless an End Frame is explicitly generated.
    
    setProcessingState({ id: shot.interval.id, type: 'video' });
    try {
      const videoUrl = await ModelService.generateVideo(
          prompt,
          sImageiurl,
          eImageiurl, // Only pass if it exists
          shot.interval?.duration||5,
          imageCount>1,
          shot.modelProviders,
          project.id
      );

      updateShot(shot.id, (s) => ({
        ...s,
        interval: s.interval ? { ...s.interval, videoUrl, status: 'completed' } : undefined
      }));
    } catch (e: any) {
      console.error(e);
      if(e.message?.includes("enough")){
        await dialog.alert({ title: '错误', message: '余额不足，请充值', type: 'error' });
      }else{
        await dialog.alert({ title: '错误', message: '生成失败，请重试', type: 'error' });
      }
    } finally {
      setProcessingState(null);
    }
  };

  const handleDownloadVideo = async (shot: Shot) => {
    if (!shot.interval?.videoUrl) {
      await dialog.alert({
        title: '提示',
        message: '视频尚未生成或不可用',
        type: 'warning',
      });
      return;
    }

    try {
      const response = await fetch(shot.interval.videoUrl);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      // 生成文件名：shot_id_序号_标题.mp4
      const shotNumber = project.shots.findIndex(s => s.id === shot.id) + 1;
      a.download = `shot_${shotNumber.toString().padStart(3, '0')}.mp4`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      await dialog.alert({
        title: '成功',
        message: '视频下载已开始',
        type: 'success',
      });
    } catch (error: any) {
      console.error('下载视频失败:', error);
      await dialog.alert({
        title: '错误',
        message: `下载视频失败: ${error.message}`,
        type: 'error',
      });
    }
  };

  const deleteShot = async (shotId: string) => {
    const confirmed = await dialog.confirm({
      title: '确认删除',
      message: '确定要删除这个分镜吗？',
      type: 'warning',
    });
    if (!confirmed) return;
    const updatedShots = project.shots.filter(s => s.id !== shotId);
    updateProject({ shots: updatedShots });
  };


  const handleFileUploadClick = (shotId: string, type: 'start' | 'end' | 'full') => {
    setUploadingKeyframe({ shotId, type });
    setFileUploadModalOpen(true);
  };

  const handleFileUploadSuccess = (fileUrl: string) => {
    if (!uploadingKeyframe) return;

    const shot = project.shots.find(s => s.id === uploadingKeyframe.shotId);
    if (!shot) return;

    updateShot(shot.id, (s) => {
      if (!s.keyframes) return s;

      const newKeyframes = s.keyframes.map(k => {
        if (k.type === uploadingKeyframe.type) {
          return { ...k, imageUrl: fileUrl };
        }
        return k;
      });

      return { ...s, keyframes: newKeyframes };
    });

    setUploadingKeyframe(null);
    setFileUploadModalOpen(false);
  };

  const handleBatchGenerateImages = async () => {
      const isRegenerate = allStartFramesGenerated;

      let shotsToProcess = [];
      if (isRegenerate) {
          const confirmed = await dialog.confirm({
            title: '确认重新生成',
            message: '确定要重新生成所有镜头的帧图片吗？这将覆盖现有图片。',
            type: 'warning',
          });
          if (!confirmed) return;
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
                const full_url = await ModelService.generateImage(full_prompt + (referencePrompt?referencePrompt:""), referenceImages, "full", localStyle, imageSize, 1, shot.modelProviders,project.id);
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
                const url = await ModelService.generateImage(prompt + (referencePrompt?referencePrompt:""), referenceImages, "start", localStyle, imageSize, 1, shot.modelProviders,project.id);
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
                const end_url = await ModelService.generateImage(end_prompt + (referencePrompt?referencePrompt:""), referenceImages, "end", localStyle, imageSize, 1, shot.modelProviders,project.id);
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
            if(e.message?.includes("enough")){
              await dialog.alert({ title: '错误', message: '余额不足，请充值', type: 'error' });
            }else{
              await dialog.alert({ title: '错误', message: '生成失败，请重试', type: 'error' });
            }
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

  const handleOneClickProduction = async (shot: Shot) => {
      if (!!processingState || !!batchProgress) return;

      setOneClickProcessing({ shotId: shot.id, step: 'images' });

      try {
          // Step 1: Generate images
          if (imageCount > 0) {
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
          if(imageCount > 0){
            if (imageCount > 1 && !updatedFullKf?.imageUrl) {
                throw new Error("宫格图生成失败");
            }
            if (imageCount <= 1 && !updatedStartKf?.imageUrl) {
                throw new Error("起始帧生成失败");
            }
          }

          await handleGenerateVideo(finalShot);
      } catch (e: any) {
          console.error(e);
          await dialog.alert({ title: '错误', message: `一键制作失败: ${e.message}`, type: 'error' });
      } finally {
          setOneClickProcessing(null);
      }
  };

  const handleBatchGenerateVideos = async () => {
      if (!project.shots.length) return;

      const isRegenerate = project.shots.every(s => s.interval?.videoUrl);
      if (isRegenerate) {
          const confirmed = await dialog.confirm({
            title: '确认重新生成',
            message: '确定要重新生成所有视频吗？这将覆盖现有视频。',
            type: 'warning',
          });
          if (!confirmed) return;
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

              if(imageCount>0){
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

  const handleSceneBatchGenerateImages = async (sceneId: string) => {
    const sceneShots = project.shots.filter(s => String(s.sceneId) === String(sceneId));
    if (sceneShots.length === 0) return;

    const isRegenerate = sceneShots.every(s => s.keyframes?.find(k => k.type === 'start')?.imageUrl);

    let shotsToProcess = [];
    if (isRegenerate) {
        const confirmed = await dialog.confirm({
          title: '确认重新生成',
          message: `确定要重新生成场景 "${sceneId}" 的所有镜头帧图片吗？这将覆盖现有图片。`,
          type: 'warning',
        });
        if (!confirmed) return;
        shotsToProcess = [...sceneShots];
    } else {
        shotsToProcess = sceneShots.filter(s => !s.keyframes?.find(k => k.type === 'start')?.imageUrl);
    }

    if (shotsToProcess.length === 0) return;

    setBatchProgress({
        current: 0,
        total: shotsToProcess.length,
        message: isRegenerate ? `正在重新生成场景 ${sceneId} 的帧图片...` : `正在生成场景 ${sceneId} 的帧图片...`
    });

    let currentShots = [...project.shots];

    for (let i = 0; i < shotsToProcess.length; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 3000));

        const shot = shotsToProcess[i];
        setBatchProgress({
            current: i + 1,
            total: shotsToProcess.length,
            message: `正在生成场景 ${sceneId} - 镜头 ${i+1}/${shotsToProcess.length}...`
        });

        try {
            const referenceImages = getRefImagesForShot(shot);
            const referencePrompt = getRefImagesDescForShot(shot);

            if(imageCount>0){
              if(imageCount > 1){
                  const existingFf = shot.keyframes?.find(k => k.type === 'full');
                  let full_prompt = existingFf?.visualPrompt || shot.actionSummary;
                  const ffId = existingFf?.id || `kf-${shot.id}-full-${Date.now()}`;
                  const full_url = await ModelService.generateImage(full_prompt + (referencePrompt?referencePrompt:""), referenceImages, "full", localStyle, imageSize, 1, shot.modelProviders,project.id);
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
                  const url = await ModelService.generateImage(prompt + (referencePrompt?referencePrompt:""), referenceImages, "start", localStyle, imageSize, 1, shot.modelProviders,project.id);
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
                  const end_url = await ModelService.generateImage(end_prompt + (referencePrompt?referencePrompt:""), referenceImages, "end", localStyle, imageSize, 1, shot.modelProviders,project.id);
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
            }

             updateProject({ shots: currentShots });

        } catch (e) {
            if(e.message?.includes("enough")){
                await dialog.alert({ title: '错误', message: '余额不足，请充值', type: 'error' });
            }else{
                await dialog.alert({ title: '错误', message: '生成失败，请重试', type: 'error' });
            }
            console.error(`Failed to generate for shot ${shot.id}`, e);
        }
    }

    setBatchProgress(null);
  };

  const handleSceneBatchGenerateVideos = async (sceneId: string) => {
    const sceneShots = project.shots.filter(s => String(s.sceneId) === String(sceneId));
    if (sceneShots.length === 0) return;

    const isRegenerate = sceneShots.every(s => s.interval?.videoUrl);
    if (isRegenerate) {
        const confirmed = await dialog.confirm({
          title: '确认重新生成',
          message: `确定要重新生成场景 "${sceneId}" 的所有视频吗？这将覆盖现有视频。`,
          type: 'warning',
        });
        if (!confirmed) return;
    }

    const targetShots = isRegenerate ? sceneShots : sceneShots.filter(s => !s.interval?.videoUrl);
    if (targetShots.length === 0) return;

    setBatchVideoProgress({ current: 0, total: targetShots.length, currentShotName: sceneId });

    for (let i = 0; i < targetShots.length; i++) {
        const shot = targetShots[i];
        setBatchVideoProgress({
            current: i + 1,
            total: targetShots.length,
            currentShotName: `${sceneId} - 镜头 ${project.shots.findIndex(s => s.id === shot.id) + 1}`
        });

        try {
            const currentStartKf = shot.keyframes?.find(k => k.type === 'start');
            const currentEndKf = shot.keyframes?.find(k => k.type === 'end');
            const currentFullKf = shot.keyframes?.find(k => k.type === 'full');
            if(imageCount>0){
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
            }

            await new Promise(r => setTimeout(r, 1000));

            const updatedShot = project.shots.find(s => s.id === shot.id);
            if (!updatedShot) continue;

            await handleGenerateVideo(updatedShot);
        } catch (e) {
            console.error(`Failed to generate video for shot ${shot.id}`, e);
        }

        if (i < targetShots.length - 1) {
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    setBatchVideoProgress(null);
  };

  const renderSceneContext = () => {
      if (!activeShot || !project.scriptData) return null;
      // String comparison for safety
      const scene = project.scriptData.scenes.find(s => String(s.id) === String(activeShot.sceneId));
      const activeCharacters = project.scriptData.characters.filter(c => activeShot.characters.includes(c.name));

      return (
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-600 mb-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">场景/角色
                    </span>
                 </div>

              </div>
              
              <div className="flex flex-wrap gap-4 items-start">
                  {/* 左侧：场景图片 */}
                  <div className="w-28 h-20 bg-slate-800/50 rounded-lg overflow-hidden flex-shrink-0 border border-slate-600 relative">
                    {scene?.referenceImage ? (
                        <img src={scene.referenceImage} className="w-full h-full object-cover cursor-pointer hover:ring-2 hover:ring-indigo-500" onClick={() => setPreviewImageUrl(scene.referenceImage)}/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800">
                          <MapPin className="w-6 h-6 text-slate-600" />
                      </div>
                    )}
                  </div>
                  {/* 右侧：场景信息 */}
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-50 text-sm font-bold">{scene?.location || '未知场景'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {scene?.time}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{scene?.atmosphere}</p>
                  </div>
                  {/* 整行：角色列表 */}
                  <div className="w-full space-y-2">
                    {/* Character List with Variation Selector */}
                    <div className="flex flex-col gap-2 pt-2">
                         {activeCharacters.map(char => {
                             const hasVars = char.variations && char.variations.length > 0;
                             const selectedVarId = activeShot.characterVariations?.[char.id];
                             const selectedVar = char.variations.find(v => v.id === selectedVarId);
                             const displayImage = selectedVar?.referenceImage || char.referenceImage;
                             return (
                                 <div key={char.id} className="flex items-center justify-between bg-slate-800/50 rounded p-1.5 border border-slate-600">
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
                                                className="bg-slate-700 text-[12px] text-slate-400 border border-slate-600 rounded px-1.5 py-0.5 min-w-[60px] outline-none focus:border-slate-500"
                                             >
                                                 <option value="">默认</option>
                                                 {char.variations.map(v => (
                                                     <option key={v.id} value={v.id}>{v.name}</option>
                                                 ))}
                                             </select>
                                         )}
                                         <button
                                             onClick={() => setSelectedCharId(char.id)}
                                             className="p-1.5 bg-slate-700/50 text-slate-400 hover:text-slate-50 rounded-full hover:bg-slate-800/20 transition-all border border-white/10"
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
      <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-900">
          <AlertCircle className="w-12 h-12 mb-4 opacity-50"/>
          <p>暂无镜头数据，请先制作剧本并完成成分镜。</p>
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 relative overflow-hidden">
      
      {/* Batch Progress Overlay */}
      {batchProgress && (
        <div className="absolute inset-0 z-50 bg-slate-700/80 flex flex-col items-center justify-center backdrop-blur-md animate-in fade-in">
           <Loader2 className="w-12 h-12 text-slate-500 animate-spin mb-6" />
           <h3 className="text-xl font-bold text-slate-50 mb-2">{batchProgress.message}</h3>
           <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-slate-500 transition-all duration-300" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}></div>
           </div>
           <p className="text-slate-500 mt-3 text-xs font-mono">{Math.round((batchProgress.current / batchProgress.total) * 100)}%</p>
        </div>
      )}

      {/* Batch Video Progress Overlay */}
      {batchVideoProgress && (
        <div className="absolute inset-0 z-50 bg-slate-700/80 flex flex-col items-center justify-center backdrop-blur-md animate-in fade-in">
           <Video className="w-12 h-12 text-slate-500 mb-6 animate-pulse" />
           <h3 className="text-xl font-bold text-slate-50 mb-2">正在批量生成视频...</h3>
           <p className="text-slate-400 mb-4 text-sm">{batchVideoProgress.currentShotName}</p>
           <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-slate-500 transition-all duration-300" style={{ width: `${(batchVideoProgress.current / batchVideoProgress.total) * 100}%` }}></div>
           </div>
           <p className="text-slate-500 mt-3 text-xs font-mono">{batchVideoProgress.current} / {batchVideoProgress.total} ({Math.round((batchVideoProgress.current / batchVideoProgress.total) * 100)}%)</p>
        </div>
      )}

      {/* Toolbar */}
      {(!isMobile || !activeShotId) && (
      <div className="h-14 border-b border-slate-600 bg-slate-700 md:px-6 px-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-slate-50 flex items-center gap-3">
                  <Clapperboard className="w-5 h-5 text-slate-500" />
                  导演台
              </h2>
          </div>

          <div className="flex items-center gap-3">
            {!isMobile && (
              <span className="text-xs text-slate-500 mr-4 font-mono">
                  {project.shots.filter(s => s.interval?.videoUrl).length} / {project.shots.length} 完成
              </span>
            )}
            {imageCount>0 && (
              <button
                  onClick={handleBatchGenerateImages}
                  disabled={!!batchProgress || !!batchVideoProgress}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
                      allStartFramesGenerated
                        ? 'bg-slate-700 text-slate-50 border border-slate-600 hover:text-slate-50 hover:border-slate-300'
                        : 'bg-slate-700 text-slate-50 hover:bg-slate-600 shadow-lg shadow-white/5 border border-slate-600'
                  }`}
              >
                  <Image className="w-3 h-3" />
                  {allStartFramesGenerated ? '重新生图' : '批量生图'}
              </button>
            )}
              <button
                  onClick={handleBatchGenerateVideos}
                  disabled={!!batchProgress || !!batchVideoProgress}
                  className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-600 text-slate-50 text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 hover:bg-slate-500 shadow-lg shadow-slate-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                  <Video className="w-3 h-3" />
                  {project.shots.every(s => s.interval?.videoUrl) ? '重新生成' : '批量视频'}
              </button>
          </div>
      </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
          {/* Grid View - Responsive Logic */}
          <div className={`flex-1 overflow-y-auto transition-all duration-500 ease-in-out ${activeShotId ? (isMobile?'hidden':'md:p-6 p-2 border-r border-slate-600') : 'md:p-6 p-2'}`}>
                  {project.scriptData?.scenes.map((scene, index) => {
                    const sceneShots = project.shots.filter(s => s.sceneId === scene.id);
                return (
                  <>
 <div className="flex items-center gap-2 pb-1 border-b border-slate-600 mb-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">场景{scene.id}：{scene?.location || '未知场景'}
                    </span>
                    <button
                    onClick={() => setEditingSceneInMain(scene!)}
                    className="text-[11px] font-medium text-slate-400 hover:text-slate-50 hover:bg-slate-600 p-1 md:p-1.5 rounded transition-all"
                    title="编辑场景"
                 >
                    <Edit className="w-3.5 h-3.5" />
                 </button>
                 <div className="flex-1 flex justify-end items-center">
                    <button
                        onClick={() => handleSceneBatchGenerateImages(scene.id)}
                        disabled={!!batchProgress || !!batchVideoProgress}
                        className="text-[11px] font-medium text-slate-400 hover:text-slate-50 hover:bg-slate-600 p-1 md:p-1.5 rounded transition-all flex items-center gap-1"
                        title="批量生成图片"
                    >
                        <Image className="w-3 h-3" />
                        生图
                    </button>
                    <button
                        onClick={() => handleSceneBatchGenerateVideos(scene.id)}
                        disabled={!!batchProgress || !!batchVideoProgress}
                        className="text-[11px] font-medium text-slate-400 hover:text-slate-50 hover:bg-slate-600 p-1 md:p-1.5 rounded transition-all flex items-center gap-1"
                        title="批量生成视频"
                    >
                        <Video className="w-3 h-3" />
                        视频
                    </button>
                    </div>
                 </div>
                <div className={`grid gap-4 pb-4 ${activeShotId ? 'grid-cols-2 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5'}`}>
                    {sceneShots.map((shot, idx) => {
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
                                    group relative flex flex-col bg-slate-900 border rounded-xl overflow-hidden cursor-pointer transition-all duration-200
                                    ${isActive ? 'border-slate-500 ring-1 ring-indigo-500/50 shadow-xl scale-[1.02]' : 'border-slate-600 hover:border-slate-300 hover:shadow-lg'}
                                `}
                            >
                                {/* Header */}
                                <div className="px-1.5 md:px-2 py-2 bg-bg-button border-b border-slate-600 flex justify-between items-center">
                                  <div className="flex items-center gap-1 md:gap-1.5">
                                    <span className={`font-mono text-[12px] font-bold ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>{String(idx + 1).padStart(2, '0')}</span>
                                        <span className="text-[11px] px-1 md:px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded uppercase">{shot.cameraMovement} {shot.interval?.duration}s</span>
                                  </div>
                                    <div className="flex items-center gap-0.5 md:gap-1">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); startEditShot(shot); }}
                                          className="p-1 md:p-1.5 hover:bg-slate-700 text-slate-500 hover:text-slate-50 rounded transition-colors"
                                          title="编辑镜头"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={(e) => {e.stopPropagation();deleteShot(shot.id)}}
                                          className="p-1 md:p-1.5 hover:bg-red-900/20 text-slate-600 group-hover:text-red-400 rounded transition-colors"
                                          title="删除"
                                        >
                                          <Trash className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                {/* Thumbnail */}
                                <div
                                  className="aspect-video bg-slate-800/50 relative overflow-hidden"
                                  onMouseEnter={() => {
                                    if (hasVideo && !videoPlayingShots.has(shot.id)) {
                                      setVideoPlayingShots(prev => new Set([...prev, shot.id]));
                                    }
                                  }}
                                  
                                >
                                    {videoReadyShots.has(shot.id) && hasVideo && videoPlayingShots.has(shot.id) ? (
                                        <video
                                          data-shot-id={shot.id}
                                          src={shot.interval?.videoUrl}
                                          className="w-full h-full object-cover"
                                          muted controls
                                          onMouseLeave={(e) => e.currentTarget.pause()}
                                          onCanPlay={() => {
                                            if (!videoReadyShots.has(shot.id)) {
                                              setVideoReadyShots(prev => new Set([...prev, shot.id]));
                                            }
                                          }}
                                        />
                                    ) : hasImage ? (
                                        <>
                                          <img src={sKf!.imageUrl || fKf!.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                          {/* Preload video in background */}
                                          {
                                            hasVideo && !videoReadyShots.has(shot.id) && (
                                            <video
                                              src={shot.interval?.videoUrl}
                                              className="hidden"
                                              onCanPlay={() => {
                                                if (!videoReadyShots.has(shot.id)) {
                                                  setVideoReadyShots(prev => new Set([...prev, shot.id]));
                                                }
                                              }}
                                            />
                                          ) }
                                        </>
                                    ) : hasVideo ? (
                                        <video
                                          data-shot-id={shot.id}
                                          className="w-full h-full object-cover"
                                          src={shot.interval?.videoUrl}
                                          muted controls
                                          onMouseLeave={(e) => e.currentTarget.pause()}
                                          onCanPlay={() => {
                                            if (!videoReadyShots.has(shot.id)) {
                                              setVideoReadyShots(prev => new Set([...prev, shot.id]));
                                            }
                                          }}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                                            <ImageIcon className="w-8 h-8 opacity-20" />
                                        </div>
                                    )}

                                    {/* Badges */}
                                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                        {hasVideo && <div className="p-1 bg-green-500 text-slate-50 rounded shadow-lg backdrop-blur"><Video className="w-3 h-3" /></div>}
                                    </div>

                                    {!activeShotId && !hasImage && !hasVideo && (
                                        <div className="absolute inset-0 bg-slate-700/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-[12px] text-slate-50 font-bold uppercase tracking-wider bg-slate-800/50/90 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur">点击生成</span>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-3">
                                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                                        {shot.actionSummary}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div></>
                );
              })}
          </div>

          {/* Right Workbench - Optimized Interaction */}
          {activeShotId && activeShot && (
              <div className={`${isMobile ? 'w-full' : 'md:w-[480px] lg:w-[480px] 3xl:w-[640px]'} bg-slate-700/50 flex flex-col h-full shadow-2xl animate-in slide-in-from-right-10 duration-300 relative z-20`}>
                  
                  {/* Workbench Header */}
                  <div className="h-16 md:px-6 px-2 border-b border-slate-600 flex items-center justify-between bg-slate-600/50 shrink-0">
                       <div className="flex items-center gap-3">
                           <span className="w-8 h-8 bg-slate-900/30 text-slate-400 rounded-lg flex items-center justify-center font-bold font-mono text-sm border border-slate-500/20">
                              {String(activeShotIndex + 1).padStart(2, '0')}
                           </span>
                           <div>
                               <span className="text-[16px] text-slate-50 font-bold text-sm">镜头详情
                            <button
                                onClick={(e) => { e.stopPropagation(); startEditShot(activeShot); }}
                            className="px-2.5 py-2 text-[11px] font-medium text-slate-400 hover:text-slate-50 rounded transition-all "
                            title="修改镜头"
                            >
                            <Edit className="w-3.5 h-3.5" />
                            </button>
                               </span>
                               <p className="text-[12px] text-slate-500 uppercase tracking-widest">{activeShot.cameraMovement} {activeShot.interval?.duration}s</p>
                           </div>
                       </div>
                       
                       <div className="flex items-center gap-1">
                           <button onClick={goToPrevShot} disabled={activeShotIndex === 0} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-50 disabled:opacity-20 transition-colors">
                               <ChevronLeft className="w-4 h-4" />
                           </button>
                           <button onClick={goToNextShot} disabled={activeShotIndex === project.shots.length - 1} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-50 disabled:opacity-20 transition-colors">
                               <ChevronRight className="w-4 h-4" />
                           </button>
                           <div className="w-px h-4 bg-slate-700 mx-2"></div>
                           <button onClick={() => setActiveShotId(null)} className="p-2 hover:bg-red-900/20 rounded text-slate-400 hover:text-red-400 transition-colors">
                               <X className="w-4 h-4" />
                           </button>
                       </div>
                  </div>

                  {/* Workbench Content */}
                  <div className="flex-1 overflow-y-auto md:p-6 p-2 space-y-6 border-b border-slate-600">
                       {/* Section 1: Context */}
                       {renderSceneContext()}
                       {/* Section 2: Narrative */}
                       <div className="space-y-4">
                           <div className="flex items-center gap-2 border-b border-slate-600 pb-2">
                               <Film className="w-4 h-4 text-slate-500" />
                               <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">叙事动作</h4>
                        </div>
                           
                           <div className="space-y-3">
                               <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
                                   <p className="text-slate-200 text-sm leading-relaxed">{activeShot.actionSummary}</p>
                               </div>
                               
                               {activeShot.dialogue && (
                                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 flex gap-3">
                                      <MessageSquare className="w-4 h-4 text-slate-600 mt-0.5" />
                                      <div className="flex-1">
                                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">对白</p>
                                          <p className="text-slate-200 font-serif italic text-sm mb-2">"{activeShot.dialogue}"</p>
                                          {activeShot.audioUrl && (
                                              <audio
                                                  controls
                                                  className="w-full h-7 rounded bg-bg-progress border border-slate-600/50"
                                                  src={activeShot.audioUrl}
                                              />
                                          )}
                                      </div>
                                  </div>
                               )}
                           </div>
                       </div>

                       {/* Section 3: Shot Model Providers */}
                       <div className="space-y-4">
                           <div className="flex items-center justify-between border-b border-slate-600 pb-2">
                               <div className="flex items-center gap-2">
                                   <Sparkles className="w-4 h-4 text-slate-500" />
                                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">模型供应商</h4>
                               </div>
                               <button
                                   onClick={async () => {
                                       try {
                                           const configs = await getAllModelConfigs();
                                           setModelConfigs(configs);
                                           //console.log('模型配置已刷新');
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
                                   <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">图像模型</label>
                                   <div className="relative">
                                       <select
                                           value={activeShot.modelProviders?.text2image || project.modelProviders?.text2image}
                                           onChange={(e) => {
                                               const text2image = e.target.value || undefined;
                                               updateShot(activeShot.id, (s) => ({
                                                   ...s,
                                                   modelProviders: {
                                                       ...s.modelProviders,
                                                       text2image
                                                   }
                                               }));
                                           }}
                                           className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-3 py-2 text-xs rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                                       >
                                           <option value="">使用项目默认</option>
                                           {modelConfigs
                                               .filter(c => c.modelType === 'text2image' && c.apiKey)
                                               .map(config => (
                    <option key={config.id} value={config.id}>
                      {config.provider} - {config.description || config.model}{config.enabled ? '✅' : null}
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
                                   <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">视频模型</label>
                                   <div className="relative">
                                       <select
                                           value={activeShot.modelProviders?.image2video || project.modelProviders?.image2video}
                                           onChange={(e) => {
                                               const image2video = e.target.value || undefined;
                                               updateShot(activeShot.id, (s) => ({
                                                   ...s,
                                                   modelProviders: {
                                                       ...s.modelProviders,
                                                       image2video
                                                   }
                                               }));
                                           }}
                                           className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-3 py-2 text-xs rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                                       >
                                           <option value="">使用项目默认</option>
                                           {modelConfigs
                                               .filter(c => c.modelType === 'image2video' && c.apiKey)
                                               .map(config => (
                    <option key={config.id} value={config.id}>
                      {config.provider} - {config.description || config.model}{config.enabled ? '✅' : null}
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

                       {/* Section 4: Visual Production */}
                       <div className="space-y-4">
                           <div className="flex items-center justify-between border-b border-slate-600 pb-2">
                               <div className="flex items-center gap-2">
                                   <Aperture className="w-4 h-4 text-slate-500" />
                                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">视觉制作</h4>
                               </div>
                               {imageCount > 0 && (                                
                               <button
                                   onClick={() => handleOneClickProduction(activeShot)}
                                   disabled={!!processingState || !!batchProgress || oneClickProcessing?.shotId === activeShot.id}
                                   className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-slate-50 text-[11px] font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1.5 shadow-lg shadow-slate-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
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
                               )}
                           </div>

                           {imageCount>0 && (imageCount > 1 ? (
                               <div className="space-y-2">
                                   <div className="flex justify-between items-center">
                                       <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">宫格图</span>
                                       <div className="flex items-center gap-2">
                                            {fullKf?.imageUrl && (
                                                   <button
                                                       onClick={() => deleteKeyframeImage(activeShot.id, 'full')}
                                                       disabled={!!processingState || !!batchProgress}
                                                       className="text-[12px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                       title="删除起始帧图片"
                                                   >
                                                       <Trash className="w-3 h-3" />
                                                   </button>
                                               )}
                                       <button
                                           onClick={() => handleGenerateKeyframe(activeShot, 'full')}
                                           disabled={!!processingState || !!batchProgress}
                                           className="text-[12px] text-slate-400 hover:text-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                       >
                                           {processingState?.type === 'kf_full' && (processingState?.id === fullKf?.id || (!fullKf && processingState?.type === 'kf_full')) ? '生成中...' : fullKf?.imageUrl ? '重新生成' : '生成'}
                                       </button>
                                       </div>
                                   </div>
                                   <div className="aspect-video bg-slate-800/50 rounded-lg border border-slate-600 overflow-hidden relative group">
                                       <button
                                           onClick={(e) => { e.stopPropagation(); handleFileUploadClick(activeShot.id, 'full'); }}
                                           disabled={!!processingState || !!batchProgress}
                                           className="absolute bottom-2 right-2 p-2 bg-slate-700/50 text-slate-50 rounded-full hover:bg-slate-800 hover:text-slate-50 transition-colors border border-white/10 backdrop-blur z-10"
                                           title="上传图片"
                                       >
                                           <Upload className="w-3 h-3" />
                                       </button>
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
                                            <div className="absolute inset-0 bg-slate-700/60 flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                                            </div>
                                       )}
                                   </div>
                                   {/* Visual Prompt Editor */}
                                   {fullKf && (
                                       <textarea
                                           value={fullKf.visualPrompt || ''}
                                           onChange={(e) => updateKeyframePrompt(activeShot.id, 'full', e.target.value)}
                                           className="w-full bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded p-2 focus:border-slate-500 focus:outline-none resize-none h-18 transition-colors"
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
                                           <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">起始帧</span>
                                            <div className="flex items-center gap-2">
                                            {startKf?.imageUrl && (
                                                   <button
                                                       onClick={() => deleteKeyframeImage(activeShot.id, 'start')}
                                                       disabled={!!processingState || !!batchProgress}
                                                       className="text-[12px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                       title="删除起始帧图片"
                                                   >
                                                       <Trash className="w-3 h-3" />
                                                   </button>
                                               )}
                                           <button
                                               onClick={() => handleGenerateKeyframe(activeShot, 'start')}
                                               disabled={!!processingState || !!batchProgress}
                                               className="text-[12px] text-slate-400 hover:text-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                           >
                                               {processingState?.type === 'kf_start' && (processingState?.id === startKf?.id || (!startKf && processingState?.type === 'kf_start')) ? '生成中...' : startKf?.imageUrl ? '重新生成' : '生成'}
                                           </button>
                                           </div>
                                       </div>
                                       <div className="aspect-video bg-slate-800/50 rounded-lg border border-slate-600 overflow-hidden relative group">
                                           <button
                                               onClick={(e) => { e.stopPropagation(); handleFileUploadClick(activeShot.id, 'start'); }}
                                               disabled={!!processingState || !!batchProgress}
                                               className="absolute bottom-2 right-2 p-2 bg-slate-700/50 text-slate-50 rounded-full hover:bg-slate-800 hover:text-slate-50 transition-colors border border-white/10 backdrop-blur z-10"
                                               title="上传图片"
                                           >
                                               <Upload className="w-3 h-3" />
                                           </button>
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
                                                <div className="absolute inset-0 bg-slate-700/60 flex items-center justify-center">
                                                    <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                                                </div>
                                           )}
                                       </div>
                                       {/* Visual Prompt Editor */}
                                       {startKf && (
                                           <textarea
                                               value={startKf.visualPrompt || ''}
                                               onChange={(e) => updateKeyframePrompt(activeShot.id, 'start', e.target.value)}
                                               className="w-full bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded p-2 focus:border-slate-500 focus:outline-none resize-none h-18 transition-colors"
                                               placeholder="输入起始帧画面描述..."
                                               rows={3}
                                           />
                                       )}
                                   </div>

                                   {/* End Frame */}
                                   <div className="space-y-2">
                                       <div className="flex justify-between items-center">
                                           <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">结束帧</span>
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
                                                   className="text-[12px] text-slate-400 hover:text-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                               >
                                                   {processingState?.type === 'kf_end' && (processingState?.id === endKf?.id || (!endKf && processingState?.type === 'kf_end')) ? '生成中...' : endKf?.imageUrl ? '重新生成' : '生成'}
                                               </button>
                                           </div>
                                       </div>
                                       <div className="aspect-video bg-slate-800/50 rounded-lg border border-slate-600 overflow-hidden relative group">
                                           <button
                                               onClick={(e) => { e.stopPropagation(); handleFileUploadClick(activeShot.id, 'end'); }}
                                               disabled={!!processingState || !!batchProgress}
                                               className="absolute bottom-2 right-2 p-2 bg-slate-700/50 text-slate-50 rounded-full hover:bg-slate-800 hover:text-slate-50 transition-colors border border-white/10 backdrop-blur z-10"
                                               title="上传图片"
                                           >
                                               <Upload className="w-3 h-3" />
                                           </button>
                                           {endKf?.imageUrl ? (
                                               <img
                                                 src={endKf.imageUrl}
                                                 className={`w-full h-full object-contain ${!processingState || processingState?.type !== 'kf_end' || processingState?.id !== endKf.id ? 'cursor-pointer' : ''}`}
                                                 onClick={() => (!processingState || processingState?.type !== 'kf_end' || processingState?.id !== endKf.id) && setPreviewImageUrl(endKf.imageUrl!)}
                                               />
                                           ) : (
                                               <div className="absolute inset-0 flex items-center justify-center">
                                                   <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                                               </div>
                                           )}
                                           {/* Loading State matching ID */}
                                           {((endKf && processingState?.id === endKf.id) || (processingState?.type === 'kf_end' && !endKf)) && (
                                                <div className="absolute inset-0 bg-slate-700/60 flex items-center justify-center">
                                                    <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                                                </div>
                                           )}
                                       </div>
                                       {/* Visual Prompt Editor */}
                                       {endKf && (
                                           <textarea
                                               value={endKf.visualPrompt || ''}
                                               onChange={(e) => updateKeyframePrompt(activeShot.id, 'end', e.target.value)}
                                               className="w-full bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded p-2 focus:border-slate-500 focus:outline-none resize-none h-18 transition-colors"
                                               placeholder="输入结束帧画面描述..."
                                               rows={3}
                                           />
                                       )}
                                   </div>
                               </div>
                           ))}

                           </div>

                           {/* Section 4: Video Generation */}
                       <div className="bg-slate-800 rounded-xl p-5 border border-slate-600 space-y-4">
                           <div className="flex items-center justify-between">
                               <h4 className="text-xs font-bold text-slate-50 uppercase tracking-widest flex items-center gap-2">
                                  <Video className="w-3 h-3 text-slate-500" />
                                  视频生成
                               </h4>
                               <div className="flex items-center gap-3">
                                   {activeShot.interval?.status === 'completed' && (
                                       <button
                                           onClick={() => handleDownloadVideo(activeShot)}
                                           className="text-[12px] text-green-500 font-mono flex items-center gap-1 hover:text-green-400 transition-colors cursor-pointer bg-transparent border-0 p-0"
                                           title="点击下载视频"
                                       >
                                           <Download className="w-3 h-3" />
                                           READY
                                       </button>
                                   )}
                                   {activeShot.interval?.duration && <span className="text-[12px] text-slate-400 font-mono flex items-center gap-1">{activeShot.interval?.duration}s</span>}
                               </div>
                           </div>
                           
                           {activeShot.interval?.videoUrl ? (
                               <div className="w-full aspect-video bg-slate-800/50 rounded-lg overflow-hidden border border-slate-600 relative shadow-lg">
                                   <video src={activeShot.interval.videoUrl} controls className="w-full h-full" />
                               </div>
                           ) : (
                               <div className="w-full aspect-video bg-slate-800/50 rounded-lg border border-dashed border-slate-600 flex items-center justify-center">
                                   <span className="text-xs text-slate-600 font-mono">预览</span>
                               </div>
                           )}

                           
                           {!endKf?.imageUrl && !startKf?.imageUrl && imageCount > 1 && (
                               <div className="text-[11px] text-slate-500 text-center font-mono">
                                  * 将使用连续图生成模式
                               </div>
                           )}
                       </div>
                  </div>
                           <button
                             onClick={() => handleGenerateVideo(activeShot)}
                             disabled={!!processingState || !!batchProgress}
                             className={`mx-6 m-3 py-2 rounded-lg font-bold border border-slate-600 xt-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                               activeShot.interval?.videoUrl
                                 ? 'bg-slate-600 text-slate-300 hover:bg-slate-700'
                                 : 'bg-slate-600 text-slate-50 hover:bg-slate-500 shadow-lg shadow-slate-600/20'
                             } ${(!!processingState || !!batchProgress) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              </div>
          )}

          {/* Fullscreen Image Preview Modal */}
          {previewImageUrl && (
            <div
              className="fixed inset-0 z-[100] bg-slate-700/90 backdrop-blur-sm flex items-center justify-center"
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
                className="absolute top-6 right-6 p-3 bg-slate-800/50/80 hover:bg-slate-800 text-slate-50 rounded-full transition-colors"
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
              imageCount={project.imageCount}
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
            <WardrobeModal
              character={project.scriptData.characters.find(c => String(c.id) === String(selectedCharId)) || null}
              project={project}
              localStyle={localStyle}
              imageSize={imageSize}
              processingState={wardProcessingState}
              setProcessingState={setWardProcessingState}
              updateProject={updateProject}
              onClose={() => setSelectedCharId(null)}
              setPreviewImage={setPreviewImageUrl}
            />
          )}

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={fileUploadModalOpen}
        onClose={() => setFileUploadModalOpen(false)}
        onUploadSuccess={handleFileUploadSuccess}
        fileType={uploadingKeyframe?.type === 'full' ? 'full' : 'start_end'}
        acceptTypes="image/png,image/jpeg,image/jpg"
        title={uploadingKeyframe?.type === 'full' ? '上传宫格图' : uploadingKeyframe?.type === 'start' ? '上传起始帧' : '上传尾帧'}
        projectid={project.id}
      />
    </div>
    </div>
  );
};

export default StageDirector;
