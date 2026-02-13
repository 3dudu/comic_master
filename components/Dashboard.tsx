import { AlertTriangle, Calendar, Check, ChevronRight, Copy, Download, Edit, Loader2, Plus, Power, Settings, Sparkles, Trash2, Upload } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createNewProjectState, deleteProjectFromDB, exportProjectToFile, getAllProjectsMetadata, importProjectFromFile, saveProjectToDB } from '../services/storageService';
import { ProjectState } from '../types';
import ApiKeyModal from './ApiKeyModal';
import { useDialog } from './dialog';
import ModalSettings from './ModalSettings';
import ProjectSettingsModal from './ProjectSettingsModal';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  onOpenProject: (project: ProjectState) => void;
  isMobile: boolean;
  onClearKey: () => void;
}

const Dashboard: React.FC<Props> = ({ onOpenProject, isMobile=false, onClearKey }) => {
  const dialog = useDialog();
  const [projects, setProjects] = useState<ProjectState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [currentProject, setCurrentProject] = useState<ProjectState | null>(null);
  const [project, setProject] = useState<ProjectState | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const list = await getAllProjectsMetadata();
      setProjects(list);
    } catch (e) {
      console.error("Failed to load projects", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);



  const handleCreate = () => {
    const newProject = createNewProjectState();
    onOpenProject(newProject);
  };

  const requestDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(null);
  };

  const confirmDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
        await deleteProjectFromDB(id);
        await loadProjects();
    } catch (error) {
        console.error("Delete failed", error);
        await dialog.alert({ title: '错误', message: '删除项目失败', type: 'error' });
    } finally {
        setDeleteConfirmId(null);
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const handleExport = (e: React.MouseEvent, proj: ProjectState) => {
    e.stopPropagation();
    exportProjectToFile(proj);
  };

  const handleImport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setImporting(true);
      const importedProject = await importProjectFromFile();
      // Generate new ID to avoid conflicts
      importedProject.id = 'proj_' + Date.now().toString(36);
      importedProject.createdAt = Date.now();
      importedProject.lastModified = Date.now();
      // Save to database
      await saveProjectToDB(importedProject);
      // Reload projects list
      await loadProjects();
      // Open the imported project
      onOpenProject(importedProject);
    } catch (error: any) {
      console.error('Import failed:', error);
      // 如果是用户取消，不显示错误提示
      if (error.message !== 'Import cancelled' && error.message !== 'No file selected') {
        await dialog.alert({ title: '错误', message: error.message || '导入项目失败', type: 'error' });
      }
    } finally {
      setImporting(false);
    }
  };
  
  const handleClearKey = () => {
      onClearKey();
  };

  const handleDuplicate = async (e: React.MouseEvent, proj: ProjectState) => {
    e.stopPropagation();
    try {
      // 创建项目副本
      const duplicatedProject = JSON.parse(JSON.stringify(proj));
      // 生成新的ID
      duplicatedProject.id = 'proj_' + Date.now().toString(36);
      // 修改标题，添加"副本"后缀
      const suffix = ':副本';
      duplicatedProject.title = proj.title.endsWith(suffix) ? proj.title : proj.title + suffix;
      // 更新时间戳
      duplicatedProject.createdAt = Date.now();
      duplicatedProject.lastModified = Date.now();
      // 保存到数据库
      await saveProjectToDB(duplicatedProject);
      // 重新加载项目列表
      await loadProjects();
    } catch (error) {
      console.error('Duplicate project failed:', error);
      await dialog.alert({ title: '错误', message: '复制项目失败', type: 'error' });
    }
  };

  const startEditing = (e: React.MouseEvent, proj: ProjectState) => {
    e.stopPropagation();
    setEditingProjectId(proj.id);
    setEditingTitle(proj.title);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(null);
    setEditingTitle('');
  };

  const saveTitle = async (e: React.MouseEvent | React.KeyboardEvent, proj: ProjectState) => {
    e.stopPropagation();
    if (!editingTitle.trim()) {
      cancelEditing(e as React.MouseEvent);
      return;
    }
    try {
      const updatedProject = { ...proj, title: editingTitle.trim() };
      await saveProjectToDB(updatedProject);
      await loadProjects();
    } catch (error) {
      console.error('Failed to update title:', error);
      await dialog.alert({ title: '错误', message: '更新项目名失败', type: 'error' });
    } finally {
      setEditingProjectId(null);
      setEditingTitle('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, proj: ProjectState) => {
    if (e.key === 'Enter') {
      saveTitle(e, proj);
    } else if (e.key === 'Escape') {
      cancelEditing(e as any);
    }
  };

  const openProjectSettings = (e: React.MouseEvent, proj: ProjectState) => {
    e.stopPropagation();
    setCurrentProject(proj);
    setShowProjectSettings(true);
  };

  const closeProjectSettings = () => {
    setShowProjectSettings(false);
    setCurrentProject(null);
  };

  const handleUpdateProject = async (updates: any) => {
    if (!currentProject) return;
    try {
      const updatedProject = { ...currentProject, ...updates, lastModified: Date.now() };
      await saveProjectToDB(updatedProject);
      await loadProjects();
      setCurrentProject(updatedProject);
    } catch (error) {
      console.error('Failed to update project:', error);
      await dialog.alert({ title: '错误', message: '更新项目失败', type: 'error' });
    }
  };

  // 从项目中收集所有可用的图片
  const getProjectImages = (proj: ProjectState): string[] => {
    const images: string[] = [];

    // 收集角色图片
    if (proj.scriptData?.characters) {
      proj.scriptData.characters.forEach(char => {
        // 基础形象
        if (char.referenceImage) {
          images.push(char.referenceImage);
        }
        // 角色变体
        if (char.variations) {
          char.variations.forEach(variation => {
            if (variation.referenceImage) {
              images.push(variation.referenceImage);
            }
          });
        }
      });
    }

    // 收集场景图片
    if (proj.scriptData?.scenes) {
      proj.scriptData.scenes.forEach(scene => {
        if (scene.referenceImage) {
          images.push(scene.referenceImage);
        }
      });
    }

    // 收集关键帧图片
    if (proj.shots) {
      proj.shots.forEach(shot => {
        if (shot.keyframes) {
          shot.keyframes.forEach(keyframe => {
            if (keyframe.imageUrl) {
              images.push(keyframe.imageUrl);
            }
          });
        }
      });
    }

    return images;
  };

  // 随机选择N张图片
  const getRandomImages = (images: string[], count: number): string[] => {
    if (images.length === 0) return [];
    
    // 如果图片数量不足，返回所有图片
    if (images.length <= count) {
      return [...images];
    }

    // 随机洗牌并取前N张
    const shuffled = [...images].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 p-8 pt-2 md:p-12 font-sans selection:bg-slate-800/20">
      <div className="max-w-7xl mx-auto">
        <header className={`border-b border-slate-900 pb-4 ${isMobile ? '' : 'mb-16 flex items-end'} justify-between`}>
          <div className='flex items-center justify-between'>
            <h1 className="text-3xl font-light text-slate-50 tracking-tight m-2 flex items-center gap-3">
              剧集库
            </h1>
<div className='flex items-center justify-between gap-3'>
            <ThemeToggle size="sm" className={`text-[12px] text-slate-600 hover:text-red-500 transition-colors uppercase font-mono tracking-widest`}/>
            <button onClick={handleClearKey} className={`z-50 text-[12px] flex items-center justify-center text-text-secondary w-8 h-8 p-1.5 transition-all duration-200 ease-in-out bg-bg-button rounded-lg text-slate-600 hover:text-red-500 transition-colors uppercase font-mono tracking-widest`}>
            <Power className="w-4 h-4" />
            </button>
</div>
          </div>
          <div className="flex gap-3 flex-end justify-end">
            <button
              onClick={handleCreate}
              className="group flex items-center gap-3 px-6 py-3 bg-slate-600/50 text-slate-50 hover:bg-slate-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {!isMobile && <span className="font-bold text-xs tracking-widest uppercase">新建项目</span>}
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="group flex items-center gap-3 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              {!isMobile && <span className="font-bold text-xs tracking-widest uppercase">{importing ? '导入中...' : '导入项目'}</span>}
            </button>
            <button
              onClick={() => setShowModelSettings(true)}
              className="group flex items-center gap-3 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-slate-50 transition-colors"
              title="模型管理"
            >
              <Sparkles className="w-4 h-4" />
              {!isMobile && <span className="font-bold text-xs tracking-widest uppercase">模型</span>}
            </button>
            <button
              onClick={() => setApiKeyModalOpen(true)}
              className="group flex items-center gap-3 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-slate-50 transition-colors"
              title="系统设置"
            >
              <Settings className="w-4 h-4" />
              {!isMobile && <span className="font-bold text-xs tracking-widest uppercase">设置</span>}
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            
            {/* Create New Card */}
            {(!isMobile || projects.length == 0) && 
            <div 
              onClick={handleCreate}
              className="group cursor-pointer border border-slate-600 hover:border-slate-300 bg-slate-800 flex flex-col items-center justify-center min-h-[280px] transition-all"
            >
              <div className="w-12 h-12 border border-slate-600 flex items-center justify-center mb-6 group-hover:bg-slate-800 transition-colors">
                <Plus className="w-5 h-5 text-slate-500 group-hover:text-slate-50" />
              </div>
              <span className="text-slate-400 font-mono text-[12px] uppercase tracking-widest group-hover:text-slate-300">新建项目</span>
            </div>
          }
            {/* Project List */}
            {projects.map((proj) => (
              <div 
                key={proj.id}
                onClick={() => onOpenProject(proj)}
                className="group bg-slate-800 border border-slate-600 hover:border-slate-300 p-0 flex flex-col cursor-pointer transition-all relative overflow-hidden h-[280px]"
              >
                  {/* Delete Confirmation Overlay */}
                  {deleteConfirmId === proj.id && (
                    <div 
                        className="absolute inset-0 z-20 bg-slate-800 flex flex-col items-center justify-center p-6 space-y-4 animate-in fade-in duration-200"
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <div className="w-10 h-10 bg-red-900/20 flex items-center justify-center rounded-full">
                           <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-slate-50 font-bold text-xs uppercase tracking-widest">确认删除？</p>
                            <p className="text-slate-500 text-[12px] mt-1 font-mono">此操作无法撤销。</p>
                        </div>
                        <div className="flex gap-2 w-full pt-2">
                            <button 
                                onClick={cancelDelete}
                                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-50 text-[12px] font-bold uppercase tracking-wider transition-colors border border-slate-600"
                            >
                                取消
                            </button>
                            <button 
                                onClick={(e) => confirmDelete(e, proj.id)}
                                className="flex-1 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-200 text-[12px] font-bold uppercase tracking-wider transition-colors border border-red-900/30"
                            >
                                删除
                            </button>
                        </div>
                    </div>
                  )}

                  {/* Normal Content */}
                  <div className="flex-1 px-6 pt-6 relative flex flex-col">
                     {/* Edit Button */}
                     {editingProjectId !== proj.id ? (
                     <button
                        onClick={(e) => openProjectSettings(e, proj)}
                        className="absolute top-4 right-20 group-hover:opacity-100 p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-400 transition-all rounded-sm z-10"
                        title="编辑项目"
                     >
                        <Edit className="w-4 h-4" />
                     </button>
                     ) : null}

                     {/* Duplicate Button */}
                     {editingProjectId === null ? (
                     <button
                        onClick={(e) => handleDuplicate(e, proj)}
                        className="absolute top-4 right-28 group-hover:opacity-100 p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-400 transition-all rounded-sm z-10"
                        title="复制项目"
                     >
                        <Copy className="w-4 h-4" />
                     </button>
                     ) : null}

                     {/* Export Button */}
                     {editingProjectId === null ? (
                     <button
                        onClick={(e) => handleExport(e, proj)}
                        className="absolute top-4 right-12 group-hover:opacity-100 p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-400 transition-all rounded-sm z-10"
                        title="导出项目"
                     >
                        <Download className="w-4 h-4" />
                     </button>
                     ) : null}

                     {/* Delete Button */}
                     {editingProjectId === null ? (
                     <button
                        onClick={(e) => requestDelete(e, proj.id)}
                        className="absolute top-4 right-4 group-hover:opacity-100 p-2 hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-all rounded-sm z-10"
                        title="删除项目"
                     >
                        <Trash2 className="w-4 h-4" />
                     </button>
                      ) : null}
                      
                     <div className="flex-1">
                        {editingProjectId === proj.id ? (
                          <div className="mb-2 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, proj)}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 bg-slate-900 border border-slate-600 text-slate-50 text-sm px-2 py-1 focus:outline-none focus:border-slate-500"
                              autoFocus
                            />
                            <button
                              onClick={(e) => saveTitle(e, proj)}
                              className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-green-400 transition-all rounded-sm"
                              title="保存"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <h3 className="text-sm font-bold text-slate-50 mb-2 line-clamp-1 tracking-wide">{proj.title}</h3>
                        )}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className="text-[11px] font-mono text-blue-500 border border-green-800 px-1.5 py-0.5 uppercase tracking-wider">
                              {proj.stage === 'script' ? '剧本阶段' :
                               proj.stage === 'assets' ? '资产生成' :
                               proj.stage === 'director' ? '导演工作台' : '导出阶段'}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {proj.visualStyle && (
                              <span className="text-[11px] text-green-600 bg-slate-900/50 border border-green-800/50 px-1.5 py-0.5 rounded-full">
                                {proj.visualStyle}
                              </span>
                            )}
                            {proj.imageSize && (
                              <span className="text-[11px] text-pink-600 bg-slate-900/50 border border-pink-800/50 px-1.5 py-0.5 rounded-full font-mono">
                                {proj.imageSize}
                              </span>
                            )}
                            {proj.targetDuration && (
                              <span className="text-[11px] text-yellow-600 bg-slate-900/50 border border-yellow-800/50 px-1.5 py-0.5 rounded-full font-mono">
                                {proj.targetDuration}
                              </span>
                            )}
                        </div>
                        {proj.scriptData?.logline && (
                            <p className="text-[12px] text-slate-500 line-clamp-2 leading-relaxed font-mono border-l border-slate-600 pl-2">
                            {proj.scriptData.logline}
                            </p>
                        )}

                         {/* 图片预览 */}
                  <div className="px-2 py-2 border-t border-slate-900 flex gap-2 items-center justify-center">
                    {(() => {
                      const projectImages = getRandomImages(getProjectImages(proj), 4);
                      return (
                        <div className="flex gap-2">
                          {projectImages.map((imgUrl, idx) => (
                            <div
                              key={idx}
                              className="w-14 h-14 bg-slate-900 rounded overflow-hidden flex-shrink-0 border border-slate-600 hover:border-slate-300 transition-colors cursor-pointer group/img"
                            >
                              <img
                                src={imgUrl}
                                alt={`Preview ${idx + 1}`}
                                className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-200"
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                     </div>
                  </div>

                  <div className="px-6 py-3 border-t border-slate-900 flex items-center justify-between bg-slate-700">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500/50 font-mono uppercase tracking-widest group-hover:text-slate-50 ">
                        <Calendar className="w-3 h-3" />
                        {formatDate(proj.lastModified)}
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-500/50 group-hover:text-slate-50 transition-colors" />
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Model Settings Modal */}
      <ModalSettings
        isOpen={showModelSettings}
        onClose={() => setShowModelSettings(false)}
        isMobile={isMobile}
      />

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
      />

      {/* Project Settings Modal */}
      <ProjectSettingsModal
        isOpen={showProjectSettings}
        onClose={closeProjectSettings}
        project={currentProject}
        updateProject={handleUpdateProject}
      />
    </div>
  );
};

export default Dashboard;