
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
  is_pinned?: boolean;
  is_bookmarked?: boolean;
  folder_id?: string | null;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  context_summary?: string;
  created_at: string;
  updated_at: string;
}

export type AppView = 'workspace' | 'factory' | 'dashboard' | 'upgrade' | 'legal' | 'settings' | 'history';

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  mode?: AppMode;
  attachments?: string[];
  msgType?: 'meta_helper' | 'execution_result';
  executionModel?: string;
  status?: 'processing' | 'completed' | 'failed';
  metadata?: any;
}

export type AIModel = 'gpt-5' | 'google/gemini-3-pro-preview' | 'claude-sonnet-4.5' | 'gemini-3-flash';

export interface UserProfile {
  id: string;
  credits: number;
  subscriptionTier: 'free' | 'lite' | 'pro';
  wizardMode: 'iterative' | 'batch';
  defaultModel: AIModel;
  monthly_usage: number;
  last_usage_reset: string;
  createdAt: number;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  subscription_status?: 'free' | 'lite' | 'pro';
  lifetime_prompts?: number;
  // Premium mode usage tracking for free users
  vibe_code_uses_monthly?: number;
  talk_to_source_uses_monthly?: number;
  media_gen_uses_monthly?: number;
  total_pdfs_uploaded?: number;
}

// Added Document interface to resolve "Module '"../types"' has no exported member 'Document'" error in Dashboard.tsx
export interface Document {
  id: string;
  user_id: string;
  title: string;
  source_type: 'pdf' | 'youtube' | 'txt' | 'paste';
  source_url?: string;
  content: string;
  is_business_context?: boolean;
  created_at: string;
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
