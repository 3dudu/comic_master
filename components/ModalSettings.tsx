import { Check, ChevronRight, Download, Edit, Eye, EyeOff, Film, Globe, Image, Key, Link, Music, Plus, Sparkles, Tags, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { triggerModelConfigChanged } from '../services/modelConfigEvents';
import { createDefaultModelConfigs, saveModelConfigWithExclusiveEnabled, toggleConfigEnabled } from '../services/modelConfigService';
import { deleteModelConfig, getAllModelConfigs, saveModelConfig } from '../services/storageService';
import { AIModelConfig } from '../types';
import { useDialog } from './dialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

const PROVIDER_OPTIONS = [
  { value: 'doubao', label: 'Doubao (火山引擎)', apiUrl: 'https://www.volcengine.com/product/doubao' },
  { value: 'deepseek', label: 'DeepSeek', apiUrl: 'https://platform.deepseek.com/' },
  { value: 'openai', label: 'OpenAI', apiUrl: 'https://platform.openai.com/' },
  { value: 'gemini', label: 'Gemini (Google)', apiUrl: 'https://ai.google.dev/' },
  { value: 'yunwu', label: 'Yunwu (云雾)', apiUrl: 'https://yunwu.ai/' },
  { value: 'minimax', label: 'Minimax (海螺)', apiUrl: 'https://www.minimaxi.com/' },
  { value: 'kling', label: 'Kling (可灵)', apiUrl: 'https://klingai.com/' },
  { value: 'baidu', label: 'Baidu (百度)', apiUrl: 'https://cloud.baidu.com/' },
] as const;

const MODEL_TYPE_OPTIONS = [
  { value: 'llm', label: '大语言模型 (LLM)', icon: Sparkles },
  { value: 'text2image', label: '文生图', icon: Image },
  { value: 'image2video', label: '图生视频', icon: Film },
  { value: 'tts', label: '语音合成 (TTS)', icon: Music },
  { value: 'stt', label: '语音识别 (STT)', icon: Music }
] as const;

// 定义不同供应商支持的模型类型
const PROVIDER_MODEL_TYPES: Record<string, readonly string[]> = {
  doubao: ['llm', 'text2image', 'image2video'] as const,
  deepseek: ['llm'] as const,
  openai: ['llm', 'text2image', 'image2video'] as const,
  gemini: ['llm', 'text2image', 'image2video'] as const,
  yunwu: ['llm', 'text2image', 'image2video'] as const,
  minimax: ['image2video'] as const,
  kling: ['image2video'] as const,
  baidu: ['tts'] as const,
};

// 根据供应商获取支持的模型类型选项
const getModelTypesForProvider = (provider: AIModelConfig['provider']) => {
  const supportedTypes = PROVIDER_MODEL_TYPES[provider] || ['llm'];
  return MODEL_TYPE_OPTIONS.filter(opt => supportedTypes.includes(opt.value as string));
};

// 根据模型类型获取颜色样式
const getModelTypeColorStyles = (modelType: AIModelConfig['modelType']) => {
  const colorMap = {
    llm: {
      text: 'text-green-300',
      bg: 'bg-green-900/80',
      border: 'border-green-500/30'
    },
    text2image: {
      text: 'text-orange-400',
      bg: 'bg-orange-900/80',
      border: 'border-orange-500/30'
    },
    image2video: {
      text: 'text-purple-400',
      bg: 'bg-purple-900/80',
      border: 'border-purple-500/30'
    },
    tts: {
      text: 'text-blue-400',
      bg: 'bg-blue-900/80',
      border: 'border-blue-500/30'
    },
    stt: {
      text: 'text-yellow-400',
      bg: 'bg-yellow-900/80',
      border: 'border-yellow-500/30'
    }
  };
  return colorMap[modelType] || colorMap.llm;
};

const ModalSettings: React.FC<Props> = ({ isOpen, onClose, isMobile=false }) => {
  const dialog = useDialog();
  const [configs, setConfigs] = useState<AIModelConfig[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<AIModelConfig> | null>(null);
  const [formData, setFormData] = useState({
    provider: 'doubao' as AIModelConfig['provider'],
    modelType: 'llm' as AIModelConfig['modelType'],
    model: '',
    apiKey: '',
    apiUrl: '',
    enabled: false,
    description: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const loadConfigs = async () => {
    try {
      await createDefaultModelConfigs();
      const allConfigs = await getAllModelConfigs();
      setConfigs(allConfigs);
    } catch (error) {
      console.error('Failed to load configs:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConfigs();
    }
  }, [isOpen]);

  const handleAdd = async () => {
    if (!formData.apiKey) {
      await dialog.alert({ title: '错误', message: '请填写 API Key', type: 'error' });
      return;
    }

    const newConfig: AIModelConfig = {
      id: `${formData.provider}-${formData.modelType}-${Date.now()}`,
      provider: formData.provider,
      modelType: formData.modelType,
      model: formData.model || undefined, // 模型名称现在是可选的
      apiKey: formData.apiKey,
      apiUrl: formData.apiUrl || '',
      enabled: formData.enabled && !!formData.apiKey,
      description: formData.description
    };

    try {
      await saveModelConfigWithExclusiveEnabled(newConfig);
      await loadConfigs();
      triggerModelConfigChanged(); // 触发配置变更事件
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save config:', error);
      await dialog.alert({ title: '错误', message: '保存配置失败', type: 'error' });
    }
  };

  const handleEdit = (config: AIModelConfig) => {
    setEditingConfig(config);
    setFormData({
      provider: config.provider,
      modelType: config.modelType,
      model: config.model,
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
      enabled: config.enabled,
      description: config.description
    });
    setShowAddModal(true);
  };

  const handleUpdate = async () => {
    if (!editingConfig?.id) return;
    if (!formData.apiKey) {
      await dialog.alert({ title: '错误', message: '请填写 API Key', type: 'error' });
      return;
    }

    const updatedConfig: AIModelConfig = {
      id: editingConfig.id,
      provider: formData.provider,
      modelType: formData.modelType,
      model: formData.model || undefined, // 模型名称现在是可选的
      apiKey: formData.apiKey,
      apiUrl: formData.apiUrl || '',
      enabled: formData.enabled && !!formData.apiKey,
      description: formData.description
    };

    try {
      await saveModelConfigWithExclusiveEnabled(updatedConfig);
      await loadConfigs();
      triggerModelConfigChanged(); // 触发配置变更事件
      setShowAddModal(false);
      setEditingConfig(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update config:', error);
      await dialog.alert({ title: '错误', message: '更新配置失败', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: '确认删除',
      message: '确定要删除这个配置吗？',
      type: 'warning',
    });
    if (!confirmed) return;

    try {
      await deleteModelConfig(id);
      await loadConfigs();
      triggerModelConfigChanged(); // 触发配置变更事件
    } catch (error) {
      console.error('Failed to delete config:', error);
      await dialog.alert({ title: '错误', message: '删除配置失败', type: 'error' });
    }
  };

  const handleExport = async () => {
    try {
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        configs: configs.map(c => ({
          id: c.id,
          provider: c.provider,
          modelType: c.modelType,
          model: c.model,
          apiKey: c.apiKey,
          apiUrl: c.apiUrl,
          enabled: c.enabled,
          description: c.description
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cinegen-model-configs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
      await dialog.alert({ title: '错误', message: '导出配置失败', type: 'error' });
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);

        // 验证导入数据格式
        if (!importData.configs || !Array.isArray(importData.configs)) {
          await dialog.alert({ title: '错误', message: '导入文件格式不正确', type: 'error' });
          return;
        }

        const importCount = importData.configs.length;
        const confirmMessage = `确定要导入 ${importCount} 个配置吗？\n\n导入的配置将与现有配置合并，ID 相同的配置将被覆盖。`;

        const confirmed = await dialog.confirm({
          title: '确认导入',
          message: confirmMessage,
          type: 'info',
        });
        if (!confirmed) {
          event.target.value = '';
          return;
        }

        // 导入配置
        for (const config of importData.configs) {
          try {
            const validConfig: AIModelConfig = {
              id: config.id || `${config.provider}-${config.modelType}-${Date.now()}`,
              provider: config.provider,
              modelType: config.modelType,
              model: config.model,
              apiKey: config.apiKey,
              apiUrl: config.apiUrl || '',
              enabled: false, // 导入的配置默认不启用
              description: config.description || ''
            };
            await saveModelConfig(validConfig);
          } catch (error) {
            console.error('导入单个配置失败:', config, error);
          }
        }

        await loadConfigs();
        triggerModelConfigChanged();
        await dialog.alert({ title: '成功', message: `成功导入 ${importCount} 个配置`, type: 'success' });
      } catch (error) {
        console.error('导入失败:', error);
        await dialog.alert({ title: '错误', message: '导入文件解析失败，请检查文件格式', type: 'error' });
      }
    };

    reader.readAsText(file);
    event.target.value = ''; // 清空 input 以便重复导入同一文件
  };

  const resetForm = () => {
    setFormData({
      provider: 'doubao',
      modelType: 'llm',
      model: '',
      apiKey: '',
      apiUrl: '',
      enabled: false,
      description: ''
    });
  };

  const handleCancelAdd = () => {
    if(showAddModal){
      setShowAddModal(false);
      setEditingConfig(null);
      resetForm();
    }else{
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !showAddModal) onClose();
      }}
    >
      <div className="bg-slate-600/80 bg-bg-input border border-slate-600 rounded-lg w-[800px] max-w-[90vw] max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-slate-500" />
            模型管理
          </h3>
          <button
            onClick={handleCancelAdd}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {showAddModal ? (
          <>
          <div className="flex-1 overflow-y-auto p-6 bg-slate-700">
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h4 className="text-sm font-bold text-text-primary mb-2">
                  {editingConfig ? '编辑配置' : '添加新配置'}
                </h4>
                <p className="text-xs text-slate-500">配置您的 AI 模型服务提供商和 API 凭证</p>
              </div>

              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">服务提供商</label>
                <div className="relative">
                  <select
                    value={formData.provider}
                    onChange={(e) => {
                      const newProvider = e.target.value as AIModelConfig['provider'];
                      const supportedTypes = getModelTypesForProvider(newProvider);
                      const firstSupportedType = supportedTypes[0]?.value as AIModelConfig['modelType'];

                      setFormData({
                        ...formData,
                        provider: newProvider,
                        modelType: firstSupportedType || 'llm',
                        model: '' // 切换供应商时清空模型名称
                      });
                    }}
                    className="w-full bg-bg-input border border-slate-600 text-text-primary px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                  >
                    {PROVIDER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none">
                    <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                  </div>
                </div>
                {/* API Key 申请链接 */}
                {(() => {
                  const selectedProvider = PROVIDER_OPTIONS.find(p => p.value === formData.provider);
                  return selectedProvider?.apiUrl ? (
                    <a
                      href={selectedProvider.apiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
                    >
                      <Globe className="w-3 h-3" />
                      申请 {selectedProvider.label} API Key
                      <Link className="w-3 h-3" />
                    </a>
                  ) : null;
                })()}
              </div>

              {/* Model Type Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">模型类型</label>
                <div className="relative">
                  <select
                    value={formData.modelType}
                    onChange={(e) => {
                      const newModelType = e.target.value as AIModelConfig['modelType'];
                      setFormData({ ...formData, modelType: newModelType });
                      // 如果模型名称不属于新类型，清空模型名称
                      if (formData.model && !getModelTypesForProvider(formData.provider).find(opt => opt.value === newModelType)) {
                        setFormData(prev => ({ ...prev, model: '' }));
                      }
                    }}
                    className="w-full bg-bg-input border border-slate-600 text-text-primary px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                  >
                    {getModelTypesForProvider(formData.provider).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none">
                    <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                  </div>
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Key className="w-3 h-3" />
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="w-full bg-bg-input border border-slate-600 text-text-primary px-3 py-2.5 pr-10 text-sm rounded-md focus:border-slate-600 focus:outline-none transition-all font-mono placeholder:text-slate-400"
                    placeholder="输入您的 API Key..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                    title={showApiKey ? "隐藏 API Key" : "显示 API Key"}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Model Name - Optional */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  模型名称 <span className="text-slate-400 font-normal">(可选)</span>
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full bg-bg-input border border-slate-600 text-text-primary px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none transition-all font-mono placeholder:text-slate-400"
                  placeholder="输入具体的模型名称（如：gpt-4、claude-3-sonnet）"
                />
              </div>

              {/* API URL */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  API URL <span className="text-slate-400 font-normal">(可选)</span>
                </label>
                <input
                  type="text"
                  value={formData.apiUrl}
                  onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                  className="w-full bg-bg-input border border-slate-600 text-text-primary px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none transition-all font-mono placeholder:text-slate-400"
                  placeholder="输入 API 端点 URL（选填）..."
                />
              </div>

              {/* description */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Tags className="w-3 h-3" />
                  备注 <span className="text-slate-400 font-normal">(可选)</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-bg-input border border-slate-600 text-text-primary px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none transition-all font-mono placeholder:text-slate-400"
                  placeholder="输入备注（选填）"
                />
              </div>

              {/* Enable Toggle */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">系统默认</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                  className={`w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-3 ${
                    formData.enabled
                      ? 'bg-yellow-300 text-slate-500'
                      : 'bg-slate-600 text-slate-400'
                  }`}
                >
                  {formData.enabled ? (
                    <>
                      <Check className="w-4 h-4" />
                      系统默认 - 将用作此类型的系统默认配置
                    </>
                  ) : (
                    '非系统默认'
                  )}
                </button>
              </div>
              {/* Action Buttons */}
            </div>
          </div>
              <div className="p-6 border-t border-slate-800">
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCancelAdd}
                  className="flex-1 py-3 bg-slate-700 text-slate-400 hover:text-text-primary text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={editingConfig ? handleUpdate : handleAdd}
                  className="flex-1 py-3 bg-slate-500 text-slate-50 hover:bg-slate-400 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors shadow-lg shadow-slate-600/20"
                >
                  {editingConfig ? '更新配置' : '添加配置'}
                </button>
              </div>
              </div>
              </>
        ) : (
          <div className="flex-1 overflow-y-auto bg-slate-800">
            {/* Config List */}
            <div className="divide-y divide-slate-800">
              {configs.length === 0 ? (
                <div className="p-12 text-center">
                  <Key className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                  <p className="text-sm text-slate-500">暂无配置</p>
                  <p className="text-xs text-slate-600 mt-2">点击下方按钮添加您的第一个模型配置</p>
                </div>
              ) : (
                configs.map((config) => {
                  const providerOption = PROVIDER_OPTIONS.find(p => p.value === config.provider);
                  const modelTypeOption = MODEL_TYPE_OPTIONS.find(m => m.value === config.modelType);
                  const ModelIcon = modelTypeOption?.icon || Key;
                  const typeColors = getModelTypeColorStyles(config.modelType);

                  return (
                    <div key={config.id} className={`p-4 transition-colors ${config.enabled ? 'bg-bg-selected' : 'bg-slate-700'}`}>
                      {/* 移动端：纵向布局；桌面端：横向布局 */}
                      <div className={`${isMobile ? 'flex-col' : 'flex-row'} flex items-start justify-between gap-4`}>
                        {/* 左侧：图标和配置信息 */}
                        <div className={`flex items-start gap-4 ${isMobile ? 'w-full flex-row' : 'flex-row'}`}>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.enabled ? typeColors.bg + ' ring-1 ' + typeColors.border : 'bg-slate-900'}`}>
                            <ModelIcon className={`w-5 h-5 ${config.enabled ? typeColors.text : 'text-slate-600'}`} />
                          </div>
                          <div className={`${isMobile ? 'flex-1' : ''}`}>
                            <div className={`flex items-center gap-2 mb-1 ${isMobile ? 'flex-wrap' : ''}`}>
                              <span className="text-sm font-bold text-text-primary">{providerOption?.label || config.provider}</span>
                              <span className={`text-[12px] ${getModelTypeColorStyles(config.modelType).text} ${getModelTypeColorStyles(config.modelType).bg} border ${getModelTypeColorStyles(config.modelType).border} px-1.5 py-0.5 rounded font-mono`}>
                                {modelTypeOption?.label || config.modelType}
                              </span>
                              {config.description && (
                                <span className="text-[12px] text-slate-400 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                                  {config.description}
                                </span>
                              )}
                              {config.enabled && (
                                <span className="text-[12px] text-yellow-500 bg-yellow-900/70 border border-yellow-500/30 px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  系统默认
                                </span>
                              )}
                            </div>
                            <div className={`text-[12px] text-slate-500 font-mono flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                              {config.apiKey && (
                                <span className="text-green-700">● 已配置</span>
                              )}
                              {config.model && (
                                <span className="text-[10px] text-green-700 bg-slate-900/20 border border-green-600/30 px-1.5 py-0.5 rounded font-mono">
                                  {config.model}
                                </span>
                              )}
                              {!isMobile && <span className="text-[10px] text-slate-400 truncate max-w-[300px]">
                                {config.apiUrl}
                              </span>}
                            </div>
                          </div>
                        </div>
                        
                        {/* 右侧：操作按钮 */}
                        <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-between pt-2 border-t border-slate-800/50' : ''}`}>
                          <button
                            onClick={async () => {
                              if (!config.enabled && !config.apiKey) {
                                await dialog.alert({ title: '错误', message: '请先配置 API Key', type: 'error' });
                                return;
                              }
                              await toggleConfigEnabled(config.id);
                              await loadConfigs();
                              triggerModelConfigChanged();
                            }}
                            disabled={!config.enabled && !config.apiKey}
                            className={`p-2 transition-colors rounded-lg ${config.enabled ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-950 bg-slate-900' : !config.apiKey ? 'text-slate-500 bg-slate-900 bg-transparent cursor-not-allowed' : 'bg-slate-900 text-slate-600 hover:text-slate-300 hover:bg-slate-950'}`}
                            title={config.enabled ? '非默认' : config.apiKey ? '系统默认' : '请先配置 API Key'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(config)}
                            className="p-2 hover:bg-slate-950 bg-slate-900 text-slate-600 hover:text-slate-300 transition-colors rounded-lg"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(config.id)}
                            className="p-2 hover:bg-red-950 bg-slate-900 text-slate-600 hover:text-red-400 transition-colors rounded-lg"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!showAddModal && (
          <div className="p-6 border-t border-slate-800">
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                className="flex-1 py-3 bg-slate-700 text-slate-400 hover:text-text-primary text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                导出配置
              </button>
              <div className="relative flex-1">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button
                  className="w-full py-3 bg-slate-700 text-slate-400 hover:text-text-primary text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  导入配置
                </button>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex-1 py-3 bg-slate-500 text-slate-50 hover:bg-slate-400 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors shadow-lg shadow-white/5 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                添加新配置
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalSettings;
