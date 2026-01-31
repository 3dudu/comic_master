/**
 * 云同步设置组件
 * 支持 Google Drive 和 OneDrive 登录和同步
 */

import { AlertCircle, ArrowRight, CheckCircle, Cloud, CloudCog, LogOut, RefreshCw, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getSyncStatus, googleAuth, initGoogleDrive, signOut, syncToCloud, toggleAutoSync } from '../services/cloudSyncService';

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
  onSyncComplete?: () => void;
  onSyncError?: (error: Error) => void;
}

const CloudSyncSettings: React.FC<Props> = ({ isOpen, onClose, onSyncComplete, onSyncError }) => {
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncText, setLastSyncText] = useState('');

  useEffect(() => {
    setLastSyncText(syncStatus.lastSyncDate);
    initGoogleDrive();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await googleAuth();
      setSyncStatus(getSyncStatus());
      if (syncStatus.lastSyncTime>0 && onSyncComplete) onSyncComplete();
    } catch (error) {
      console.error('Google 登录失败:', error);
      if (onSyncError) onSyncError(error as Error);
    }
  };


  const handleSync = async () => {
    if (!syncStatus.provider) {
      if (onSyncError) onSyncError(new Error('请先登录云服务'));
      return;
    }

    setIsSyncing(true);
    try {
      await syncToCloud();
      setSyncStatus(getSyncStatus());
      setLastSyncText(new Date().toLocaleString('zh-CN'));
      if (syncStatus.lastSyncTime>0 && onSyncComplete) onSyncComplete();
    } catch (error) {
      setSyncStatus(getSyncStatus());
      console.error('同步失败:', error);
      if (onSyncError) onSyncError(error as Error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setSyncStatus(getSyncStatus());
      if (onSyncComplete) onSyncComplete();
    } catch (error) {
      console.error('登出失败:', error);
      if (onSyncError) onSyncError(error as Error);
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    toggleAutoSync(enabled);
    setSyncStatus(getSyncStatus());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-200">
      <div className="relative bg-[#0e1229] border border-slate-800 rounded-xl p-6 space-y-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="bg-[#0e1229] border border-slate-800 rounded-xl p-6 space-y-6">
          {/* 标题 */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 pr-8">
            <div className="flex items-center gap-3">
              <Cloud className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">云同步</h3>
            </div>
            <div className="flex items-center gap-2">
              {syncStatus.isAuthenticated ? (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  已连接
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  未连接
                </div>
              )}
            </div>
          </div>

          {/* 云服务提供商选择 */}
          {!syncStatus.isAuthenticated ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-4">选择一个云服务提供商来同步您的项目数据：</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Google Drive */}
                <button
                  onClick={handleGoogleLogin}
                  className="group relative bg-[#1a1d2e] border border-slate-700 hover:border-blue-500 rounded-xl p-6 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-8 h-8" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09 0-3.21-1.38-6.1-3.6-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-white font-semibold text-sm">Google Drive</p>
                      <p className="text-slate-500 text-xs mt-1">使用 Google 云盘同步</p>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-blue-400" />
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* 已登录状态 */
            <div className="space-y-4">
              {/* 当前提供商信息 */}
              <div className="bg-[#1a1d2e] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {syncStatus.provider === 'google' && (
                      <>
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09 0-3.21-1.38-6.1-3.6-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">Google Drive</p>
                          <p className="text-slate-500 text-xs">已连接</p>
                        </div>
                      </>
                    )}
                    {syncStatus.provider === 'onedrive' && (
                      <>
                        <div className="w-10 h-10 bg-[#0078D4] rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path fill="white" d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M14.5,11c-0.83,0-1.5-0.67-1.5-1.5s0.67,1.5,1.5,1.5s1.5-0.67,1.5-1.5 S15.33,11,14.5,11z M19,13.5c-0.83,0-1.5,0.67-1.5,1.5s0.67,1.5,1.5,1.5s1.5-0.67,1.5-1.5 S19.83,13.5,19,13.5z M13,16.5c-0.83,0-1.5,0.67-1.5,1.5s0.67,1.5,1.5,1.5s1.5-0.67,1.5-1.5 S13.83,16.5,13,16.5z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">OneDrive</p>
                          <p className="text-slate-500 text-xs">已连接</p>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    断开连接
                  </button>
                </div>

                {/* 最后同步时间 */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">最后同步:</span>
                  <span className="text-white font-medium">{lastSyncText}</span>
                </div>
              </div>

              {/* 同步按钮 */}
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    同步中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    立即同步
                  </>
                )}
              </button>

              {/* 自动同步开关 */}
              <div className="flex items-center justify-between bg-[#1a1d2e] rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CloudCog className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-white text-sm font-medium">自动同步</p>
                    <p className="text-slate-500 text-xs">应用启动时自动同步</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleAutoSync(!syncStatus.autoSync)}
                  className={`w-14 h-7 rounded-full p-1 transition-colors ${
                    syncStatus.autoSync ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full transition-transform ${
                      syncStatus.autoSync ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* 使用说明 */}
          <div className="bg-[#1a1d2e]/50 rounded-lg p-4 border border-slate-800/50">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-400 space-y-1">
                <p>• 项目数据存储在云盘的应用数据文件夹中</p>
                <p>• 同步基于 lastModified 时间戳自动合并冲突</p>
                <p>• 离线编辑的更改会在下次同步时上传</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudSyncSettings;
