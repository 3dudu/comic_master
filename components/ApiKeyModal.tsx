// components/ApiKeyModal.tsx
import { ArrowRight, Key, ShieldCheck, X } from 'lucide-react';
import React from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string, cozeWorkflowId?: string, cozeApiKey?: string, fileUploadServiceUrl?: string, fileAccessDomain?: string) => void;
  currentKey: string;
  cozeWorkflowId?: string;
  cozeApiKey?: string;
  currentFileUploadServiceUrl?: string;
  currentFileAccessDomain?: string;
  providerName: string;
  providerDescription: string;
  documentationUrl: string;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentKey,
  cozeWorkflowId = '',
  cozeApiKey = '',
  currentFileUploadServiceUrl = '',
  currentFileAccessDomain = '',
  providerName,
  providerDescription,
  documentationUrl
}) => {
  const [inputKey, setInputKey] = React.useState(currentKey);
  const [inputCozeWorkflowId, setInputCozeWorkflowId] = React.useState(cozeWorkflowId);
  const [inputCozeApiKey, setInputCozeApiKey] = React.useState(cozeApiKey);
  const [inputFileUploadServiceUrl, setInputFileUploadServiceUrl] = React.useState(currentFileUploadServiceUrl);
  const [inputFileAccessDomain, setInputFileAccessDomain] = React.useState(currentFileAccessDomain);

  React.useEffect(() => {
    setInputKey(currentKey);
    setInputCozeWorkflowId(cozeWorkflowId);
    setInputCozeApiKey(cozeApiKey);
    setInputFileUploadServiceUrl(currentFileUploadServiceUrl);
    setInputFileAccessDomain(currentFileAccessDomain);
  }, [currentKey, cozeWorkflowId, cozeApiKey, currentFileUploadServiceUrl, currentFileAccessDomain, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (inputKey.trim()) {
      onSave(
        inputKey.trim(),
        inputCozeWorkflowId.trim(),
        inputCozeApiKey.trim(),
        inputFileUploadServiceUrl.trim(),
        inputFileAccessDomain.trim()
      );
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="w-full max-w-md bg-[#0e0e28] border border-slate-800 p-8 rounded-xl shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 absolute top-4 right-4 text-slate-600 hover:bg-slate-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8 border-b border-slate-900 pb-6">
           <div className="w-10 h-10 bg-white text-black flex items-center justify-center">
              <Key className="w-5 h-5" />
           </div>
           <div>
              <h1 className="text-xl font-bold text-white tracking-wide">API 配置</h1>
              <p className="text-[12px] text-slate-500 uppercase tracking-widest font-mono">Authentication</p>
           </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="max-h-[60vh] overflow-y-auto rounded-lg"> 
           <div>
             <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">
               {providerName} API Key
             </label>
             <input
               type="password"
               value={inputKey}
               onChange={(e) => setInputKey(e.target.value)}
               placeholder="Enter your API Key..."
               className="w-full bg-[#0f0f23] border border-slate-800 text-white px-4 py-3 text-sm rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-900 transition-all font-mono placeholder:text-slate-700"
             />
             <p className="mt-3 text-[12px] text-slate-600 leading-relaxed">
               {providerDescription}
               <a
                 href={documentationUrl}
                 target="_blank"
                 rel="noreferrer"
                 className="text-indigo-400 hover:underline ml-1"
               >
                 查看文档
               </a>
             </p>
           </div>

           <div>
             <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">
               Coze 工作流 ID
             </label>
             <input
               type="text"
               value={inputCozeWorkflowId}
               onChange={(e) => setInputCozeWorkflowId(e.target.value)}
               placeholder="Enter Coze Workflow ID..."
               className="w-full bg-[#0f0f23] border border-slate-800 text-white px-4 py-3 text-sm rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-900 transition-all font-mono placeholder:text-slate-700"
             />
             <p className="mt-3 text-[12px] text-slate-600 leading-relaxed">
               配置 Coze 工作流 ID 用于智能剧本分析等功能。
             </p>
           </div>

           <div>
             <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">
               Coze API Key
             </label>
             <input
               type="password"
               value={inputCozeApiKey}
               onChange={(e) => setInputCozeApiKey(e.target.value)}
               placeholder="Enter Coze API Key..."
               className="w-full bg-[#0f0f23] border border-slate-800 text-white px-4 py-3 text-sm rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-900 transition-all font-mono placeholder:text-slate-700"
             />
             <p className="mt-3 text-[12px] text-slate-600 leading-relaxed">
               本应用需要 Coze 的 API 访问权限。
               <a
                 href="https://www.coze.cn/docs"
                 target="_blank"
                 rel="noreferrer"
                 className="text-indigo-400 hover:underline ml-1"
               >
                 查看文档
               </a>
             </p>
           </div>

           <div>
             <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">
               文件上传服务地址
             </label>
             <input
               type="text"
               value={inputFileUploadServiceUrl}
               onChange={(e) => setInputFileUploadServiceUrl(e.target.value)}
               placeholder="https://apppub.good365.net:6443/apppub_api/thirdparty/upload"
               className="w-full bg-[#0f0f23] border border-slate-800 text-white px-4 py-3 text-sm rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-900 transition-all font-mono placeholder:text-slate-700"
             />
             <p className="mt-3 text-[12px] text-slate-600 leading-relaxed">
               配置后，AI 生成的图片和视频将上传到此服务。
               <span className="text-slate-700">（可选）</span>
             </p>
           </div>

           <div>
             <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">
               文件访问域名
             </label>
             <input
               type="text"
               value={inputFileAccessDomain}
               onChange={(e) => setInputFileAccessDomain(e.target.value)}
               placeholder="ofs.good365.net:6443"
               className="w-full bg-[#0f0f23] border border-slate-800 text-white px-4 py-3 text-sm rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-900 transition-all font-mono placeholder:text-slate-700"
             />
             <p className="mt-3 text-[12px] text-slate-600 leading-relaxed">
               上传后的文件将使用此域名访问，不包含协议头。
               <span className="text-slate-700">（可选）</span>
             </p>
           </div>

           {/* Current Key Status */}
           {currentKey && (
             <div className="flex items-center gap-2 text-[12px] text-slate-500 bg-slate-900/50 p-3 rounded-lg">
               <ShieldCheck className="w-3 h-3 text-green-500" />
               <span className="font-mono">
                 API Key 已配置: {currentKey.substring(0, 8)}...
               </span>
             </div>
           )}
          </div>
           <button
             onClick={handleSave}
             disabled={!inputKey.trim()}
             className="w-full py-3 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             保存配置 <ArrowRight className="w-3 h-3" />
           </button>

           <div className="flex items-center justify-center gap-2 text-[12px] text-slate-700 font-mono">
             <ShieldCheck className="w-3 h-3" />
             密钥仅保存在浏览器本地
           </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
