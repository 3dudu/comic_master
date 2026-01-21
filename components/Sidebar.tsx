import { Aperture, ChevronLeft, Clapperboard, FileText, Film, Settings, Users } from 'lucide-react';
import React from 'react';

interface SidebarProps {
  currentStage: string;
  setStage: (stage: 'script' | 'assets' | 'director' | 'export') => void;
  onExit: () => void;
  onOpenSettings: () => void;  // 添加这个属性
  projectName?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentStage, setStage, onExit, onOpenSettings, projectName }) => {
  const navItems = [
    { id: 'script', label: '剧本与故事', icon: FileText, sub: 'Phase 01' },
    { id: 'assets', label: '角色与场景', icon: Users, sub: 'Phase 02' },
    { id: 'director', label: '导演工作台', icon: Clapperboard, sub: 'Phase 03' },
    { id: 'export', label: '成片与导出', icon: Film, sub: 'Phase 04' },
  ];

  return (
    <aside className="w-72 bg-[#201F3E] border-r border-zinc-800 h-screen fixed left-0 top-0 flex flex-col z-50 select-none">
      {/* Header */}
      <div className="p-6 border-b border-zinc-900">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-white text-black flex items-center justify-center flex-shrink-0">
            <Aperture className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-white tracking-wider uppercase">AI漫剧工场</h1>
            <p className="text-[12px] text-zinc-500 uppercase tracking-widest">Studio Pro</p>
          </div>
        </div>

        <button 
          onClick={onExit}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-mono uppercase tracking-wide group"
        >
          <ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
          返回项目列表
        </button>
      </div>

      {/* Project Status */}
      <div className="px-6 py-4 border-b border-zinc-900">
         <div className="text-[12px] text-zinc-600 uppercase tracking-widest mb-1">当前项目</div>
         <div className="text-sm font-medium text-zinc-200 truncate font-mono">{projectName || '未命名项目'}</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = currentStage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setStage(item.id as any)}
              className={`w-full flex items-center justify-between px-6 py-4 transition-all duration-200 group relative border-l-2 ${
                isActive 
                  ? 'border-white bg-zinc-900/50 text-white' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                <span className="font-medium text-xs tracking-wider uppercase">{item.label}</span>
              </div>
              <span className={`text-[12px] font-mono ${isActive ? 'text-zinc-400' : 'text-zinc-700'}`}>{item.sub}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-zinc-900">
        <button 
          onClick={onOpenSettings}
          className="flex items-center justify-between text-zinc-600 hover:text-white cursor-pointer transition-colors w-full"
        >
          <span className="font-mono text-[12px] uppercase tracking-widest">系统设置</span>
          <Settings className="w-4 h-4" />
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;