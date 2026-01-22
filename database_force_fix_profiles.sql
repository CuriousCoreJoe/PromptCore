-- FORCE FIX PROFILES
-- This script attempts to fix the profiles table by ensuring the default_model column is correct.

-- 1. Drop the column if it exists (to reset any weird types/constraints)
ALTER TABLE profiles DROP COLUMN IF EXISTS default_model;

-- 2. Re-add the column as TEXT
ALTER TABLE profiles ADD COLUMN default_model TEXT DEFAULT 'google/gemini-3-pro-preview';

-- 3. Update existing rows
UPDATE profiles SET default_model = 'z-ai/glm-4.6' WHERE default_model IS NULL;

-- 4. Reload Schema Cache (Supabase specific)
NOTIFY pgrst, 'reload config';
