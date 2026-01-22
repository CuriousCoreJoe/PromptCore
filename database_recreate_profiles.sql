-- NUCLEAR OPTION: RECREATE PROFILES TABLE
-- WARNING: This will reset profile data (credits, settings) to defaults if the backup fails.
-- Use this only if the 406 error persists and you don't care about losing credit history.

BEGIN;

-- 1. Backup existing data (best effort)
CREATE TEMP TABLE profiles_backup AS SELECT * FROM profiles;

-- 2. Drop the table
DROP TABLE profiles CASCADE;

-- 3. Recreate the table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 100,
  last_daily_bonus TIMESTAMPTZ DEFAULT NOW(),
  lifetime_prompts INTEGER DEFAULT 0,
  wizard_mode TEXT DEFAULT 'iterative',
  default_model TEXT DEFAULT 'z-ai/glm-4.6',
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'free',
  monthly_usage INTEGER DEFAULT 0,
  last_usage_reset TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Add tracking columns for premium modes
  vibe_code_uses_monthly INTEGER DEFAULT 0,
  talk_to_source_uses_monthly INTEGER DEFAULT 0,
  media_gen_uses_monthly INTEGER DEFAULT 0
);

-- 4. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- 6. Restore data (mapping columns explicitly to avoid issues)
-- We use INSERT INTO ... SELECT ... ON CONFLICT DO NOTHING
INSERT INTO profiles (id, full_name, avatar_url, credits, wizard_mode, default_model, subscription_status)
SELECT id, full_name, avatar_url, credits, wizard_mode, 'z-ai/glm-4.6', subscription_status
FROM profiles_backup
ON CONFLICT (id) DO NOTHING;

-- 7. Reload Config
NOTIFY pgrst, 'reload config';

COMMIT;
