export interface CharacterVariation {
  id: string;
  name: string; // e.g., "Casual", "Tactical Gear", "Injured"
  visualPrompt: string;
  referenceImage?: string;
}

export interface Character {
  id: string;
  name: string;
  gender: string;
  age: string;
  personality: string;
  visualPrompt?: string;
  referenceImage?: string; // Base URL
  variations: CharacterVariation[]; // Added: List of alternative looks
}

export interface Scene {
  id: string;
  location: string;
  time: string;
  atmosphere: string;
  visualPrompt?: string;
  referenceImage?: string; // URL
}

export interface Keyframe {
  id: string;
  type: 'start' | 'end' | 'full';
  visualPrompt: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

export interface VideoInterval {
  id: string;
  startKeyframeId: string;
  endKeyframeId: string;
  duration: number;
  motionStrength: number;
  videoUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

export interface Shot {
  id: string;
  sceneId: string;
  actionSummary: string;
  dialogue?: string;
  cameraMovement: string;
  shotSize?: string;
  characters: string[]; // Character IDs
  characterVariations?: { [characterId: string]: string }; // Added: Map char ID to variation ID for this shot
  keyframes: Keyframe[];
  interval?: VideoInterval;
  audioUrl?: string; // 语音合成音频 URL

  // AI Model Providers configuration (stores config IDs)
  modelProviders?: {
    text2image?: string; // Text-to-image model config ID
    image2video?: string; // Image-to-video model config ID
  };
}

export interface ScriptData {
  title: string;
  genre: string;
  logline: string;
  targetDuration?: string;
  language?: string; 
  characters: Character[];
  scenes: Scene[];
  storyParagraphs: { id: number; text: string; sceneRefId: string }[];
}

export interface ProjectState {
  id: string;
  title: string;
  createdAt: number;
  lastModified: number;
  stage: 'script' | 'assets' | 'director' | 'export';

  // Script Phase Data
  rawScript: string;
  targetDuration: string;
  language: string;
  visualStyle: string;
  imageSize: string;
  imageCount: number; // 组图数量：文生图一次生成的画面数 (0-9)

  scriptData: ScriptData | null;
  shots: Shot[];
  isParsingScript: boolean;

  // Export Phase Data
  mergedVideoUrl?: string;

  // AI Model Providers configuration (stores config IDs)
  modelProviders?: {
    llm?: string; // LLM model config ID
    text2image?: string; // Text-to-image model config ID
    image2video?: string; // Image-to-video model config ID
  };
}

export interface AIModelConfig {
  id: string;
  provider: 'doubao' | 'deepseek' | 'openai' | 'gemini' | 'yunwu' | 'minimax' | 'kling' | 'baidu';
  modelType: 'llm' | 'text2image' | 'image2video' | 'tts' | 'stt';
  model: string;
  apiKey: string;
  apiUrl: string;
  enabled: boolean;
  description: string;
}

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}