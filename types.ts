export enum AppMode {
  EVERYDAY = 'Everyday',
  VIBE_CODE = 'Vibe Code',
  MEDIA_GEN = 'Media Gen',
  TALK_TO_SOURCE = 'Talk to Source',
}

export type AppView = 'workspace' | 'factory' | 'dashboard' | 'upgrade';

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  mode?: AppMode;
  attachments?: string[]; // URLs or base64
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  mode: AppMode;
}

export interface UserProfile {
  id: string;
  credits: number;
  subscriptionTier: 'free' | 'pro' | 'ultimate';
  createdAt: number;
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  sourceType: 'youtube' | 'pdf' | 'url';
  sourceUrl?: string;
  content: string;
  // Embedding is handled backend-side usually, but we keep metadata here
  metadata?: Record<string, any>;
  createdAt: number;
}

// Factory Types
export interface BatchItem {
  id: string;
  content: string;
  category?: string; // The "injected variable" (e.g., "Creative", "Technical")
}

export interface FactoryBatch {
  id: string;
  status: 'pending' | 'generating' | 'completed';
  items: BatchItem[];
  topic: string;
  angle: string; // The specific focus of this batch
}