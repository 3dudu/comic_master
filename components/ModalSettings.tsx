import { Check, ChevronRight, Edit, Film, Globe, Image, Key, Music, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createDefaultModelConfigs, deleteModelConfig, getAllModelConfigs, saveModelConfigWithExclusiveEnabled, toggleConfigEnabled } from '../services/modelConfigService';
import { triggerModelConfigChanged } from '../services/modelConfigEvents';
import { AIModelConfig } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDER_OPTIONS = [
  { value: 'doubao', label: 'Doubao (火山引擎)' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini (Google)' },
  { value: 'yunwu', label: 'Yunwu (云雾)' },
  { value: 'minimax', label: 'Minimax (海螺)'}
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
  doubao: ['llm', 'text2image', 'image2video', 'tts', 'stt'] as const,
  deepseek: ['llm'] as const,
  openai: ['llm', 'text2image', 'image2video'] as const,
  gemini: ['llm', 'text2image', 'image2video'] as const,
  yunwu: ['llm', 'text2image', 'image2video'] as const,
  minimax: ['image2video'] as const
};

// 根据供应商获取支持的模型类型选项
const getModelTypesForProvider = (provider: AIModelConfig['provider']) => {
  const supportedTypes = PROVIDER_MODEL_TYPES[provider] || ['llm'];
  return MODEL_TYPE_OPTIONS.filter(opt => supportedTypes.includes(opt.value as string));
};

const ModalSettings: React.FC<Props> = ({ isOpen, onClose }) => {
  const [configs, setConfigs] = useState<AIModelConfig[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<AIModelConfig> | null>(null);
  const [formData, setFormData] = useState({
    provider: 'doubao' as AIModelConfig['provider'],
    modelType: 'llm' as AIModelConfig['modelType'],
    model: '',
    apiKey: '',
    apiUrl: '',
    enabled: true,
    description: ''
  });

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
      alert('请填写 API Key');
      return;
    }

    if (formData.enabled && !formData.apiKey) {
      alert('未配置 API Key 的配置不能启用');
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
      alert('保存配置失败');
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
      alert('请填写 API Key');
      return;
    }

    if (formData.enabled && !formData.apiKey) {
      alert('未配置 API Key 的配置不能启用');
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
      alert('更新配置失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个配置吗？')) return;

    try {
      await deleteModelConfig(id);
      await loadConfigs();
      triggerModelConfigChanged(); // 触发配置变更事件
    } catch (error) {
      console.error('Failed to delete config:', error);
      alert('删除配置失败');
    }
  };

  const resetForm = () => {
    setFormData({
      provider: 'doubao',
      modelType: 'llm',
      model: '',
      apiKey: '',
      apiUrl: '',
      enabled: true,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !showAddModal) onClose();
      }}
    >
      <div className="bg-[#0A0A0A] border border-slate-800 rounded-lg w-[800px] max-w-[90vw] max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-500" />
            大模型配置管理
          </h3>
          <button
            onClick={handleCancelAdd}
            className="text-slate-500 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {showAddModal ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h4 className="text-sm font-bold text-white mb-2">
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
                    className="w-full bg-[#141414] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
                  >
                    {PROVIDER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none">
                    <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                  </div>
                </div>
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
                    className="w-full bg-[#141414] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md appearance-none focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
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
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  className="w-full bg-[#141414] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none transition-all font-mono placeholder:text-slate-700"
                  placeholder="输入您的 API Key..."
                />
              </div>

              {/* Model Name - Optional */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  模型名称 <span className="text-slate-700 font-normal">(可选)</span>
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full bg-[#141414] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none transition-all font-mono placeholder:text-slate-700"
                  placeholder="输入具体的模型名称（如：gpt-4、claude-3-sonnet）"
                />
              </div>

              {/* API URL */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  API URL <span className="text-slate-700 font-normal">(可选)</span>
                </label>
                <input
                  type="text"
                  value={formData.apiUrl}
                  onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                  className="w-full bg-[#141414] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none transition-all font-mono placeholder:text-slate-700"
                  placeholder="输入 API 端点 URL（选填）..."
                />
              </div>

              {/* description */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  备注 <span className="text-slate-700 font-normal">(可选)</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#141414] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none transition-all font-mono placeholder:text-slate-700"
                  placeholder="输入备注（选填）"
                />
              </div>

              {/* Enable Toggle */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">启用状态</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                  className={`w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-3 ${
                    formData.enabled
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {formData.enabled ? (
                    <>
                      <Check className="w-4 h-4" />
                      已启用 - 将用作此类型的默认配置
                    </>
                  ) : (
                    '未启用'
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCancelAdd}
                  className="flex-1 py-3 bg-slate-900 text-slate-400 hover:text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={editingConfig ? handleUpdate : handleAdd}
                  className="flex-1 py-3 bg-indigo-600 text-white hover:bg-indigo-500 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
                >
                  {editingConfig ? '更新配置' : '添加配置'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
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

                  return (
                    <div key={config.id} className={`p-4 transition-colors ${config.enabled ? 'bg-[#141414]' : 'bg-transparent'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.enabled ? 'bg-indigo-900/30 ring-1 ring-indigo-500/30' : 'bg-slate-900'}`}>
                            <ModelIcon className={`w-5 h-5 ${config.enabled ? 'text-indigo-400' : 'text-slate-600'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-white">{providerOption?.label || config.provider}</span>
                              <span className="text-[12px] text-green-600 bg-green-900 px-1.5 py-0.5 rounded font-mono">
                                {modelTypeOption?.label || config.modelType}
                              </span>
                              {config.description && (
                              <span className="text-[12px] text-green-600 bg-slate-900 border border-green-500/30 px-1.5 py-0.5 rounded font-mono">
                                  {config.description}
                              </span>
                              )}
                              {config.enabled && (
                                <span className="text-[12px] text-yellow-500 bg-yellow-900/20 border border-yellow-500/30 px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  已启用
                                </span>
                              )}
                            </div>
                            <div className="text-[12px] text-slate-600 font-mono flex items-center gap-2">
                              {config.apiKey && (
                                <span className="text-green-500">● 已配置</span>
                              )}
                              {config.model && (
                                <span className="text-[10px] text-green-400 bg-indigo-900/20 border border-green-500/30 px-1.5 py-0.5 rounded font-mono">
                                  {config.model}
                                </span>
                              )}
                              <span className="truncate max-w-[300px]">
                                {config.apiUrl}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              if (!config.enabled && !config.apiKey) {
                                alert('请先配置 API Key');
                                return;
                              }
                              await toggleConfigEnabled(config.id);
                              await loadConfigs();
                              triggerModelConfigChanged(); // 触发配置变更事件
                            }}
                            disabled={!config.enabled && !config.apiKey}
                            className={`p-2 transition-colors rounded-lg ${config.enabled ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-900/20 hover:bg-indigo-900/30' : !config.apiKey ? 'text-slate-700 bg-transparent cursor-not-allowed' : 'text-slate-600 hover:text-slate-300 hover:bg-slate-800'}`}
                            title={config.enabled ? '禁用' : config.apiKey ? '启用' : '请先配置 API Key'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(config)}
                            className="p-2 hover:bg-slate-800 text-slate-600 hover:text-white transition-colors rounded-lg"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(config.id)}
                            className="p-2 hover:bg-red-900/20 text-slate-600 hover:text-red-400 transition-colors rounded-lg"
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
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full py-3 bg-white text-black hover:bg-slate-200 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors shadow-lg shadow-white/5 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加新配置
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalSettings;
