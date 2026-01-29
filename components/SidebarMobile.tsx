import { Aperture, ChevronLeft, Clapperboard, FileText, Film, Settings, Sparkles, Users } from 'lucide-react';
import React, { useState } from 'react';
import { ProjectState } from '../types';
import ModalSettings from './ModalSettings';
import ProjectSettingsModal from './ProjectSettingsModal';

interface SidebarMobileProps {
  currentStage: string;
  setStage: (stage: 'script' | 'assets' | 'director' | 'export') => void;
  onExit: () => void;
  projectName?: string;
  project?: ProjectState;
  updateProject?: (updates: Partial<ProjectState>) => void;
}

const SidebarMobile: React.FC<SidebarMobileProps> = ({ currentStage, setStage, onExit, projectName, project, updateProject }) => {
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);

  const navItems = [
    { id: 'script', label: '剧本', icon: FileText },
    { id: 'assets', label: '角色', icon: Users },
    { id: 'director', label: '导演', icon: Clapperboard },
    { id: 'export', label: '成片', icon: Film },
  ];

  return (
    <aside className="top-0 z-50 left-0 right-0 z-50 select-none bg-[#0e1229] border-b border-slate-800 flex flex-col">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-4 py-2">
        {/* 左侧：Logo 和 返回按钮 */}
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white text-black flex items-center justify-center flex-shrink-0">
              <Aperture className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-xs font-bold text-white tracking-wider uppercase">AI漫剧工场</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{projectName || '未命名项目'}</p>
            </div>
          </div>
        </div>

        {/* 右侧：设置和项目设置按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProjectSettings(true)}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title="项目设置"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowModelSettings(true)}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title="模型管理"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 导航 */}
      <nav className="fixed bottom-0 left-0 right-0 h-30 z-50 flex border-t border-slate-800 items-center justify-around px-4 py-2 overflow-x-auto select-none bg-[#0e1229] border-b border-slate-800">
        {navItems.map((item) => {
          const isActive = currentStage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setStage(item.id as any)}
              className={`
                flex flex-col items-center px-4 py-2 min-w-[60px] rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
              <span className="text-[10px] font-medium tracking-wider uppercase mt-1">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Model Settings Modal */}
      <ModalSettings
        isOpen={showModelSettings}
        onClose={() => setShowModelSettings(false)}
        isMobile={true}
      />

      {/* Project Settings Modal */}
      <ProjectSettingsModal
        isOpen={showProjectSettings}
        onClose={() => setShowProjectSettings(false)}
        project={project}
        updateProject={updateProject}
      />
    </aside>
  );
};

export default SidebarMobile;
