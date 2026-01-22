-- Fix Profiles Table
-- Ensure default_model column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_model TEXT DEFAULT 'google/gemini-3-pro-preview';

-- Ensure other columns exist (just in case)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wizard_mode TEXT DEFAULT 'iterative';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 50;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_usage INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';

-- Fix Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,
  content TEXT,
  is_business_context BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for documents if not already enabled
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policies for documents (using DO block to avoid errors if they exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users can view their own documents'
    ) THEN
        CREATE POLICY "Users can view their own documents" ON documents FOR SELECT USING ((select auth.uid()) = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users can insert their own documents'
    ) THEN
        CREATE POLICY "Users can insert their own documents" ON documents FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users can delete their own documents'
    ) THEN
        CREATE POLICY "Users can delete their own documents" ON documents FOR DELETE USING ((select auth.uid()) = user_id);
    END IF;
END
$$;

-- Fix Packs Table (just in case)
CREATE TABLE IF NOT EXISTS packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  niche TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  total_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE packs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'packs' AND policyname = 'Users can view their own packs'
    ) THEN
        CREATE POLICY "Users can view their own packs" ON packs FOR SELECT USING ((select auth.uid()) = user_id);
    END IF;
END
$$;
