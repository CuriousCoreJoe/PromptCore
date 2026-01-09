-- Add default_model column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_model TEXT DEFAULT 'gemini-3-pro';

-- Update existing profiles to use the new default
UPDATE profiles SET default_model = 'gemini-3-pro' WHERE default_model IS NULL;
