import { AlertCircle, BarChart3, Check, CheckCircle, Download, Film, Loader2, X } from 'lucide-react';
import React, { useState } from 'react';
import { initializeCozeConfig, submitWorkflow } from '../services/cozeService';
import { ProjectState } from '../types';
import { uploadFileToService } from "../utils/fileUploadUtils";

interface Props {
  project: ProjectState;
  updateProject: (updates: Partial<ProjectState>) => void;
}

const StageExport: React.FC<Props> = ({ project, updateProject }) => {
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [selectedShotIds, setSelectedShotIds] = useState<Set<string>>(new Set());
  const [focusedShot, setFocusedShot] = useState<{ shot: typeof project.shots[0], index: number } | null>(null);
  const [isPlayingSelected, setIsPlayingSelected] = useState(false);
  const [currentPlayingShotIndex, setCurrentPlayingShotIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const completedShots = project.shots.filter(s => s.interval?.videoUrl);
  const totalShots = project.shots.length;
  const progress = totalShots > 0 ? Math.round((completedShots.length / totalShots) * 100) : 0;

  // Calculate total duration roughly
  const estimatedDuration = project.shots.reduce((acc, s) => acc + (s.interval?.duration || 5), 0);

  // Calculate selected shots total duration
  const selectedDuration = project.shots
    .filter(s => selectedShotIds.has(s.id))
    .reduce((acc, s) => acc + (s.interval?.duration || 5), 0);

  // Get selected shots in order for playback
  const selectedShots = project.shots.filter(s => selectedShotIds.has(s.id) && s.interval?.videoUrl);

  // Calculate total duration of all selected videos
  const totalDuration = selectedShots.reduce((acc, shot) => acc + (shot.interval?.duration || 5), 0);

  // Calculate current position in total timeline
  const calculateTotalCurrentTime = () => {
    let time = 0;
    for (let i = 0; i < currentPlayingShotIndex; i++) {
      time += (selectedShots[i]?.interval?.duration || 5);
    }
    time += currentTime;
    return time;
  };

  const totalCurrentTime = calculateTotalCurrentTime();

  // Handle video time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Handle video loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Toggle play/pause
  const handleTogglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPaused(false);
    } else {
      videoRef.current.pause();
      setIsPaused(true);
    }
  };

  // Jump to previous video
  const handlePrevious = () => {
    if (currentPlayingShotIndex > 0) {
      setCurrentPlayingShotIndex(currentPlayingShotIndex - 1);
    }
  };

  // Jump to next video
  const handleNext = () => {
    if (currentPlayingShotIndex < selectedShots.length - 1) {
      setCurrentPlayingShotIndex(currentPlayingShotIndex + 1);
    }
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;

    // Find which video should play based on percentage
    const targetTime = percentage * totalDuration;
    let accumulatedTime = 0;

    for (let i = 0; i < selectedShots.length; i++) {
      const shotDuration = selectedShots[i]?.interval?.duration || 5;
      if (accumulatedTime + shotDuration >= targetTime) {
        setCurrentPlayingShotIndex(i);
        const timeInVideo = targetTime - accumulatedTime;
        videoRef.current.currentTime = timeInVideo;
        return;
      }
      accumulatedTime += shotDuration;
    }
  };

  // Handle video ended event - auto play next video
  const handleVideoEnded = () => {
    if (!isPlayingSelected) return;
    if (currentPlayingShotIndex < selectedShots.length - 1) {
      setCurrentPlayingShotIndex(prev => prev + 1);
    } else {
      // All videos played, stop at end
      //setIsPlayingSelected(false);
      setCurrentPlayingShotIndex(0);
    }
  };

  // Start playing selected shots sequentially
  const handlePlaySelected = () => {
    if (selectedShots.length === 0) return;
    setIsPlayingSelected(true);
    setCurrentPlayingShotIndex(0);
    setCurrentTime(0);
    setIsPaused(false);
  };

  // Stop playing
  const handleStopPlayback = () => {
    //setIsPlayingSelected(false);
    setCurrentPlayingShotIndex(0);
    setCurrentTime(0);
    setIsPaused(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // Auto play when currentPlayingShotIndex changes
  React.useEffect(() => {
    if (isPlayingSelected && videoRef.current && selectedShots[currentPlayingShotIndex]) {
      setIsPaused(false);
      //setCurrentTime(0);
    }
  }, [currentPlayingShotIndex, isPlayingSelected, selectedShots]);


  // Toggle shot selection
  const toggleShotSelection = (shotId: string) => {
    // Stop playback when modifying selection
    if (isPlayingSelected) {
      handleStopPlayback();
    }
    setSelectedShotIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shotId)) {
        newSet.delete(shotId);
      } else {
        newSet.add(shotId);
      }
      return newSet;
    });
  };

  // Select all completed shots
  const selectAllCompleted = () => {
    const allCompletedIds = completedShots.map(s => s.id);
    setSelectedShotIds(new Set(allCompletedIds));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedShotIds(new Set());
  };

  const handleMerge = async () => {
    if (selectedShotIds.size === 0) {
      setMergeError("请至少选择一个镜头进行合并");
      return;
    }
    initializeCozeConfig();
    setIsMerging(true);
    setMergeError(null);

    try {
      // 收集选中镜头的视频 URL
      const selectedShots = project.shots.filter(s => selectedShotIds.has(s.id) && s.interval?.videoUrl);
      const videoUrls = selectedShots
        .map(shot => shot.interval?.videoUrl)
        .filter((url): url is string => !!url);

      console.log("开始合并视频...", videoUrls.length, "个视频片段");

      // 调用 Coze API 合并视频
      let mergedUrl = await submitWorkflow(videoUrls);

      try {
        const uploadResponse = await uploadFileToService({
          fileType: project.id+'_video',
          fileUrl: mergedUrl
        });

        if (uploadResponse.success && uploadResponse.data?.fileUrl) {
          console.log(`视频已上传到本地服务器: ${uploadResponse.data.fileUrl}`);
          mergedUrl = uploadResponse.data.fileUrl;
        } else {
          console.error(`视频上传失败: ${uploadResponse.error}`);
        }
      } catch (error) {
        console.error(`处理生成图片时出错:`, error);
      }

      console.log("视频合并完成:", mergedUrl);

      // 保存合并后的视频 URL 到 project
      updateProject({ mergedVideoUrl: mergedUrl });

    } catch (error: any) {
      console.error("合并视频失败:", error);
      setMergeError(error.message || "视频合并失败，请稍后重试");
    } finally {
      setIsMerging(false);
    }
  };

  const handleDownload = () => {
    if (!project.mergedVideoUrl) return;

    // 创建下载链接
    const link = document.createElement('a');
    link.href = project.mergedVideoUrl;
    link.download = `${project.scriptData?.title || 'merged-video'}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

    if (!project.shots.length) return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-900">
            <AlertCircle className="w-12 h-12 mb-4 opacity-50"/>
            <p>暂无镜头数据，请先制作剧本并完成成分镜。</p>
        </div>
    );

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
      
      {/* Header - Consistent with Director */}
      <div className="h-14 border-b border-slate-600 bg-slate-700 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-slate-50 flex items-center gap-3">
                  <Film className="w-5 h-5 text-slate-500" />
                  成片与导出
              </h2>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[12px] text-slate-500 font-mono uppercase bg-slate-900 border border-slate-600 px-2 py-1 rounded">
               状态: {progress === 100 ? '完成' : '制作中'}
             </span>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Main Status Panel */}
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 sm:p-6 shadow-2xl relative overflow-hidden group">
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 p-48 bg-slate-900/5 blur-[120px] rounded-full pointer-events-none"></div>
             <div className="absolute bottom-0 left-0 p-32 bg-emerald-900/5 blur-[100px] rounded-full pointer-events-none"></div>

             <div className="flex flex-row md:flex-row justify-between items-start md:items-center mb-4 relative z-10 gap-6">
               <div className='flex-1'>
                 <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">{project?.title || '未命名项目'}</h3>
                 </div>
                 <div className="flex items-center gap-4 mt-3">
                    <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">镜头</span>
                        <span className="text-sm font-mono text-slate-300">{project.shots.length}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">累计时长</span>
                        <span className="text-sm font-mono text-slate-300">~{estimatedDuration}s</span>
                    </div>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">目标时长</span>
                        <span className="text-sm font-mono text-slate-300">{project.targetDuration}</span>
                    </div>
                 </div>
               </div>

               <div className="text-right bg-slate-700/20 p-4 rounded-lg border border-white/5 backdrop-blur-sm min-w-[60px]">
                  <div className="flex items-baseline justify-end gap-1 mb-1">
                      <span className="text-3xl font-mono font-bold text-slate-400">{progress}</span>
                      <span className="text-sm text-slate-500">%</span>
                  </div>
                  <div className="text-[12px] text-slate-500 uppercase tracking-widest flex items-center justify-end gap-2">
                      {progress === 100 ? <CheckCircle className="w-3 h-3 text-green-500" /> : <BarChart3 className="w-3 h-3" />}
                      进度
                  </div>
                </div>
             </div>

             {/* Timeline Visualizer Strip */}
             <div className="mb-4">
                <div className="flex justify-between items-center text-[12px] text-slate-400 font-mono uppercase tracking-widest mb-2 px-1">
                    <span>分镜序列图</span>
                    <span>~{selectedDuration}s</span>
                </div>

                {/* Selection Toolbar */}
                <div className="flex justify-between items-center mb-2 px-1">
                    <div className="flex items-center gap-4">
                        <span className="text-[12px] text-slate-500 font-mono">
                            已选择: <span className="text-slate-400 font-bold">{selectedShotIds.size}</span> / {completedShots.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={selectAllCompleted}
                                disabled={completedShots.length === 0}
                                className="text-[11px] text-slate-500 hover:text-slate-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" />
                                全选
                            </button>
                            <button
                                onClick={deselectAll}
                                disabled={selectedShotIds.size === 0}
                                className="text-[11px] text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <X className="w-3 h-3" />
                                取消
                            </button>
                        </div>
                    </div>
                </div>

                <div className="h-20 bg-slate-700 rounded-lg border border-slate-600 flex items-center px-2 gap-1 overflow-x-auto custom-scrollbar relative shadow-inner">
                   {project.shots.length === 0 ? (
                      <div className="w-full flex items-center justify-center text-slate-600 text-xs font-mono uppercase tracking-widest">
                          <Film className="w-4 h-4 mr-2" />
                          无可用镜头
                      </div>
                   ) : (
                      project.shots.map((shot, idx) => {
                        const isDone = !!shot.interval?.videoUrl;
                        const isSelected = selectedShotIds.has(shot.id);
                        return (
                          <div
                            key={shot.id}
                            onClick={() => isDone && toggleShotSelection(shot.id)}
                            onMouseEnter={() => setFocusedShot({ shot, index: idx })}
                            onMouseLeave={() => setFocusedShot(null)}
                            className={`h-14 min-w-[18px] flex-1 rounded-[2px] transition-all relative group flex flex-col justify-end overflow-hidden cursor-pointer ${
                              isSelected
                                ? 'bg-slate-600/60 border-2 border-slate-400'
                                : isDone
                                  ? 'bg-slate-900/40 border border-slate-500/30 hover:bg-slate-500/40'
                                  : 'bg-slate-400 border border-slate-600 cursor-not-allowed opacity-50'
                            }`}
                            title={`镜头 ${idx+1}: ${shot.actionSummary}`}
                          >
                             {/* Mini Progress Bar inside timeline segment */}
                             {isDone && !isSelected && <div className="h-full w-full bg-slate-500/20" title={`镜头 ${idx+1}: ${shot.actionSummary}`}></div>}

                             {/* Selection Indicator */}
                             {isSelected && (
                               <div className="absolute inset-0 flex items-center justify-center">
                                 <Check className="w-4 h-4 text-slate-50" />
                               </div>
                             )}

                             {/* Hover Tooltip */}
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 whitespace-nowrap">
                                <div className="bg-slate-700 text-slate-50 text-[12px] px-2 py-1 rounded border border-slate-600 shadow-xl">
                                    镜头 {idx + 1}{isDone ? ' ✓' : ''}
                                </div>
                             </div>
                          </div>
                        )
                      })
                   )}
                </div>

                {/* Shot Summary Display */}
                <div className="mt-3 bg-slate-700 rounded-lg border border-slate-600 p-4 min-h-[80px] flex items-center justify-center">
                  {(() => {
                    const displayShot = focusedShot || (() => {
                      const firstSelectedShotId = Array.from(selectedShotIds)[0];
                      if (!firstSelectedShotId) return null;
                      const shot = project.shots.find(s => s.id === firstSelectedShotId);
                      if (!shot) return null;
                      const idx = project.shots.indexOf(shot);
                      return { shot, index: idx };
                    })();

                    if (!displayShot) {
                      return (
                        <div className="flex items-center gap-2 text-slate-600 text-xs font-mono uppercase tracking-widest">
                          <Film className="w-4 h-4" />
                          鼠标悬停或选中镜头查看详情
                        </div>
                      );
                    }

                    const isSelected = selectedShotIds.has(displayShot.shot.id);
                    return (
                      <div className="w-full text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Film className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">
                            镜头 {displayShot.index + 1}
                          </span>
                          {isSelected && (
                            <Check className="w-3 h-3 text-green-400" />
                          )}
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
                          {displayShot.shot.actionSummary}
                        </p>
                      </div>
                    );
                  })()}
                </div>
             </div>

             {/* Video Preview */}
               <div className="mb-4">
                 <div className="flex justify-between items-center mb-2 px-1">
                   <div className="flex items-center gap-2">
                     <span className="text-[12px] text-slate-600 font-bold uppercase tracking-widest">
                       {isPlayingSelected ? '播放选中镜头' : '成片预览'}
                     </span>
                     {isPlayingSelected && (
                       <span className="text-[11px] text-slate-400 font-mono bg-slate-500/10 px-2 py-0.5 rounded">
                         {currentPlayingShotIndex + 1} / {selectedShots.length}
                       </span>
                     )}
                   </div>
                   {isPlayingSelected && (
                     <button
                       onClick={handleStopPlayback}
                       className="text-[11px] text-red-400 hover:text-red-300 font-mono bg-red-500/10 px-2 py-1 rounded transition-colors"
                     >
                       停止播放
                     </button>
                   )}
                 </div>
                 <div className="w-full bg-slate-700 rounded-lg aspect-video bg-slate-700 rounded-lg overflow-hidden border border-slate-600 relative">
                   <video
                     ref={videoRef}
                     controls
                     autoPlay
                     className="w-full h-full object-cover"
                     src={isPlayingSelected ? selectedShots[currentPlayingShotIndex]?.interval?.videoUrl : project.mergedVideoUrl}
                     onEnded={isPlayingSelected ? handleVideoEnded : undefined}
                     onTimeUpdate={isPlayingSelected ? handleTimeUpdate : undefined}
                     key={isPlayingSelected ? selectedShots[currentPlayingShotIndex]?.id : 'merged'}
                   >
                     您的浏览器不支持视频播放。
                   </video>

                   {/* Custom Playback Control Bar for Selected Videos */}
                   {isPlayingSelected && (
                     <div className="absolute top-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-2 pb-2 px-4">
                       {/* Shot Indicator and Controls */}
                       <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2">
                           <Film className="w-3 h-3 text-slate-400" />
                           <span className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">
                             镜头 {project.shots.indexOf(selectedShots[currentPlayingShotIndex]) + 1}
                           </span>
                         </div>
                       </div>

                       {/* Total Progress Bar */}
                       <div className="space-y-1 relative">
                         {/* Individual Video Markers */}
                         <div className="h-1.5 bg-slate-700 rounded-full relative cursor-pointer overflow-hidden">
                           {selectedShots.map((shot, idx) => {
                             const startTime = selectedShots.slice(0, idx).reduce((acc, s) => acc + (s.interval?.duration || 5), 0);
                             const shotDuration = shot.interval?.duration || 5;
                             const widthPercent = (shotDuration / totalDuration) * 100;
                             const leftPercent = (startTime / totalDuration) * 100;
                             return (
                               <div
                                 key={shot.id}
                                 className={`absolute h-full rounded-l-sm rounded-r-sm ${
                                   idx < currentPlayingShotIndex
                                     ? 'bg-slate-500'
                                     : idx === currentPlayingShotIndex
                                       ? 'bg-slate-600'
                                       : 'bg-slate-600'
                                 }`}
                                 style={{
                                   left: `${leftPercent}%`,
                                   width: `${widthPercent}%`,
                                 }}
                               />
                             );
                           })}
                         </div>
                         {/* Clickable Progress Overlay */}
                         <div
                           onClick={handleProgressClick}
                           className="h-6 absolute top-1/2 -translate-y-1/2 left-0 right-0 cursor-pointer"
                           style={{ top: '0px' }}
                         />

                         {/* Time Display */}
                         <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                           <span>{Math.floor(totalCurrentTime / 60)}:{(totalCurrentTime % 60).toFixed(0).padStart(2, '0')}</span>
                           <span>{Math.floor(totalDuration / 60)}:{(totalDuration % 60).toFixed(0).padStart(2, '0')}</span>
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
                 {isPlayingSelected && selectedShots[currentPlayingShotIndex] && (
                   <div className="mt-2 bg-slate-800 border border-slate-600 rounded-lg p-3">
                     <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                       {selectedShots[currentPlayingShotIndex].actionSummary}
                     </p>
                   </div>
                 )}
               </div>

             {/* Merge Error Message */}
             {mergeError && (
               <div className="bg-red-900/10 border border-red-900/50 text-red-500 text-xs rounded p-3 flex items-center gap-2">
                 <BarChart3 className="w-4 h-4" />
                 {mergeError}
               </div>
             )}

             {/* Action Buttons */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <button
                  onClick={handlePlaySelected}
                  disabled={selectedShotIds.size === 0 || isPlayingSelected}
                  className={`h-12 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all border ${
                    selectedShotIds.size > 0 && !isPlayingSelected
                      ? 'bg-slate-600 text-slate-50 hover:bg-slate-500 border-slate-500 shadow-lg shadow-slate-600/20'
                      : 'bg-slate-900 text-slate-600 border-slate-600 cursor-not-allowed'
                  }`}>
                 {isPlayingSelected ? (
                   <>
                     <Loader2 className="w-4 h-4 animate-spin" />
                     播放中...
                   </>
                 ) : (
                   <>
                     <Film className="w-4 h-4" />
                     播放选中视频 ({selectedShotIds.size})
                   </>
                 )}
               </button>

               <button
                  onClick={handleMerge}
                  disabled={selectedShotIds.size === 0 || isMerging}
                  className={`h-12 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all border ${
                 selectedShotIds.size > 0 && !isMerging
                   ? 'bg-slate-800 text-slate-50 hover:bg-slate-400 border-white shadow-lg shadow-white/5'
                   : 'bg-slate-900 text-slate-600 border-slate-600 cursor-not-allowed'
               }`}>
                 {isMerging ? (
                   <>
                     <Loader2 className="w-4 h-4 animate-spin" />
                     合并中...
                   </>
                 ) : project.mergedVideoUrl ? (
                   <>
                     <CheckCircle className="w-4 h-4 text-green-500" />
                     重新合并
                   </>
                 ) : (
                   <>
                     <Film className="w-4 h-4" />
                     合并视频
                   </>
                 )}
               </button>

               <button
                  onClick={handleDownload}
                  disabled={!project.mergedVideoUrl}
                  className={`h-12 bg-slate-700 hover:bg-slate-800 text-slate-300 border border-slate-600 hover:border-slate-300 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all ${
                    !project.mergedVideoUrl ? 'cursor-not-allowed opacity-50' : ''
                  }`}>
                 <Download className="w-4 h-4" />
                 下载视频
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StageExport;