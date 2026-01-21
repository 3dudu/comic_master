import { AlertTriangle, Calendar, Check, ChevronRight, Download, Edit, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createNewProjectState, deleteProjectFromDB, exportProjectToFile, getAllProjectsMetadata, importProjectFromFile, saveProjectToDB } from '../services/storageService';
import { ProjectState } from '../types';

interface Props {
  onOpenProject: (project: ProjectState) => void;
}

const Dashboard: React.FC<Props> = ({ onOpenProject }) => {
  const [projects, setProjects] = useState<ProjectState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

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
        alert("删除项目失败");
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
      alert(error.message || '导入项目失败');
    } finally {
      setImporting(false);
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
      alert('更新项目名失败');
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

  return (
    <div className="min-h-screen bg-[#0e1229] text-slate-300 p-8 md:p-12 font-sans selection:bg-white/20">
      <div className="max-w-7xl mx-auto">
        <header className="mb-16 border-b border-slate-900 pb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-light text-white tracking-tight mb-2 flex items-center gap-3">
              项目库
              <span className="text-slate-800 text-lg">/</span>
              <span className="text-slate-600 text-sm font-mono tracking-widest uppercase">Projects Database</span>
            </h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={importing}
              className="group flex items-center gap-3 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              <span className="font-bold text-xs tracking-widest uppercase">{importing ? '导入中...' : '导入项目'}</span>
            </button>
            <button
              onClick={handleCreate}
              className="group flex items-center gap-3 px-6 py-3 bg-white text-black hover:bg-slate-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="font-bold text-xs tracking-widest uppercase">新建项目</span>
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
            <div 
              onClick={handleCreate}
              className="group cursor-pointer border border-slate-800 hover:border-slate-500 bg-[#0e0e28] flex flex-col items-center justify-center min-h-[240px] transition-all"
            >
              <div className="w-12 h-12 border border-slate-700 flex items-center justify-center mb-6 group-hover:bg-slate-800 transition-colors">
                <Plus className="w-5 h-5 text-slate-500 group-hover:text-white" />
              </div>
              <span className="text-slate-600 font-mono text-[12px] uppercase tracking-widest group-hover:text-slate-300">新建项目</span>
            </div>

            {/* Project List */}
            {projects.map((proj) => (
              <div 
                key={proj.id}
                onClick={() => onOpenProject(proj)}
                className="group bg-[#0e0e28] border border-slate-800 hover:border-slate-600 p-0 flex flex-col cursor-pointer transition-all relative overflow-hidden h-[240px]"
              >
                  {/* Delete Confirmation Overlay */}
                  {deleteConfirmId === proj.id && (
                    <div 
                        className="absolute inset-0 z-20 bg-[#0e0e28] flex flex-col items-center justify-center p-6 space-y-4 animate-in fade-in duration-200"
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <div className="w-10 h-10 bg-red-900/20 flex items-center justify-center rounded-full">
                           <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-bold text-xs uppercase tracking-widest">确认删除？</p>
                            <p className="text-slate-500 text-[12px] mt-1 font-mono">此操作无法撤销。</p>
                        </div>
                        <div className="flex gap-2 w-full pt-2">
                            <button 
                                onClick={cancelDelete}
                                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[12px] font-bold uppercase tracking-wider transition-colors border border-slate-800"
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
                  <div className="flex-1 p-6 relative flex flex-col">
                     {/* Edit Button */}
                     {editingProjectId !== proj.id ? (
                     <button
                        onClick={(e) => startEditing(e, proj)}
                        className="absolute top-4 right-20 opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-800 text-slate-600 hover:text-indigo-400 transition-all rounded-sm z-10"
                        title="编辑项目名"
                     >
                        <Edit className="w-4 h-4" />
                     </button>
                     ) : null}

                     {/* Export Button */}
                     {editingProjectId === null ? (
                     <button
                        onClick={(e) => handleExport(e, proj)}
                        className="absolute top-4 right-12 opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-800 text-slate-600 hover:text-indigo-400 transition-all rounded-sm z-10"
                        title="导出项目"
                     >
                        <Download className="w-4 h-4" />
                     </button>
                     ) : null}

                     {/* Delete Button */}
                     {editingProjectId === null ? (
                     <button
                        onClick={(e) => requestDelete(e, proj.id)}
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-800 text-slate-600 hover:text-red-400 transition-all rounded-sm z-10"
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
                              className="flex-1 bg-slate-900 border border-slate-700 text-white text-sm px-2 py-1 focus:outline-none focus:border-indigo-500"
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
                          <h3 className="text-sm font-bold text-white mb-2 line-clamp-1 tracking-wide">{proj.title}</h3>
                        )}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className="text-[11px] font-mono text-slate-500 border border-slate-800 px-1.5 py-0.5 uppercase tracking-wider">
                              {proj.stage === 'script' ? '剧本阶段' :
                               proj.stage === 'assets' ? '资产生成' :
                               proj.stage === 'director' ? '导演工作台' : '导出阶段'}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {proj.visualStyle && (
                              <span className="text-[11px] text-slate-600 bg-slate-900/50 border border-slate-800/50 px-1.5 py-0.5 rounded-full">
                                {proj.visualStyle}
                              </span>
                            )}
                            {proj.imageSize && (
                              <span className="text-[11px] text-slate-600 bg-slate-900/50 border border-slate-800/50 px-1.5 py-0.5 rounded-full font-mono">
                                {proj.imageSize}
                              </span>
                            )}
                            {proj.targetDuration && (
                              <span className="text-[11px] text-slate-600 bg-slate-900/50 border border-slate-800/50 px-1.5 py-0.5 rounded-full font-mono">
                                {proj.targetDuration}
                              </span>
                            )}
                        </div>
                        {proj.scriptData?.logline && (
                            <p className="text-[12px] text-slate-600 line-clamp-2 leading-relaxed font-mono border-l border-slate-800 pl-2">
                            {proj.scriptData.logline}
                            </p>
                        )}
                     </div>
                  </div>

                  <div className="px-6 py-3 border-t border-slate-900 flex items-center justify-between bg-[#090923]">
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono uppercase tracking-widest">
                        <Calendar className="w-3 h-3" />
                        {formatDate(proj.lastModified)}
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-700 group-hover:text-white transition-colors" />
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;