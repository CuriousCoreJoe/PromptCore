
export enum AppMode {
  EVERYDAY = 'Everyday',
  VIBE_CODE = 'Vibe Code',
  MEDIA_GEN = 'Media Gen',
  TALK_TO_SOURCE = 'Talk to Source',
}

export interface ChatSession {
  id: string;
  title: string;
  mode: AppMode;
  created_at: string;
  updated_at: string;
}

export type AppView = 'workspace' | 'factory' | 'dashboard' | 'upgrade' | 'legal' | 'settings';

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  mode?: AppMode;
  attachments?: string[];
}

export interface UserProfile {
  id: string;
  credits: number;
  subscriptionTier: 'free' | 'pro' | 'ultimate';
  wizardMode: 'iterative' | 'batch';
  createdAt: number;
}

// Added Document interface to resolve "Module '"../types"' has no exported member 'Document'" error in Dashboard.tsx
export interface Document {
  id: string;
  userId: string;
  title: string;
  sourceType: 'pdf' | 'youtube';
  sourceUrl?: string;
  content: string;
  createdAt: number;
}

// New Consumer-First Factory Types
export interface BatchItem {
  id: string;
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  prompt_content: string;
  usage_guide: string;
  style_var: string;
}

export interface FactoryBatch {
  id: string;
  status: 'pending' | 'generating' | 'completed';
  items: BatchItem[];
  topic: string;
  angle: string;
}
