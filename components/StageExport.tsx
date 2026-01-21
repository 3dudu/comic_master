import { BarChart3, CheckCircle, Clock, Download, Film, Layers, Loader2, Share2 } from 'lucide-react';
import React, { useState } from 'react';
import { mergeVideos } from '../services/cozeService';
import { ProjectState } from '../types';

interface Props {
  project: ProjectState;
  updateProject: (updates: Partial<ProjectState>) => void;
}

const StageExport: React.FC<Props> = ({ project, updateProject }) => {
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const completedShots = project.shots.filter(s => s.interval?.videoUrl);
  const totalShots = project.shots.length;
  const progress = totalShots > 0 ? Math.round((completedShots.length / totalShots) * 100) : 0;

  // Calculate total duration roughly
  const estimatedDuration = project.shots.reduce((acc, s) => acc + (s.interval?.duration || 3), 0);

  const handleMerge = async () => {
    if (completedShots.length === 0) return;

    setIsMerging(true);
    setMergeError(null);

    try {
      // 收集所有已完成视频的 URL
      const videoUrls = completedShots
        .map(shot => shot.interval?.videoUrl)
        .filter((url): url is string => !!url);

      console.log("开始合并视频...", videoUrls.length, "个视频片段");

      // 调用 Coze API 合并视频
      const mergedUrl = await mergeVideos(videoUrls);

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

  return (
    <div className="flex flex-col h-full bg-[#0e1229] overflow-hidden">
      
      {/* Header - Consistent with Director */}
      <div className="h-16 border-b border-slate-800 bg-[#0e1230] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-3">
                  <Film className="w-5 h-5 text-indigo-500" />
                  成片与导出
                  <span className="text-xs text-slate-600 font-mono font-normal uppercase tracking-wider bg-black/30 px-2 py-1 rounded">Rendering & Export</span>
              </h2>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[12px] text-slate-500 font-mono uppercase bg-slate-900 border border-slate-800 px-2 py-1 rounded">
               Status: {progress === 100 ? 'READY' : 'IN PROGRESS'}
             </span>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 md:p-12">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Main Status Panel */}
          <div className="bg-[#0c0c2d] border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden group">
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 p-48 bg-indigo-900/5 blur-[120px] rounded-full pointer-events-none"></div>
             <div className="absolute bottom-0 left-0 p-32 bg-emerald-900/5 blur-[100px] rounded-full pointer-events-none"></div>

             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 relative z-10 gap-6">
               <div>
                 <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{project?.title || '未命名项目'}</h3>
                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-400 text-[12px] rounded uppercase font-mono tracking-wider">Master Sequence</span>
                 </div>
                 <div className="flex items-center gap-6 mt-3">
                    <div className="flex flex-col">
                        <span className="text-[11px] text-slate-600 uppercase tracking-widest font-bold mb-0.5">Shots</span>
                        <span className="text-sm font-mono text-slate-300">{project.shots.length}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <div className="flex flex-col">
                        <span className="text-[11px] text-slate-600 uppercase tracking-widest font-bold mb-0.5">Est. Duration</span>
                        <span className="text-sm font-mono text-slate-300">~{estimatedDuration}s</span>
                    </div>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <div className="flex flex-col">
                        <span className="text-[11px] text-slate-600 uppercase tracking-widest font-bold mb-0.5">Target</span>
                        <span className="text-sm font-mono text-slate-300">{project.targetDuration}</span>
                    </div>
                 </div>
               </div>
               
               <div className="text-right bg-black/20 p-4 rounded-lg border border-white/5 backdrop-blur-sm min-w-[160px]">
                 <div className="flex items-baseline justify-end gap-1 mb-1">
                     <span className="text-3xl font-mono font-bold text-indigo-400">{progress}</span>
                     <span className="text-sm text-slate-500">%</span>
                 </div>
                 <div className="text-[12px] text-slate-500 uppercase tracking-widest flex items-center justify-end gap-2">
                    {progress === 100 ? <CheckCircle className="w-3 h-3 text-green-500" /> : <BarChart3 className="w-3 h-3" />}
                    Render Status
                 </div>
               </div>
             </div>

             {/* Timeline Visualizer Strip */}
             <div className="mb-10">
                <div className="flex justify-between text-[12px] text-slate-600 font-mono uppercase tracking-widest mb-2 px-1">
                    <span>Sequence Map</span>
                    <span>TC 00:00:00:00</span>
                </div>
                <div className="h-20 bg-[#090923] rounded-lg border border-slate-800 flex items-center px-2 gap-1 overflow-x-auto custom-scrollbar relative shadow-inner">
                   {project.shots.length === 0 ? (
                      <div className="w-full flex items-center justify-center text-slate-800 text-xs font-mono uppercase tracking-widest">
                          <Film className="w-4 h-4 mr-2" />
                          No Shots Available
                      </div>
                   ) : (
                      project.shots.map((shot, idx) => {
                        const isDone = !!shot.interval?.videoUrl;
                        return (
                          <div 
                            key={shot.id} 
                            className={`h-14 min-w-[4px] flex-1 rounded-[2px] transition-all relative group flex flex-col justify-end overflow-hidden ${
                              isDone
                                ? 'bg-indigo-900/40 border border-indigo-500/30 hover:bg-indigo-500/40' 
                                : 'bg-slate-900 border border-slate-800 hover:bg-slate-800'
                            }`}
                            title={`Shot ${idx+1}: ${shot.actionSummary}`}
                          >
                             {/* Mini Progress Bar inside timeline segment */}
                             {isDone && <div className="h-full w-full bg-indigo-500/20"></div>}
                             
                             {/* Hover Tooltip */}
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 whitespace-nowrap">
                                <div className="bg-black text-white text-[12px] px-2 py-1 rounded border border-slate-700 shadow-xl">
                                    Shot {idx + 1}
                                </div>
                             </div>
                          </div>
                        )
                      })
                   )}
                </div>
             </div>

             {/* Action Buttons */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <button
                  onClick={handleMerge}
                  disabled={progress < 100 || isMerging || !!project.mergedVideoUrl}
                  className={`h-12 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all border ${
                 progress === 100 && !isMerging && !project.mergedVideoUrl
                   ? 'bg-white text-black hover:bg-slate-200 border-white shadow-lg shadow-white/5'
                   : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
               }`}>
                 {isMerging ? (
                   <>
                     <Loader2 className="w-4 h-4 animate-spin" />
                     合并中...
                   </>
                 ) : project.mergedVideoUrl ? (
                   <>
                     <CheckCircle className="w-4 h-4 text-green-500" />
                     已合并
                   </>
                 ) : (
                   <>
                     <Download className="w-4 h-4" />
                     合并视频
                   </>
                 )}
               </button>

               <button
                  onClick={handleDownload}
                  disabled={!project.mergedVideoUrl}
                  className={`h-12 bg-[#0e1230] hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all ${
                    !project.mergedVideoUrl ? 'cursor-not-allowed opacity-50' : ''
                  }`}>
                 <Download className="w-4 h-4" />
                 Download Master (.mp4)
               </button>
             </div>

             {/* Video Preview */}
             {project.mergedVideoUrl && (
               <div className="mt-8">
                 <div className="flex justify-between items-center mb-2 px-1">
                   <span className="text-[12px] text-slate-600 font-bold uppercase tracking-widest">Video Preview</span>
                   <span className="text-[12px] text-slate-500 font-mono">Ready to download</span>
                 </div>
                 <div className="w-full bg-black rounded-lg overflow-hidden border border-slate-800">
                   <video
                     controls
                     className="w-full"
                     src={project.mergedVideoUrl}
                   >
                     您的浏览器不支持视频播放。
                   </video>
                 </div>
               </div>
             )}

             {/* Merge Error Message */}
             {mergeError && (
               <div className="bg-red-900/10 border border-red-900/50 text-red-500 text-xs rounded p-3 flex items-center gap-2">
                 <BarChart3 className="w-4 h-4" />
                 {mergeError}
               </div>
             )}
          </div>

          {/* Secondary Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 bg-[#0c0c2d] border border-slate-800 rounded-xl hover:border-slate-600 transition-colors group cursor-pointer flex flex-col justify-between h-32">
                  <Layers className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 mb-4 transition-colors" />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Source Assets</h4>
                    <p className="text-[12px] text-slate-500">Download all generated images and raw video clips.</p>
                  </div>
              </div>
              <div className="p-5 bg-[#0c0c2d] border border-slate-800 rounded-xl hover:border-slate-600 transition-colors group cursor-pointer flex flex-col justify-between h-32">
                  <Share2 className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 mb-4 transition-colors" />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Share Project</h4>
                    <p className="text-[12px] text-slate-500">Create a view-only link for client review.</p>
                  </div>
              </div>
              <div className="p-5 bg-[#0c0c2d] border border-slate-800 rounded-xl hover:border-slate-600 transition-colors group cursor-pointer flex flex-col justify-between h-32">
                  <Clock className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 mb-4 transition-colors" />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Render Logs</h4>
                    <p className="text-[12px] text-slate-500">View generation history and token usage.</p>
                  </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StageExport;