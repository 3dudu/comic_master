import { CheckCircle, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ApiKeyModal from './components/ApiKeyModal'; // 新增
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import SidebarMobile from './components/SidebarMobile';
import StageAssets from './components/StageAssets';
import StageDirector from './components/StageDirector';
import StageExport from './components/StageExport';
import StageScript from './components/StageScript';
import { DialogProvider } from './components/dialog';

import { initializeCozeConfig } from './services/cozeService';
import { setGlobalApiKey } from './services/doubaoService';
import { ModelService } from './services/modelService';
import { saveProjectToDB } from './services/storageService';
import { ProjectState } from './types';

function App() {
  const [project, setProject] = useState<ProjectState | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [cozeWorkflowId, setCozeWorkflowId] = useState('');
  const [cozeApiKey, setCozeApiKey] = useState('');
  const [fileUploadServiceUrl, setFileUploadServiceUrl] = useState('');
  const [fileAccessDomain, setFileAccessDomain] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMd, setIsMd] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Ref to hold debounce timer
  const saveTimeoutRef = useRef<any>(null);

  // Load API Key from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('cinegen_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setGlobalApiKey(storedKey);
    }
    const storedCozeWorkflowId = localStorage.getItem('cinegen_coze_workflow_id');
    if (storedCozeWorkflowId) {
      setCozeWorkflowId(storedCozeWorkflowId);
    }
    const storedCozeApiKey = localStorage.getItem('cinegen_coze_api_key');
    if (storedCozeApiKey) {
      setCozeApiKey(storedCozeApiKey);
    }
    const storedFileUploadServiceUrl = localStorage.getItem('cinegen_file_upload_service_url');
    if (storedFileUploadServiceUrl) {
      setFileUploadServiceUrl(storedFileUploadServiceUrl);
    }
    const storedFileAccessDomain = localStorage.getItem('cinegen_file_access_domain');
    if (storedFileAccessDomain) {
      setFileAccessDomain(storedFileAccessDomain);
    }
    // Initialize Coze service config
    initializeCozeConfig();
    // Initialize ModelService (包括MinIO)
    ModelService.initialize().catch(err => {
      console.error('ModelService初始化失败:', err);
    });

    // 定义媒体查询
    let mdQuery = window.matchMedia('(max-width: 768px)');
    let lgQuery = window.matchMedia('(min-width: 1280px)');
    // 更新状态的函数
    const updateBreakpoints = () => {

      // 定义媒体查询
      mdQuery = window.matchMedia('(max-width: 768px)');
      lgQuery = window.matchMedia('(min-width: 1280px)');
      console.log('md (mobile):', mdQuery.matches);
      console.log('lg (desktop):', lgQuery.matches);
      setIsMobile(mdQuery.matches);
      setIsMd(!lgQuery.matches);
    };

    // 初始化执行+添加监听
    updateBreakpoints();
    mdQuery.addListener(updateBreakpoints);
    lgQuery.addListener(updateBreakpoints);

    // 卸载移除监听
    return () => {
      mdQuery.removeListener(updateBreakpoints);
      lgQuery.removeListener(updateBreakpoints);
    };
  }, []);

  // Auto-save logic
  useEffect(() => {
    if (!project) return;

    setSaveStatus('unsaved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await saveProjectToDB(project);
        setSaveStatus('saved');
      } catch (e) {
        console.error("Auto-save failed", e);
      }
    }, 1000); // Debounce 1s

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [project]);

  const handleSaveKey = (newKey: string, newCozeWorkflowId?: string, newCozeApiKey?: string, newFileUploadServiceUrl?: string, newFileAccessDomain?: string) => {
    if (!newKey.trim()) return;
    setApiKey(newKey);
    setGlobalApiKey(newKey);
    localStorage.setItem('cinegen_api_key', newKey);
    if (newCozeWorkflowId !== undefined) {
      setCozeWorkflowId(newCozeWorkflowId);
      localStorage.setItem('cinegen_coze_workflow_id', newCozeWorkflowId);
    }
    if (newCozeApiKey !== undefined) {
      setCozeApiKey(newCozeApiKey);
      localStorage.setItem('cinegen_coze_api_key', newCozeApiKey);
    }
    if (newFileUploadServiceUrl !== undefined) {
      setFileUploadServiceUrl(newFileUploadServiceUrl);
      localStorage.setItem('cinegen_file_upload_service_url', newFileUploadServiceUrl);
    }
    if (newFileAccessDomain !== undefined) {
      setFileAccessDomain(newFileAccessDomain);
      localStorage.setItem('cinegen_file_access_domain', newFileAccessDomain);
    }
  };

  const handleClearKey = () => {
      localStorage.removeItem('cinegen_api_key');
      setApiKey('');
      setGlobalApiKey('');
      setProject(null);
  };

  const updateProject = (updates: Partial<ProjectState>) => {
    if (!project) return;
    setProject(prev => prev ? ({ ...prev, ...updates }) : null);
  };

  const setStage = (stage: 'script' | 'assets' | 'director' | 'export') => {
    updateProject({ stage });
  };

  const handleOpenProject = (proj: ProjectState) => {
    // 设置项目的模型供应商配置
    ModelService.setCurrentProjectProviders(proj.modelProviders);
    setProject(proj);
  };

  const handleExitProject = async () => {
    // Force save before exiting
    if (project) {
        await saveProjectToDB(project);
    }
    // 清除项目供应商配置
    ModelService.setCurrentProjectProviders(null);
    setProject(null);
  };

  const renderStage = () => {
    if (!project) return null;
    switch (project.stage) {
      case 'script':
        return <StageScript project={project} updateProject={updateProject} isMobile={isMobile} />;
      case 'assets':
        return <StageAssets project={project} updateProject={updateProject} />;
      case 'director':
        return <StageDirector project={project} updateProject={updateProject} isMobile={isMobile} />;
      case 'export':
        return <StageExport project={project} updateProject={updateProject} />;
      default:
        return <div className="text-white">未知阶段</div>;
    }
  };

  // API Key Entry Screen (Industrial Design)
  if (!apiKey) {
    return (
      <DialogProvider>
        <div className="h-screen bg-[#0e1229] flex items-center justify-center p-8 relative overflow-hidden">
          {/* Background Accents */}
          <div className="absolute top-0 right-0 p-64 bg-indigo-900/5 blur-[150px] rounded-full pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 p-48 bg-slate-900/10 blur-[120px] rounded-full pointer-events-none"></div>

          <ApiKeyModal
            isOpen={true}
            onClose={() => {}}
            onSave={handleSaveKey}
            currentKey={''}
            cozeWorkflowId={cozeWorkflowId}
            cozeApiKey={cozeApiKey}
            currentFileUploadServiceUrl={fileUploadServiceUrl}
            currentFileAccessDomain={fileAccessDomain}
          />
        </div>
      </DialogProvider>
    );
  }

  // Dashboard View
  if (!project) {
    return (
      <DialogProvider>
        <>
        {!isMobile &&
          <button onClick={handleClearKey} className="fixed top-4 right-4 z-50 text-[12px] text-slate-600 hover:text-red-500 transition-colors uppercase font-mono tracking-widest">
            退出
          </button>
        }
          <Dashboard onOpenProject={handleOpenProject} isMobile={isMobile} />
        </>
      </DialogProvider>
    );
  }

  // Workspace View
  return (
    <DialogProvider>
      <div className={`${isMobile?'':'flex'} h-screen overflow-hidden bg-[#0c1022] min-h-screen font-sans text-gray-100 selection:bg-indigo-500/30`} style={{paddingTop: 'env(safe-area-inset-top)'}}>
        {isMobile ? (
          <SidebarMobile
            currentStage={project.stage}
            setStage={setStage}
            onExit={handleExitProject}
            onOpenSettings={() => setShowSettings(true)}
            projectName={project.title}
            project={project}
            updateProject={updateProject}
          />
        ) : (
          <Sidebar
            currentStage={project.stage}
            setStage={setStage}
            onExit={handleExitProject}
            onOpenSettings={() => setShowSettings(true)}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            collapsed={isMd||sidebarCollapsed}
            projectName={project.title}
            project={project}
            updateProject={updateProject}
          />
        )}

      <main className={`transition-allduration-300 ease-in-out ${isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-20' : 'xl:ml-72 md:ml-20')} flex-1 h-screen overflow-hidden relative`}
      style={ isMobile ? { paddingBottom: 'calc(120px + env(safe-area-inset-top))'} : {}}>
        {renderStage()}
        {showSettings && (
          <>
  <ApiKeyModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
    onSave={handleSaveKey}
    currentKey={apiKey}
    cozeWorkflowId={cozeWorkflowId}
    cozeApiKey={cozeApiKey}
    currentFileUploadServiceUrl={fileUploadServiceUrl}
    currentFileAccessDomain={fileAccessDomain}
          />
        {/* Save Status Indicator */}
        <div className="relative top-4 right-6 pointer-events-none opacity-50 flex items-center gap-2 text-xs font-mono text-slate-400 bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm z-50">
           {saveStatus === 'saving' ? (
             <>
               <Save className="w-3 h-3 animate-pulse" />
               保存中...
             </>
           ) : (
             <>
               <CheckCircle className="w-3 h-3 text-green-500" />
               已保存
             </>
           )}
        </div>
        </>
        )}
      </main>
      
      </div>
    </DialogProvider>
  );
}

export default App;