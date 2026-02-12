// components/ApiKeyModal.tsx
import { ArrowRight, Key, ShieldCheck, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (key: string, cozeWorkflowId?: string, cozeApiKey?: string, fileUploadServiceUrl?: string, fileAccessDomain?: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [inputKey, setInputKey] = useState('');
  const [inputCozeWorkflowId, setInputCozeWorkflowId] = useState('');
  const [inputCozeApiKey, setInputCozeApiKey] = useState('');
  const [inputFileUploadServiceUrl, setInputFileUploadServiceUrl] = useState('');
  const [inputFileAccessDomain, setInputFileAccessDomain] = useState('');

  // 从 localStorage 加载配置
  useEffect(() => {
    if (isOpen) {
      const apiKey = localStorage.getItem('cinegen_api_key') || '';
      const cozeWorkflowId = localStorage.getItem('cinegen_coze_workflow_id') || '';
      const cozeApiKey = localStorage.getItem('cinegen_coze_api_key') || '';
      const fileUploadServiceUrl = localStorage.getItem('cinegen_file_upload_service_url') || process.env.OSS_UP_ENDPOINT || '';
      const fileAccessDomain = localStorage.getItem('cinegen_file_access_domain') || process.env.OSS_ACCESS_ENDPOINT || '';

      setInputKey(apiKey);
      setInputCozeWorkflowId(cozeWorkflowId);
      setInputCozeApiKey(cozeApiKey);
      setInputFileUploadServiceUrl(fileUploadServiceUrl);
      setInputFileAccessDomain(fileAccessDomain);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (inputKey.trim()) {
      // 保存到 localStorage
      localStorage.setItem('cinegen_api_key', inputKey.trim());
      if (inputCozeWorkflowId.trim()) localStorage.setItem('cinegen_coze_workflow_id', inputCozeWorkflowId.trim());
      if (inputCozeApiKey.trim()) localStorage.setItem('cinegen_coze_api_key', inputCozeApiKey.trim());
      if (inputFileUploadServiceUrl.trim()) localStorage.setItem('cinegen_file_upload_service_url', inputFileUploadServiceUrl.trim());
      if (inputFileAccessDomain.trim()) localStorage.setItem('cinegen_file_access_domain', inputFileAccessDomain.trim());

      // 初始化 Coze 配置
      if (typeof window !== 'undefined' && (window as any).initializeCozeConfig) {
        (window as any).initializeCozeConfig();
      }

      // 调用外部回调（如果有）
      if (onSave) {
        onSave(
          inputKey.trim(),
          inputCozeWorkflowId.trim(),
          inputCozeApiKey.trim(),
          inputFileUploadServiceUrl.trim(),
          inputFileAccessDomain.trim()
        );
      }

      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-700/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="w-full max-w-md bg-slate-600/80 border border-slate-600 p-8 rounded-xl shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 absolute top-4 right-4 text-slate-400 hover:bg-slate-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8 border-b border-slate-900 pb-6">
           <div className="w-10 h-10 bg-slate-800 text-slate-50 flex items-center justify-center">
              <Key className="w-5 h-5" />
           </div>
           <div>
              <h1 className="text-xl font-bold text-slate-50 tracking-wide">API 配置</h1>
           </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="max-h-[50vh] overflow-y-auto rounded-lg px-4"> 
           <div>
             <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">
               火山引擎 / 豆包 API Key
             </label>
             <input
               type="password"
               value={inputKey}
               onChange={(e) => setInputKey(e.target.value)}
               placeholder="Enter your API Key..."
               className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-4 py-3 text-sm rounded-lg focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-900 transition-all font-mono placeholder:text-slate-400"
             />
             <p className="mt-3 text-[12px] text-slate-400 leading-relaxed">
               本应用默认使用火山引擎的大模型 API 。请确保您的 API Key 已开通相应的服务权限。
               <a
                 href="https://www.volcengine.com/docs/82379"
                 target="_blank"
                 rel="noreferrer"
                 className="text-slate-400 hover:underline ml-1"
               >
                 查看文档
               </a>
             </p>
           </div>
           {/* Current Key Status */}
           {inputKey && (
            <>
            <div className="flex items-center gap-2 text-[12px] text-slate-500 bg-slate-900/50 p-3 rounded-lg">
               <ShieldCheck className="w-3 h-3 text-green-500" />
               <span className="font-mono">
                 API Key 已配置: {inputKey.substring(0, 8)}...
               </span>
             </div>
           <div>
             <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2 mt-2">
               Coze 工作流 ID
             </label>
             <input
               type="text"
               value={inputCozeWorkflowId}
               onChange={(e) => setInputCozeWorkflowId(e.target.value)}
               placeholder="Enter Coze Workflow ID..."
               className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-4 py-3 text-sm rounded-lg focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-900 transition-all font-mono placeholder:text-slate-400"
             />
             <p className="mt-3 text-[12px] text-slate-400 leading-relaxed">
               配置 Coze 工作流 ID 用于等功能。
             </p>
           </div>

           <div>
             <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2 mt-2">
               Coze API Key
             </label>
             <input
               type="password"
               value={inputCozeApiKey}
               onChange={(e) => setInputCozeApiKey(e.target.value)}
               placeholder="Enter Coze API Key..."
               className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-4 py-3 text-sm rounded-lg focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-900 transition-all font-mono placeholder:text-slate-400"
             />
             <p className="mt-3 text-[12px] text-slate-400 leading-relaxed">
               本应用需要 Coze 的 API 访问权限。
               <a
                 href="https://www.coze.cn/docs"
                 target="_blank"
                 rel="noreferrer"
                 className="text-slate-400 hover:underline ml-1"
               >
                 查看文档
               </a>
             </p>
           </div>

           <div>
             <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2 mt-2">
               文件上传服务地址
             </label>
             <input
               type="text"
               value={inputFileUploadServiceUrl}
               onChange={(e) => setInputFileUploadServiceUrl(e.target.value)}
               placeholder="https://apppub.good365.net:6443/apppub_api/thirdparty/upload"
               className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-4 py-3 text-sm rounded-lg focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-900 transition-all font-mono placeholder:text-slate-400"
             />
             <p className="mt-3 text-[12px] text-slate-400 leading-relaxed">
               配置后，AI 生成的图片和视频将上传到此服务。
               <span className="text-slate-400">（可选）</span>
             </p>
           </div>

           <div>
             <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2 mt-2">
               文件访问域名
             </label>
             <input
               type="text"
               value={inputFileAccessDomain}
               onChange={(e) => setInputFileAccessDomain(e.target.value)}
               placeholder="ofs.good365.net:6443"
               className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-4 py-3 text-sm rounded-lg focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-900 transition-all font-mono placeholder:text-slate-400"
             />
             <p className="mt-3 text-[12px] text-slate-400 leading-relaxed">
               上传后的文件将使用此域名访问，不包含协议头。
               <span className="text-slate-400">（可选）</span>
             </p>
           </div>
             </>
           )}
          </div>
           <button
             onClick={handleSave}
             disabled={!inputKey.trim()}
             className="w-full py-3 bg-slate-700 text-slate-50 font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-slate-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             保存配置 <ArrowRight className="w-3 h-3" />
           </button>

           <div className="flex items-center justify-center gap-2 text-[12px] text-slate-400 font-mono">
             <ShieldCheck className="w-3 h-3" />
             密钥仅保存在浏览器本地
           </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
