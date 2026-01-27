import { CheckCircle, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ApiKeyModal from './components/ApiKeyModal'; // 新增
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import StageAssets from './components/StageAssets';
import StageDirector from './components/StageDirector';
import StageExport from './components/StageExport';
import StageScript from './components/StageScript';

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
        return <StageScript project={project} updateProject={updateProject} />;
      case 'assets':
        return <StageAssets project={project} updateProject={updateProject} />;
      case 'director':
        return <StageDirector project={project} updateProject={updateProject} />;
      case 'export':
        return <StageExport project={project} updateProject={updateProject} />;
      default:
        return <div className="text-white">未知阶段</div>;
    }
  };

  // API Key Entry Screen (Industrial Design)
  if (!apiKey) {
    return (
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
          providerName="火山引擎 / 豆包"
          providerDescription="本应用需要火山引擎的 API 访问权限。请确保您的 API Key 已开通相应的服务权限。"
          documentationUrl="https://www.volcengine.com/docs/82379"
        />
      </div>
    );
  }

  // Dashboard View
  if (!project) {
    return (
       <>
         <button onClick={handleClearKey} className="fixed top-4 right-4 z-50 text-[12px] text-slate-600 hover:text-red-500 transition-colors uppercase font-mono tracking-widest">
            Sign Out
         </button>
         <Dashboard onOpenProject={handleOpenProject} />
       </>
    );
  }

  // Workspace View
  return (
    <div className="flex h-screen bg-[#0e1229] font-sans text-gray-100 selection:bg-indigo-500/30">
      <Sidebar
        currentStage={project.stage}
        setStage={setStage}
        onExit={handleExitProject}
        onOpenSettings={() => setShowSettings(true)}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        collapsed={sidebarCollapsed}
        projectName={project.title}
        project={project}
        updateProject={updateProject}
      />

      <main className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'ml-20' : 'ml-72'} flex-1 h-screen overflow-hidden relative`}>
        {renderStage()}
        {showSettings && (
  <ApiKeyModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
    onSave={handleSaveKey}
    currentKey={apiKey}
    cozeWorkflowId={cozeWorkflowId}
    cozeApiKey={cozeApiKey}
    currentFileUploadServiceUrl={fileUploadServiceUrl}
    currentFileAccessDomain={fileAccessDomain}
    providerName="火山引擎 / 豆包"
    providerDescription="本应用需要火山引擎的 API 访问权限。请确保您的 API Key 已开通相应的服务权限。"
    documentationUrl="https://www.volcengine.com/docs/82379"
          />
        )}
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
      </main>
      
      <div className="lg:hidden fixed inset-0 bg-black z-[100] flex items-center justify-center p-8 text-center">
        <p className="text-slate-500">为了获得最佳体验，请使用桌面浏览器访问。</p>
      </div>
    </div>
  );
}

export default App;