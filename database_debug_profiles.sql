-- DEBUG PROFILES TABLE
-- This script attempts to fix access issues by resetting permissions and RLS.

-- 1. Grant permissions to authenticated users
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- 2. Disable RLS temporarily to see if that's the blocker
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 3. Ensure the table exists and has the right columns (redundant but safe)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 100,
  wizard_mode TEXT DEFAULT 'iterative',
  default_model TEXT DEFAULT 'z-ai/glm-4.6',
  subscription_status TEXT DEFAULT 'free',
  monthly_usage INTEGER DEFAULT 0,
  last_usage_reset TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload config';
