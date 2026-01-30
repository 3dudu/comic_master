import { X } from 'lucide-react';
import React, { useState } from 'react';
import { Scene } from '../types';

interface StoryParagraph {
  id: number;
  text: string;
  sceneRefId: string;
}

interface Props {
  scene: Scene;
  storyParagraphs: StoryParagraph[];
  onSave: (updatedScene: Partial<Scene>, updatedStoryParagraphs: StoryParagraph[]) => void;
  onClose: () => void;
}

const SceneEditModal: React.FC<Props> = ({ scene, storyParagraphs, onSave, onClose }) => {
  const [tempScene, setTempScene] = useState<Partial<Scene>>({ ...scene });
  const [tempStoryParagraph, setTempStoryParagraph] = useState<string>(
    storyParagraphs.find(p => p.sceneRefId === scene.id)?.text || ''
  );

  const handleSave = () => {
    // 更新或创建 storyParagraph
    const updatedStoryParagraphs = [...storyParagraphs];
    const existingIndex = updatedStoryParagraphs.findIndex(p => p.sceneRefId === scene.id);

    if (tempStoryParagraph.trim()) {
      if (existingIndex >= 0) {
        // 更新现有的 storyParagraph
        updatedStoryParagraphs[existingIndex] = {
          ...updatedStoryParagraphs[existingIndex],
          text: tempStoryParagraph
        };
      } else {
        // 创建新的 storyParagraph
        updatedStoryParagraphs.push({
          id: Date.now(),
          text: tempStoryParagraph,
          sceneRefId: scene.id
        });
      }
    } else {
      // 如果文本为空，删除 storyParagraph
      if (existingIndex >= 0) {
        updatedStoryParagraphs.splice(existingIndex, 1);
      }
    }

    onSave(tempScene, updatedStoryParagraphs);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#0e0e28] border border-slate-800 rounded-lg w-[600px] max-w-[90vw] max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <span className="text-slate-400">📍</span>
            编辑场景
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Location */}
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">场景名称</label>
            <input
              type="text"
              value={tempScene.location || ''}
              onChange={(e) => setTempScene({ ...tempScene, location: e.target.value })}
              className="w-full bg-[#0f0f23] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none transition-all"
              placeholder="输入场景名称..."
            />
          </div>

          {/* Time */}
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">时间</label>
            <input
              type="text"
              value={tempScene.time || ''}
              onChange={(e) => setTempScene({ ...tempScene, time: e.target.value })}
              className="w-full bg-[#0f0f23] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none transition-all"
              placeholder="输入时间（如：日间、夜间、黄昏）..."
            />
          </div>

          {/* Atmosphere */}
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">氛围</label>
            <input
              type="text"
              value={tempScene.atmosphere || ''}
              onChange={(e) => setTempScene({ ...tempScene, atmosphere: e.target.value })}
              className="w-full bg-[#0f0f23] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none transition-all"
              placeholder="输入场景氛围..."
            />
          </div>

          {/* Story Paragraph Text */}
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">剧本段落</label>
            <textarea
              value={tempStoryParagraph}
              onChange={(e) => setTempStoryParagraph(e.target.value)}
              className="w-full bg-[#0f0f23] border border-slate-800 text-white px-3 py-2.5 text-sm rounded-md focus:border-slate-600 focus:outline-none transition-all resize-none"
              rows={6}
              placeholder="输入该场景的剧本段落内容..."
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-900 text-slate-400 hover:text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-white text-black hover:bg-slate-200 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default SceneEditModal;
